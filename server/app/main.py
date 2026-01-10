from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import socketio

from app.api.routes import admin, auth, health, profile, wallet
from app.core.config import settings
from app.realtime.server import sio

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
fastapi_app.include_router(admin.router, prefix=f"{settings.api_prefix}/admin", tags=["admin"])


@fastapi_app.on_event("startup")
def ensure_upload_paths() -> None:
    settings.avatar_upload_path.mkdir(parents=True, exist_ok=True)


fastapi_app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)
