"""
Schema validation tests.
"""
import pytest
from pydantic import ValidationError

from backend.schemas import (
    ModelResponse,
    ConsensusResponse,
    ChatCreate,
    MessageCreate,
    StageType,
    MessageRole,
)


def test_model_response_valid():
    """Test valid ModelResponse creation."""
    response = ModelResponse(
        content="This is a test response",
        confidence=0.85,
        agrees_with=["Model A", "Model B"],
        key_points=["Point 1", "Point 2"],
        disagreements=[]
    )
    assert response.content == "This is a test response"
    assert response.confidence == 0.85
    assert len(response.agrees_with) == 2


def test_model_response_defaults():
    """Test ModelResponse with default values."""
    response = ModelResponse(content="Test")
    assert response.confidence == 0.8
    assert response.agrees_with == []
    assert response.key_points == []


def test_model_response_confidence_bounds():
    """Test confidence must be between 0 and 1."""
    # Valid boundaries
    ModelResponse(content="Test", confidence=0.0)
    ModelResponse(content="Test", confidence=1.0)
    
    # Invalid: too high
    with pytest.raises(ValidationError):
        ModelResponse(content="Test", confidence=1.5)
    
    # Invalid: too low
    with pytest.raises(ValidationError):
        ModelResponse(content="Test", confidence=-0.1)


def test_consensus_response_valid():
    """Test valid ConsensusResponse creation."""
    response = ConsensusResponse(
        final_answer="The consensus answer",
        consensus_reached=True,
        summary="All models agreed",
        key_agreements=["Point 1"],
        key_disagreements=[]
    )
    assert response.final_answer == "The consensus answer"
    assert response.consensus_reached is True


def test_chat_create():
    """Test ChatCreate schema."""
    # With title
    chat = ChatCreate(title="My Chat")
    assert chat.title == "My Chat"
    
    # Without title
    chat = ChatCreate()
    assert chat.title is None


def test_message_create():
    """Test MessageCreate schema."""
    message = MessageCreate(content="Hello, council!")
    assert message.content == "Hello, council!"


def test_stage_type_enum():
    """Test StageType enum values."""
    assert StageType.INITIAL.value == "initial"
    assert StageType.DISCUSSION.value == "discussion"
    assert StageType.CONSENSUS.value == "consensus"


def test_message_role_enum():
    """Test MessageRole enum values."""
    assert MessageRole.USER.value == "user"
    assert MessageRole.ASSISTANT.value == "assistant"
    assert MessageRole.SYSTEM.value == "system"

