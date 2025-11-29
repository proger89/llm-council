"""
FastAPI application for LLM Council.
"""
import json
import asyncio
from datetime import datetime
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from .config import COUNCIL_MODELS, CHAIRMAN_MODEL
from .database import init_db, get_session, async_session, Chat, Message
from .schemas import (
    ChatCreate,
    ChatResponse,
    ChatDetailResponse,
    MessageCreate,
    MessageResponse,
    MessageRole,
    StageType,
    StageProgressEvent,
)
from .council import orchestrator


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    await init_db()
    yield


app = FastAPI(
    title="LLM Council API",
    description="Multi-model discussion API for reaching consensus",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


# Models info
@app.get("/api/models")
async def get_models():
    """Get available council models."""
    return {
        "models": COUNCIL_MODELS,
        "chairman": CHAIRMAN_MODEL
    }


# Chat endpoints
@app.post("/api/chats", response_model=ChatResponse)
async def create_chat(
    chat_data: ChatCreate,
    session: AsyncSession = Depends(get_session)
):
    """Create a new chat."""
    chat = Chat(
        title=chat_data.title or "New Chat"
    )
    session.add(chat)
    await session.commit()
    await session.refresh(chat)
    return chat


@app.get("/api/chats", response_model=list[ChatResponse])
async def list_chats(
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session)
):
    """List all chats, ordered by most recent."""
    result = await session.execute(
        select(Chat)
        .order_by(desc(Chat.updated_at))
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()


@app.get("/api/chats/{chat_id}", response_model=ChatDetailResponse)
async def get_chat(
    chat_id: str,
    session: AsyncSession = Depends(get_session)
):
    """Get a chat with all messages."""
    result = await session.execute(
        select(Chat).where(Chat.id == chat_id)
    )
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Get messages
    msg_result = await session.execute(
        select(Message)
        .where(Message.chat_id == chat_id)
        .order_by(Message.created_at)
    )
    messages = msg_result.scalars().all()

    # Convert to response format
    msg_responses = []
    for msg in messages:
        msg_resp = MessageResponse(
            id=msg.id,
            chat_id=msg.chat_id,
            role=msg.role,
            content=msg.content,
            created_at=msg.created_at,
        )
        if msg.discussion_data:
            data = msg.discussion_data
            msg_resp.stage = StageType.CONSENSUS
            msg_resp.initial_responses = data.get("initial_responses")
            msg_resp.discussion_rounds = data.get("discussion_rounds")
            if "consensus" in data:
                from .schemas import ConsensusResponse
                msg_resp.consensus = ConsensusResponse(**data["consensus"])
        msg_responses.append(msg_resp)

    return ChatDetailResponse(
        id=chat.id,
        title=chat.title,
        created_at=chat.created_at,
        updated_at=chat.updated_at,
        messages=msg_responses
    )


@app.delete("/api/chats/{chat_id}")
async def delete_chat(
    chat_id: str,
    session: AsyncSession = Depends(get_session)
):
    """Delete a chat and all its messages."""
    result = await session.execute(
        select(Chat).where(Chat.id == chat_id)
    )
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    await session.delete(chat)
    await session.commit()
    return {"status": "deleted", "chat_id": chat_id}


@app.patch("/api/chats/{chat_id}")
async def update_chat(
    chat_id: str,
    chat_data: ChatCreate,
    session: AsyncSession = Depends(get_session)
):
    """Update chat title."""
    result = await session.execute(
        select(Chat).where(Chat.id == chat_id)
    )
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    if chat_data.title:
        chat.title = chat_data.title
    chat.updated_at = datetime.utcnow()
    await session.commit()
    await session.refresh(chat)
    return ChatResponse(
        id=chat.id,
        title=chat.title,
        created_at=chat.created_at,
        updated_at=chat.updated_at
    )


# Message/Council endpoints
@app.post("/api/chats/{chat_id}/messages/stream")
async def send_message_stream(
    chat_id: str,
    message_data: MessageCreate,
    session: AsyncSession = Depends(get_session)
):
    """
    Send a message and stream the council discussion response.
    Returns Server-Sent Events (SSE).
    """
    # Verify chat exists
    result = await session.execute(
        select(Chat).where(Chat.id == chat_id)
    )
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Save user message
    user_message = Message(
        chat_id=chat_id,
        role=MessageRole.USER,
        content=message_data.content
    )
    session.add(user_message)
    await session.commit()

    # Update chat title if it's the first message
    if chat.title in ("New Chat", "Новый чат"):
        # Use first 50 chars of message as title
        chat.title = message_data.content[:50] + ("..." if len(message_data.content) > 50 else "")
        await session.commit()

    # Load chat history for context (last 10 messages)
    history_result = await session.execute(
        select(Message)
        .where(Message.chat_id == chat_id)
        .where(Message.id != user_message.id)  # Exclude just-added message
        .order_by(Message.created_at.desc())
        .limit(10)
    )
    previous_messages = list(reversed(history_result.scalars().all()))
    chat_history = [{"role": m.role.value, "content": m.content} for m in previous_messages]

    async def event_generator():
        """Generate SSE events for the council discussion."""
        progress_events = []

        async def on_progress(event: StageProgressEvent):
            progress_events.append(event)
            yield f"data: {json.dumps({'type': 'progress', 'data': event.model_dump()})}\n\n"

        # Create a queue for progress events
        progress_queue = asyncio.Queue()

        async def progress_callback(event: StageProgressEvent):
            await progress_queue.put(event)

        # Start council discussion
        try:
            # Run council in background task with chat history
            council_task = asyncio.create_task(
                orchestrator.run_full_council(message_data.content, chat_history, progress_callback)
            )

            # Stream progress events
            while not council_task.done():
                try:
                    event = await asyncio.wait_for(progress_queue.get(), timeout=0.5)
                    yield f"data: {json.dumps({'type': 'progress', 'data': event.model_dump()})}\n\n"
                except asyncio.TimeoutError:
                    continue

            # Get final result
            result = await council_task

            # Drain remaining progress events
            while not progress_queue.empty():
                event = await progress_queue.get()
                yield f"data: {json.dumps({'type': 'progress', 'data': event.model_dump()})}\n\n"

            # Send initial responses
            yield f"data: {json.dumps({'type': 'initial_responses', 'data': [r.model_dump() for r in result['initial_responses']]})}\n\n"

            # Send discussion rounds
            for round_data in result['discussion_rounds']:
                yield f"data: {json.dumps({'type': 'discussion_round', 'data': round_data.model_dump()})}\n\n"

            # Send consensus
            yield f"data: {json.dumps({'type': 'consensus', 'data': result['consensus'].model_dump()})}\n\n"

            # Save assistant message
            async with async_session() as new_session:
                assistant_message = Message(
                    chat_id=chat_id,
                    role=MessageRole.ASSISTANT,
                    content=result['consensus'].final_answer,
                    discussion_data={
                        "initial_responses": [r.model_dump() for r in result['initial_responses']],
                        "discussion_rounds": [r.model_dump() for r in result['discussion_rounds']],
                        "consensus": result['consensus'].model_dump()
                    }
                )
                new_session.add(assistant_message)
                
                # Update chat timestamp
                chat_result = await new_session.execute(
                    select(Chat).where(Chat.id == chat_id)
                )
                chat_obj = chat_result.scalar_one()
                chat_obj.updated_at = datetime.utcnow()
                await new_session.commit()

                yield f"data: {json.dumps({'type': 'done', 'data': {'message_id': assistant_message.id}})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'data': {'message': str(e)}})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.post("/api/chats/{chat_id}/messages", response_model=MessageResponse)
async def send_message(
    chat_id: str,
    message_data: MessageCreate,
    session: AsyncSession = Depends(get_session)
):
    """
    Send a message and get the council discussion response (non-streaming).
    """
    # Verify chat exists
    result = await session.execute(
        select(Chat).where(Chat.id == chat_id)
    )
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Save user message
    user_message = Message(
        chat_id=chat_id,
        role=MessageRole.USER,
        content=message_data.content
    )
    session.add(user_message)
    await session.commit()

    # Update chat title if it's the first message
    if chat.title == "New Chat":
        chat.title = message_data.content[:50] + ("..." if len(message_data.content) > 50 else "")
        await session.commit()

    # Run council discussion
    council_result = await orchestrator.run_full_council(message_data.content)

    # Save assistant message
    assistant_message = Message(
        chat_id=chat_id,
        role=MessageRole.ASSISTANT,
        content=council_result['consensus'].final_answer,
        discussion_data={
            "initial_responses": [r.model_dump() for r in council_result['initial_responses']],
            "discussion_rounds": [r.model_dump() for r in council_result['discussion_rounds']],
            "consensus": council_result['consensus'].model_dump()
        }
    )
    session.add(assistant_message)
    chat.updated_at = datetime.utcnow()
    await session.commit()
    await session.refresh(assistant_message)

    return MessageResponse(
        id=assistant_message.id,
        chat_id=assistant_message.chat_id,
        role=assistant_message.role,
        content=assistant_message.content,
        created_at=assistant_message.created_at,
        stage=StageType.CONSENSUS,
        initial_responses=council_result['initial_responses'],
        discussion_rounds=council_result['discussion_rounds'],
        consensus=council_result['consensus']
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

