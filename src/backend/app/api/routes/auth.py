from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.api.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    AuthResponse,
    UserResponse,
    UpdatePreferencesRequest,
    UpdatePreferencesResponse,
)
from app.models import User
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """
    POST /auth/register
    """
    user = auth_service.register_user(db, payload)
    from app.core.security import create_access_token
    token = create_access_token(data={"sub": str(user.id)})
    return AuthResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    POST /auth/login
    """
    user, token = auth_service.authenticate_user(db, payload)
    return AuthResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    GET /auth/me
    """
    return UserResponse.model_validate(current_user)


@router.put("/me/preferences", response_model=UpdatePreferencesResponse)
def update_preferences(
    payload: UpdatePreferencesRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    PUT /auth/me/preferences
    """
    user = auth_service.update_user_preferences(db, current_user, payload.genre_ids)
    return UpdatePreferencesResponse(
        message="Preferences saved",
        genres=[{"id": genre.id, "name": genre.name} for genre in user.preferred_genres],
    )
