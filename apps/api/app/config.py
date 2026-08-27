from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    gemini_api_key: str
    search_api_key: str = ""
    tavily_api_key: str = ""
    parallel_api_key: str = ""
    cors_origins: str = "http://localhost:5173,http://localhost:4173"
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
