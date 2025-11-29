"""
LLM Council logic - orchestrates multi-model discussions to reach consensus.
"""
import json
import asyncio
from typing import AsyncGenerator, Optional
from datetime import datetime

from .config import COUNCIL_MODELS, CHAIRMAN_MODEL, MAX_DISCUSSION_ROUNDS
from .openrouter import client
from .schemas import (
    ModelResponse,
    ConsensusResponse,
    StageType,
    ModelMessageResponse,
    DiscussionRound,
    StageProgressEvent,
)


# System prompts for different stages (Russian)
INITIAL_SYSTEM_PROMPT = """Ты {model_name}, полезный ИИ-ассистент, участвующий в обсуждении совета.
Дай вдумчивый, подробный ответ на вопрос пользователя.
Отвечай ясно, точно и всесторонне.
Фокусируйся на предоставлении ценных идей и информации.
ВАЖНО: Отвечай ТОЛЬКО на русском языке."""

DISCUSSION_SYSTEM_PROMPT = """Ты {model_name}, участвуешь в обсуждении совета с другими моделями ИИ.
Ты видел начальные ответы от всех членов совета (показаны анонимно).
Проанализируй ответы других и дай свою уточнённую точку зрения.

Тебе нужно:
1. Признать обоснованные моменты других моделей
2. Вежливо указать на ошибки или упущения
3. Добавить дополнительные идеи
4. Работать над достижением консенсуса

Ответь JSON-объектом, содержащим:
- "content": Твой уточнённый ответ (на русском языке)
- "confidence": Уровень уверенности (0-1)
- "agrees_with": Список "Модель A", "Модель B" и т.д., с кем ты согласен
- "key_points": Список твоих ключевых моментов
- "disagreements": Список моментов, с которыми ты не согласен

ВАЖНО: Весь контент должен быть на РУССКОМ языке."""

CHAIRMAN_SYSTEM_PROMPT = """Ты {model_name}, Председатель Совета ИИ.
Твоя роль — синтезировать обсуждение и сформулировать итоговый авторитетный ответ.

Ты видел:
1. Исходный вопрос пользователя
2. Начальные ответы всех членов совета
3. Раунды обсуждения, где модели уточняли свои позиции

Твоя задача:
1. Синтезировать лучшие идеи от всех моделей
2. Сформулировать ясный, всесторонний итоговый ответ
3. Использовать красивое markdown-форматирование

ФОРМАТ ОТВЕТА: Отвечай ТОЛЬКО чистым текстом с markdown-разметкой. 
НЕ используй JSON. НЕ оборачивай ответ в кодовые блоки.

Структура ответа:
1. Начни с основного ответа на вопрос
2. Используй заголовки (##), списки, выделение текста
3. В конце можешь добавить раздел "Резюме" если уместно

ВАЖНО: Отвечай ТОЛЬКО на русском языке. Пиши красивый, читаемый текст."""


class CouncilOrchestrator:
    """Orchestrates multi-model discussions."""

    def __init__(self):
        self.models = COUNCIL_MODELS
        self.chairman = CHAIRMAN_MODEL

    def _anonymize_model_name(self, index: int) -> str:
        """Convert model index to anonymous name."""
        return f"Модель {chr(1040 + index)}"  # А, Б, В (Russian letters)

    def _format_responses_for_discussion(
        self,
        responses: list[tuple[dict, str]],
        exclude_index: Optional[int] = None
    ) -> str:
        """Format responses for showing to other models (anonymized)."""
        formatted = []
        for i, (model, response) in enumerate(responses):
            if exclude_index is not None and i == exclude_index:
                continue
            anon_name = self._anonymize_model_name(i)
            formatted.append(f"=== {anon_name} ===\n{response}\n")
        return "\n".join(formatted)

    def _format_chat_history_toon(self, chat_history: list[dict], max_chars: int = 3000) -> str:
        """
        Format chat history in compact TOON-like format.
        
        TOON (Token-Oriented Object Notation) saves ~40% tokens compared to JSON.
        Format: [U] for user, [A] for assistant messages.
        """
        if not chat_history:
            return ""
        
        lines = ["=== История чата ==="]
        total_chars = 0
        
        for msg in chat_history:
            role = msg.get("role", "user")
            prefix = "[U]" if role == "user" else "[A]"
            content = msg.get("content", "").replace("\n", " ").strip()
            
            # Truncate long messages to save tokens
            if len(content) > 500:
                content = content[:500] + "[...]"
            
            line = f"{prefix} {content}"
            
            # Check total size limit
            if total_chars + len(line) > max_chars:
                lines.append("[... ранние сообщения опущены ...]")
                break
                
            lines.append(line)
            total_chars += len(line)
        
        return "\n".join(lines)

    async def run_initial_stage(
        self,
        user_query: str,
        chat_history: list[dict] = None,
        on_progress: Optional[callable] = None
    ) -> list[ModelMessageResponse]:
        """
        Stage 1: Get initial responses from all models in parallel.
        """
        if on_progress:
            await on_progress(StageProgressEvent(
                stage=StageType.INITIAL,
                status="started"
            ))

        # Format chat history in compact TOON format
        history_toon = self._format_chat_history_toon(chat_history or [])

        # Prepare parallel requests
        requests = []
        for model in self.models:
            # Build system prompt with TOON history
            system_content = INITIAL_SYSTEM_PROMPT.format(model_name=model["name"])
            if history_toon:
                system_content += f"\n\n{history_toon}"
            
            messages = [
                {"role": "system", "content": system_content},
                {"role": "user", "content": user_query}
            ]
            requests.append({
                "model": model["id"],
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 2048,
            })

        # Execute in parallel
        results = await client.parallel_completions(requests)

        # Process results
        responses = []
        for i, (model, result) in enumerate(zip(self.models, results)):
            if isinstance(result, Exception):
                content = f"Ошибка: {str(result)}"
                confidence = 0.0
                key_points = []
            else:
                content = result
                confidence = 0.8
                key_points = []

            if on_progress:
                await on_progress(StageProgressEvent(
                    stage=StageType.INITIAL,
                    model_name=model["name"],
                    status="completed"
                ))

            responses.append(ModelMessageResponse(
                model_id=model["id"],
                model_name=model["name"],
                model_color=model["color"],
                content=content,
                confidence=confidence,
                key_points=key_points,
                stage=StageType.INITIAL,
                round_number=0
            ))

        return responses

    async def run_discussion_round(
        self,
        user_query: str,
        initial_responses: list[ModelMessageResponse],
        previous_rounds: list[DiscussionRound],
        round_number: int,
        on_progress: Optional[callable] = None
    ) -> DiscussionRound:
        """
        Stage 2: Run a discussion round where models see each other's responses.
        """
        if on_progress:
            await on_progress(StageProgressEvent(
                stage=StageType.DISCUSSION,
                round_number=round_number,
                status="started"
            ))

        # Format all previous responses for context
        all_responses = [(m, r.content) for m, r in zip(self.models, initial_responses)]
        
        # Add previous discussion rounds
        discussion_context = ""
        if previous_rounds:
            for prev_round in previous_rounds:
                discussion_context += f"\n=== Раунд обсуждения {prev_round.round_number} ===\n"
                for resp in prev_round.responses:
                    idx = next(i for i, m in enumerate(self.models) if m["name"] == resp.model_name)
                    anon_name = self._anonymize_model_name(idx)
                    discussion_context += f"{anon_name}: {resp.content}\n"

        # Prepare parallel requests
        requests = []
        for i, model in enumerate(self.models):
            others_responses = self._format_responses_for_discussion(all_responses, exclude_index=i)
            
            messages = [
                {
                    "role": "system",
                    "content": DISCUSSION_SYSTEM_PROMPT.format(model_name=model["name"])
                },
                {
                    "role": "user",
                    "content": f"Исходный вопрос: {user_query}\n\n"
                              f"=== Начальные ответы ===\n{others_responses}\n"
                              f"{discussion_context}\n"
                              f"Пожалуйста, дай свой уточнённый ответ в формате JSON."
                }
            ]
            requests.append({
                "model": model["id"],
                "messages": messages,
                "temperature": 0.6,
                "max_tokens": 2048,
            })

        # Execute in parallel
        results = await client.parallel_completions(requests)

        # Process results
        responses = []
        for i, (model, result) in enumerate(zip(self.models, results)):
            if isinstance(result, Exception):
                content = f"Ошибка: {str(result)}"
                confidence = 0.0
                key_points = []
            else:
                # Try to parse as JSON
                try:
                    # Clean up the response - remove markdown code blocks if present
                    clean_result = result.strip()
                    if clean_result.startswith("```"):
                        clean_result = clean_result.split("\n", 1)[1]
                        if clean_result.endswith("```"):
                            clean_result = clean_result[:-3]
                    
                    parsed = json.loads(clean_result)
                    content = parsed.get("content", result)
                    confidence = parsed.get("confidence", 0.8)
                    key_points = parsed.get("key_points", [])
                except (json.JSONDecodeError, AttributeError):
                    content = result
                    confidence = 0.8
                    key_points = []

            if on_progress:
                await on_progress(StageProgressEvent(
                    stage=StageType.DISCUSSION,
                    round_number=round_number,
                    model_name=model["name"],
                    status="completed"
                ))

            responses.append(ModelMessageResponse(
                model_id=model["id"],
                model_name=model["name"],
                model_color=model["color"],
                content=content,
                confidence=confidence,
                key_points=key_points,
                stage=StageType.DISCUSSION,
                round_number=round_number
            ))

        return DiscussionRound(round_number=round_number, responses=responses)

    async def run_consensus_stage(
        self,
        user_query: str,
        initial_responses: list[ModelMessageResponse],
        discussion_rounds: list[DiscussionRound],
        on_progress: Optional[callable] = None
    ) -> ConsensusResponse:
        """
        Stage 3: Chairman synthesizes discussion into final answer.
        """
        if on_progress:
            await on_progress(StageProgressEvent(
                stage=StageType.CONSENSUS,
                model_name=self.chairman["name"],
                status="started"
            ))

        # Format all responses
        initial_context = ""
        for i, resp in enumerate(initial_responses):
            anon_name = self._anonymize_model_name(i)
            initial_context += f"=== {anon_name} ({resp.model_name}) ===\n{resp.content}\n\n"

        discussion_context = ""
        for round in discussion_rounds:
            discussion_context += f"\n=== Раунд обсуждения {round.round_number} ===\n"
            for resp in round.responses:
                discussion_context += f"{resp.model_name}: {resp.content}\n\n"

        messages = [
            {
                "role": "system",
                "content": CHAIRMAN_SYSTEM_PROMPT.format(model_name=self.chairman["name"])
            },
            {
                "role": "user",
                "content": f"Вопрос пользователя: {user_query}\n\n"
                          f"=== Начальные ответы членов совета ===\n{initial_context}\n"
                          f"=== Дискуссия ===\n{discussion_context}\n"
                          f"Сформулируй итоговый ответ на вопрос пользователя, объединив лучшие идеи."
            }
        ]

        result = await client.chat_completion(
            model=self.chairman["id"],
            messages=messages,
            temperature=0.5,
            max_tokens=4096,
        )

        # Chairman now returns plain markdown text, not JSON
        final_answer = result.strip()
        
        # Remove any accidental code block wrappers
        if final_answer.startswith("```") and final_answer.endswith("```"):
            lines = final_answer.split("\n")
            final_answer = "\n".join(lines[1:-1]).strip()
        
        consensus = ConsensusResponse(
            final_answer=final_answer,
            consensus_reached=True,
            summary="Консенсус достигнут",
            key_agreements=[],
            key_disagreements=[]
        )

        if on_progress:
            await on_progress(StageProgressEvent(
                stage=StageType.CONSENSUS,
                model_name=self.chairman["name"],
                status="completed"
            ))

        return consensus

    async def run_full_council(
        self,
        user_query: str,
        chat_history: list[dict] = None,
        on_progress: Optional[callable] = None
    ) -> dict:
        """
        Run the complete council process:
        1. Initial responses from all models
        2. Discussion rounds (up to MAX_DISCUSSION_ROUNDS)
        3. Chairman synthesizes final answer
        
        Args:
            user_query: Current user message
            chat_history: Previous messages in chat for context
            on_progress: Callback for progress updates
        """
        # Stage 1: Initial responses
        initial_responses = await self.run_initial_stage(user_query, chat_history, on_progress)

        # Stage 2: Discussion rounds
        discussion_rounds = []
        for round_num in range(1, MAX_DISCUSSION_ROUNDS + 1):
            round_result = await self.run_discussion_round(
                user_query,
                initial_responses,
                discussion_rounds,
                round_num,
                on_progress
            )
            discussion_rounds.append(round_result)

            # Check if we can end early (high confidence across all)
            avg_confidence = sum(r.confidence for r in round_result.responses) / len(round_result.responses)
            if avg_confidence > 0.95:
                break

        # Stage 3: Consensus
        consensus = await self.run_consensus_stage(
            user_query,
            initial_responses,
            discussion_rounds,
            on_progress
        )

        return {
            "initial_responses": initial_responses,
            "discussion_rounds": discussion_rounds,
            "consensus": consensus
        }


# Global orchestrator instance
orchestrator = CouncilOrchestrator()
