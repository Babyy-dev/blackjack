import uuid

from pydantic import BaseModel, ConfigDict, EmailStr

from app.schemas.profile import ProfilePublic


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    is_active: bool
    is_admin: bool
    profile: ProfilePublic | None = None
