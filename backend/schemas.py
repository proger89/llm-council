"""
Pydantic schemas for request/response validation and structured LLM output.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum


class StageType(str, Enum):
    INITIAL = "initial"
    DISCUSSION = "discussion"
    CONSENSUS = "consensus"


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


# Structured output schemas for LLM responses
class ModelResponse(BaseModel):
    """Structured response from an LLM model during discussion."""
    content: str = Field(..., description="The main response content")
    confidence: float = Field(
        default=0.8,
        ge=0.0,
        le=1.0,
        description="Confidence level in the response (0-1)"
    )
    agrees_with: list[str] = Field(
        default_factory=list,
        description="List of model names this response agrees with"
    )
    key_points: list[str] = Field(
        default_factory=list,
        description="Key points extracted from the response"
    )
    disagreements: list[str] = Field(
        default_factory=list,
        description="Points of disagreement with other models"
    )


class ConsensusResponse(BaseModel):
    """Chairman's consensus response."""
    final_answer: str = Field(..., description="The final synthesized answer")
    consensus_reached: bool = Field(
        default=True,
        description="Whether consensus was reached"
    )
    summary: str = Field(
        default="",
        description="Summary of the discussion"
    )
    key_agreements: list[str] = Field(
        default_factory=list,
        description="Points all models agreed on"
    )
    key_disagreements: list[str] = Field(
        default_factory=list,
        description="Points where models disagreed"
    )


# API Request/Response schemas
class ChatCreate(BaseModel):
    """Request to create a new chat."""
    title: Optional[str] = None


class ChatResponse(BaseModel):
    """Chat response."""
    id: str
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    """Request to send a message."""
    content: str


class AttachmentResponse(BaseModel):
    """Attachment response."""
    id: str
    filename: str
    mime_type: str
    size: str
    
    class Config:
        from_attributes = True


class ModelMessageResponse(BaseModel):
    """Individual model's response in a discussion."""
    model_id: str
    model_name: str
    model_color: str
    content: str
    confidence: float
    key_points: list[str]
    stage: StageType
    round_number: int


class DiscussionRound(BaseModel):
    """A single round of discussion."""
    round_number: int
    responses: list[ModelMessageResponse]


class MessageResponse(BaseModel):
    """Full message response including discussion details."""
    id: str
    chat_id: str
    role: MessageRole
    content: str
    created_at: datetime
    
    # Attachments
    attachments: list[AttachmentResponse] = Field(default_factory=list)
    
    # Discussion metadata (only for assistant messages)
    stage: Optional[StageType] = None
    initial_responses: Optional[list[ModelMessageResponse]] = None
    discussion_rounds: Optional[list[DiscussionRound]] = None
    consensus: Optional[ConsensusResponse] = None

    class Config:
        from_attributes = True


class ChatDetailResponse(BaseModel):
    """Detailed chat response with messages."""
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[MessageResponse]

    class Config:
        from_attributes = True


# SSE Event schemas
class SSEEvent(BaseModel):
    """Server-Sent Event data."""
    event: str
    data: dict


class StageProgressEvent(BaseModel):
    """Progress event for stage transitions."""
    stage: StageType
    round_number: Optional[int] = None
    model_name: Optional[str] = None
    status: str  # "started", "completed", "error"


class StreamChunkEvent(BaseModel):
    """Streaming chunk event."""
    model_name: str
    chunk: str
    is_final: bool = False

