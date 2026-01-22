from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import socketio

from app.api.routes import admin, auth, health, profile, wallet, webhooks
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
fastapi_app.include_router(webhooks.router, tags=["webhooks"])


@fastapi_app.on_event("startup")
def ensure_upload_paths() -> None:
    settings.avatar_upload_path.mkdir(parents=True, exist_ok=True)


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
