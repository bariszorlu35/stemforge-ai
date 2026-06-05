import os
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Paths
    UPLOAD_DIR: str = "./storage/uploads"
    OUTPUT_DIR: str = "./storage/outputs"
    MAX_FILE_SIZE_MB: int = 100

    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    # Demucs model
    MAIN_MODEL: str = "htdemucs_6s"   # 6-stem: vocals, drums, bass, guitar, piano, other
    DEVICE: str = "cpu"               # "cuda" if GPU available

    # Job TTL (seconds) - files deleted after this
    JOB_TTL: int = 3600 * 6  # 6 hours

    class Config:
        env_file = ".env"


settings = Settings()

# Ensure directories exist
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
