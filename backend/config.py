"""
Configuration for LLM Council application.
"""
import os
from pathlib import Path

# API Configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# Model Configuration
COUNCIL_MODELS = [
    {
        "id": "openai/gpt-5.1",
        "name": "GPT-5.1",
        "role": "chairman",  # Chairman synthesizes final answer
        "color": "#10a37f"  # OpenAI green
    },
    {
        "id": "google/gemini-3-pro-preview",
        "name": "Gemini 3 Pro",
        "role": "participant", 
        "color": "#4285f4"  # Google blue
    },
]

# Get chairman model
CHAIRMAN_MODEL = next(m for m in COUNCIL_MODELS if m["role"] == "chairman")

# Discussion settings
MAX_DISCUSSION_ROUNDS = 3
CONSENSUS_TIMEOUT_SECONDS = 120

# Database
DATA_DIR = Path(os.getenv("DATA_DIR", "./data"))
DATABASE_URL = f"sqlite+aiosqlite:///{DATA_DIR}/council.db"

# Ensure data directory exists
DATA_DIR.mkdir(parents=True, exist_ok=True)

