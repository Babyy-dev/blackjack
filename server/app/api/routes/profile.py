from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user, get_db
from app.db.models import Profile, User
from app.schemas.profile import ProfilePublic, ProfileUpdate

router = APIRouter()

ALLOWED_AVATAR_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}


def ensure_profile(db: Session, user: User) -> Profile:
    if user.profile:
        return user.profile
    profile = Profile(display_name=user.email.split("@")[0])
    user.profile = profile
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("", response_model=ProfilePublic)
def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfilePublic:
    profile = ensure_profile(db, current_user)
    return ProfilePublic.model_validate(profile)


@router.put("", response_model=ProfilePublic)
def update_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfilePublic:
    profile = ensure_profile(db, current_user)
    if payload.display_name is not None:
        profile.display_name = payload.display_name
    if payload.bio is not None:
        profile.bio = payload.bio
    db.commit()
    db.refresh(profile)
    return ProfilePublic.model_validate(profile)


@router.post("/avatar", response_model=ProfilePublic)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfilePublic:
    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported avatar type",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty upload")
    if len(data) > settings.avatar_max_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Avatar too large")

    extension = ALLOWED_AVATAR_TYPES[file.content_type]
    filename = f"{uuid.uuid4().hex}{extension}"
    target_path = settings.avatar_upload_path / filename
    target_path.write_bytes(data)

    profile = ensure_profile(db, current_user)
    profile.avatar_path = f"avatars/{filename}"
    db.commit()
    db.refresh(profile)

    return ProfilePublic.model_validate(profile)
