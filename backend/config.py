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

# File uploads configuration
UPLOADS_DIR = DATA_DIR / "uploads"
MAX_FILES_PER_MESSAGE = 15
MAX_FILE_SIZE_MB = 5
MAX_TOTAL_SIZE_MB = 25
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
MAX_TOTAL_SIZE_BYTES = MAX_TOTAL_SIZE_MB * 1024 * 1024

# Allowed file extensions and MIME types
ALLOWED_EXTENSIONS = {
    # Documents
    ".pdf", ".docx", ".doc", ".xlsx", ".xls", ".pptx", ".ppt",
    # Text/Code
    ".txt", ".md", ".json", ".xml", ".csv", ".yaml", ".yml",
    ".py", ".js", ".ts", ".jsx", ".tsx", ".html", ".css", ".scss",
    ".java", ".c", ".cpp", ".h", ".hpp", ".cs", ".go", ".rs", ".rb",
    ".php", ".sql", ".sh", ".bash", ".zsh", ".ps1",
    # Config
    ".ini", ".cfg", ".conf", ".env", ".toml",
}

# Max characters to extract from each file for context
MAX_CHARS_PER_FILE = 10000
MAX_TOTAL_CONTEXT_CHARS = 50000

# Ensure data directory exists
DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

