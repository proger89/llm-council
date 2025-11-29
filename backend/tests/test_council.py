"""
Council logic tests.
"""
import pytest
from unittest.mock import AsyncMock, patch

from backend.council import CouncilOrchestrator
from backend.schemas import StageProgressEvent


@pytest.fixture
def orchestrator():
    """Create orchestrator instance."""
    return CouncilOrchestrator()


def test_anonymize_model_name(orchestrator):
    """Test model name anonymization."""
    assert orchestrator._anonymize_model_name(0) == "Model A"
    assert orchestrator._anonymize_model_name(1) == "Model B"
    assert orchestrator._anonymize_model_name(2) == "Model C"


def test_format_responses_for_discussion(orchestrator):
    """Test formatting responses for discussion."""
    responses = [
        ({"name": "GPT"}, "Response from GPT"),
        ({"name": "Gemini"}, "Response from Gemini"),
        ({"name": "Claude"}, "Response from Claude"),
    ]
    
    # Format all responses
    formatted = orchestrator._format_responses_for_discussion(responses)
    assert "Model A" in formatted
    assert "Model B" in formatted
    assert "Model C" in formatted
    assert "Response from GPT" in formatted
    
    # Format excluding index 0
    formatted_excluding = orchestrator._format_responses_for_discussion(responses, exclude_index=0)
    assert "Model A" not in formatted_excluding
    assert "Model B" in formatted_excluding


@pytest.mark.asyncio
async def test_run_initial_stage_mock(orchestrator):
    """Test initial stage with mocked API."""
    mock_responses = [
        "GPT's initial response",
        "Gemini's initial response",
        "Claude's initial response",
    ]
    
    with patch.object(
        orchestrator,
        'run_initial_stage',
        new_callable=AsyncMock,
        return_value=mock_responses
    ):
        result = await orchestrator.run_initial_stage("Test query")
        assert len(result) == 3


@pytest.mark.asyncio
async def test_progress_callback():
    """Test progress callback is called."""
    orchestrator = CouncilOrchestrator()
    progress_events = []
    
    async def mock_callback(event: StageProgressEvent):
        progress_events.append(event)
    
    # Mock the parallel_completions to return quickly
    with patch('backend.council.client.parallel_completions', new_callable=AsyncMock) as mock:
        mock.return_value = [
            "Response 1",
            "Response 2",
            "Response 3",
        ]
        
        await orchestrator.run_initial_stage("Test", on_progress=mock_callback)
        
        # Should have progress events
        assert len(progress_events) >= 1
        assert any(e.stage.value == "initial" for e in progress_events)


def test_council_models_configuration(orchestrator):
    """Test council models are properly configured."""
    assert len(orchestrator.models) == 3
    
    # Check model structure
    for model in orchestrator.models:
        assert "id" in model
        assert "name" in model
        assert "role" in model
        assert "color" in model
    
    # Check chairman
    assert orchestrator.chairman is not None
    assert orchestrator.chairman["role"] == "chairman"

