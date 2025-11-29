"""
OpenRouter API client with async support and structured output.
"""
import json
import asyncio
from typing import AsyncGenerator, Optional, Type
import httpx
from pydantic import BaseModel

from .config import OPENROUTER_API_KEY, OPENROUTER_BASE_URL


class OpenRouterClient:
    """Async client for OpenRouter API."""

    def __init__(self):
        self.api_key = OPENROUTER_API_KEY
        self.base_url = OPENROUTER_BASE_URL
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "LLM Council"
        }

    async def chat_completion(
        self,
        model: str,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2048,
        response_format: Optional[Type[BaseModel]] = None,
    ) -> str:
        """
        Send a chat completion request to OpenRouter.
        
        Args:
            model: Model ID (e.g., "openai/gpt-4.1")
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature
            max_tokens: Maximum tokens in response
            response_format: Optional Pydantic model for structured output
            
        Returns:
            Response content as string
        """
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        # Add JSON schema for structured output if provided
        if response_format is not None:
            payload["response_format"] = {
                "type": "json_schema",
                "json_schema": {
                    "name": response_format.__name__,
                    "strict": True,
                    "schema": response_format.model_json_schema()
                }
            }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    async def chat_completion_stream(
        self,
        model: str,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncGenerator[str, None]:
        """
        Stream a chat completion response.
        
        Args:
            model: Model ID
            messages: List of message dicts
            temperature: Sampling temperature
            max_tokens: Maximum tokens
            
        Yields:
            Response chunks as strings
        """
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            if "choices" in chunk and chunk["choices"]:
                                delta = chunk["choices"][0].get("delta", {})
                                if "content" in delta:
                                    yield delta["content"]
                        except json.JSONDecodeError:
                            continue

    async def parallel_completions(
        self,
        requests: list[dict],
    ) -> list[str]:
        """
        Execute multiple chat completions in parallel.
        
        Args:
            requests: List of request dicts, each containing:
                - model: str
                - messages: list[dict]
                - temperature: float (optional)
                - max_tokens: int (optional)
                - response_format: Type[BaseModel] (optional)
                
        Returns:
            List of response strings in the same order as requests
        """
        tasks = [
            self.chat_completion(
                model=req["model"],
                messages=req["messages"],
                temperature=req.get("temperature", 0.7),
                max_tokens=req.get("max_tokens", 2048),
                response_format=req.get("response_format"),
            )
            for req in requests
        ]
        return await asyncio.gather(*tasks, return_exceptions=True)


# Global client instance
client = OpenRouterClient()

