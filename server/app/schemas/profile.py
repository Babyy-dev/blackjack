from pydantic import BaseModel, ConfigDict, Field


class ProfilePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    display_name: str
    bio: str | None = None
    avatar_url: str | None = None


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(None, min_length=3, max_length=64)
    bio: str | None = Field(None, max_length=280)
