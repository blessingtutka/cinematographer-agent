from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App settings
    cors_origins: str = "http://localhost:5173,http://localhost:4173"
    log_level: str = "INFO"
    environment: str = "development"

    # Database settings
    database_url: str

    # Agent settings
    gemini_api_key: str
    search_api_key: str = ""
    tavily_api_key: str = ""
    parallel_api_key: str = ""

    # Auth settings
    jwt_secret_key: str = "insecure-dev-secret-change-me-please"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    pre_2fa_token_expire_minutes: int = 5

    totp_issuer_name: str = "YourApp"
    backup_codes_count: int = 10


@lru_cache
def get_settings() -> Settings:
    return Settings()