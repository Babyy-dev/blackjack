import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import socketio
from sqlalchemy import select

from app.api.routes import admin, auth, health, profile, stats, wallet, webhooks, friends
from app.core.config import settings
from app.core.security import hash_password
from app.db.models import Profile, User, Wallet
from app.db.session import SessionLocal
from app.realtime.server import sio

logger = logging.getLogger(__name__)

fastapi_app = FastAPI(title=settings.app_name)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

fastapi_app.include_router(health.router)
fastapi_app.include_router(auth.router, prefix=f"{settings.api_prefix}/auth", tags=["auth"])
fastapi_app.include_router(profile.router, prefix=f"{settings.api_prefix}/profile", tags=["profile"])
fastapi_app.include_router(wallet.router, prefix=f"{settings.api_prefix}/wallet", tags=["wallet"])
fastapi_app.include_router(friends.router, prefix=f"{settings.api_prefix}/friends", tags=["friends"])
fastapi_app.include_router(admin.router, prefix=f"{settings.api_prefix}/admin", tags=["admin"])
fastapi_app.include_router(stats.router, prefix=f"{settings.api_prefix}/stats", tags=["stats"])
fastapi_app.include_router(webhooks.router, tags=["webhooks"])


@fastapi_app.on_event("startup")
def ensure_upload_paths() -> None:
    settings.avatar_upload_path.mkdir(parents=True, exist_ok=True)
    validate_security_settings()
    ensure_default_admin()


def validate_security_settings() -> None:
    issues: list[str] = []
    if not settings.jwt_secret_key or settings.jwt_secret_key == "change-me":
        issues.append("JWT secret is not set.")
    elif len(settings.jwt_secret_key) < 32:
        issues.append("JWT secret should be at least 32 characters.")
    if not settings.crypto_webhook_secret or settings.crypto_webhook_secret == "change-me":
        issues.append("Crypto webhook secret is not set.")
    if settings.environment.lower() == "production" and "*" in settings.allowed_origins:
        issues.append("Allowed origins cannot include '*' in production.")

    if not issues:
        return

    message = "Security settings warning: " + "; ".join(issues)
    if settings.environment.lower() == "production":
        raise RuntimeError(message)
    logger.warning(message)


def ensure_default_admin() -> None:
    if not settings.default_admin_email or not settings.default_admin_password:
        return

    email = settings.default_admin_email.strip().lower()
    if not email:
        return

    db = SessionLocal()
    try:
        existing = db.scalar(select(User).where(User.email == email))
        if existing:
            updated = False
            if not existing.is_admin:
                existing.is_admin = True
                updated = True
            if not existing.profile:
                display_name = settings.default_admin_display_name.strip() or "Admin"
                existing.profile = Profile(
                    display_name=display_name,
                    bio="Administrator account.",
                )
                updated = True
            if not existing.wallet and settings.default_admin_balance >= 0:
                existing.wallet = Wallet(
                    balance=settings.default_admin_balance,
                    currency="TOKEN",
                )
                updated = True
            if updated:
                db.commit()
            return

        display_name = settings.default_admin_display_name.strip() or "Admin"
        user = User(
            email=email,
            password_hash=hash_password(settings.default_admin_password),
            is_active=True,
            is_admin=True,
        )
        user.profile = Profile(display_name=display_name, bio="Administrator account.")
        if settings.default_admin_balance >= 0:
            user.wallet = Wallet(balance=settings.default_admin_balance, currency="TOKEN")
        db.add(user)
        db.commit()
        logger.info("Default admin created for %s", email)
    except Exception:
        logger.exception("Failed to ensure default admin")
    finally:
        db.close()


fastapi_app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


def resolve_frontend_dist() -> Path | None:
    if settings.frontend_dist_dir:
        candidate = Path(settings.frontend_dist_dir)
    elif settings.serve_frontend:
        candidate = Path(__file__).resolve().parents[2] / "client" / "dist"
    else:
        return None
    index_path = candidate / "index.html"
    if index_path.is_file():
        return candidate
    return None


frontend_dist = resolve_frontend_dist()
if frontend_dist:
    frontend_dist = frontend_dist.resolve()
    index_file = frontend_dist / "index.html"

    @fastapi_app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith(("api", "uploads", "socket.io")):
            raise HTTPException(status_code=404)
        candidate = (frontend_dist / full_path).resolve()
        try:
            candidate.relative_to(frontend_dist)
        except ValueError as exc:
            raise HTTPException(status_code=404) from exc
        if candidate.is_file():
            return FileResponse(candidate)
        if Path(full_path).suffix:
            raise HTTPException(status_code=404)
        return FileResponse(index_file)

app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)
