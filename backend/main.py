import os
import secrets
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request
from sqlalchemy import select, text
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware

import models
import schemas
from db import engine, get_db
from init_db import init_database

load_dotenv()

ADMIN_PASSCODE = os.environ["ADMIN_PASSCODE"]
SESSION_SECRET = os.environ["SESSION_SECRET"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 엔티티 기준으로 테이블이 있는지 확인하고, 없으면 만든다.
    # 비어 있으면 화면에 보여줄 한 건을 넣는다.
    init_database()
    yield
    engine.dispose()


app = FastAPI(lifespan=lifespan)
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET, session_cookie="myhub_session")


def require_admin(request: Request) -> None:
    if not request.session.get("admin"):
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")


def load_profile(db: Session) -> models.Profile:
    profile = db.scalars(select(models.Profile).order_by(models.Profile.id).limit(1)).first()

    if profile is None:
        raise HTTPException(status_code=404, detail="프로필이 아직 없습니다.")

    return profile


@app.get("/api/health", response_model=schemas.HealthResponse)
def health(db: Session = Depends(get_db)):
    try:
        version = db.scalar(text("select version()"))
        return schemas.HealthResponse(status="ok", database="connected", version=version)
    except Exception as e:
        raise HTTPException(status_code=503, detail={"status": "error", "database": "disconnected", "error": str(e)})


@app.get("/api/profile", response_model=schemas.ProfileResponse)
def get_profile(db: Session = Depends(get_db)):
    entity = load_profile(db)
    return schemas.ProfileResponse(profile=schemas.Profile.model_validate(entity))


@app.put("/api/profile", response_model=schemas.ProfileResponse, dependencies=[Depends(require_admin)])
def update_profile(body: schemas.ProfileUpdate, db: Session = Depends(get_db)):
    entity = load_profile(db)

    entity.full_name = body.full_name
    entity.headline = body.headline
    entity.summary = body.summary

    db.commit()
    db.refresh(entity)

    return schemas.ProfileResponse(profile=schemas.Profile.model_validate(entity))


@app.post("/api/auth/session", response_model=schemas.SessionResponse)
def login(body: schemas.LoginRequest, request: Request):
    if not secrets.compare_digest(body.passcode.encode("utf-8"), ADMIN_PASSCODE.encode("utf-8")):
        raise HTTPException(status_code=401, detail="비밀코드가 올바르지 않습니다.")

    request.session["admin"] = True
    return schemas.SessionResponse(authenticated=True)


@app.get("/api/auth/session", response_model=schemas.SessionResponse)
def check_session(request: Request):
    return schemas.SessionResponse(authenticated=bool(request.session.get("admin")))


@app.delete("/api/auth/session", response_model=schemas.SessionResponse)
def logout(request: Request):
    request.session.clear()
    return schemas.SessionResponse(authenticated=False)
