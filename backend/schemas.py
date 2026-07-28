from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    status: str
    database: str
    version: str


class Profile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    full_name: str
    headline: str
    summary: str | None
    updated_at: datetime


class ProfileResponse(BaseModel):
    profile: Profile


class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=1, max_length=100)
    headline: str = Field(min_length=1, max_length=200)
    summary: str | None = Field(default=None, max_length=2000)


class LoginRequest(BaseModel):
    passcode: str


class SessionResponse(BaseModel):
    authenticated: bool
