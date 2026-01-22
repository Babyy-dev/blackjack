from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Vlackjack API"
    api_prefix: str = "/api"
    database_url: str = "postgresql+psycopg2://vlackjack:vlackjack@localhost:5432/vlackjack"
    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    allowed_origins: list[str] = ["http://localhost:5173"]
    redis_url: str = "redis://localhost:6379/0"
    upload_dir: str = "uploads"
    avatar_max_bytes: int = 2 * 1024 * 1024
    serve_frontend: bool = False
    frontend_dist_dir: str | None = None
    crypto_webhook_secret: str = "change-me"
    eth_deposit_xpub: str | None = None
    sol_deposit_mnemonic: str | None = None
    eth_usd_rate: float = 3000.0
    sol_usd_rate: float = 100.0
    crypto_min_withdrawal: int = 10
    crypto_max_withdrawal: int = 100000

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def uploads_path(self) -> Path:
        return Path(self.upload_dir)

    @property
    def avatar_upload_path(self) -> Path:
        return self.uploads_path / "avatars"


settings = Settings()
