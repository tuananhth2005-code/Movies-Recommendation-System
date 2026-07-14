from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models import User, Genre
from app.core.security import hash_password, verify_password, create_access_token
from app.api.schemas.auth import RegisterRequest, LoginRequest


def register_user(db: Session, payload: RegisterRequest) -> User:
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, payload: LoginRequest) -> tuple[User, str]:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token = create_access_token(data={"sub": str(user.id)})
    return user, token


def update_user_preferences(db: Session, user: User, genre_ids: list[int]) -> User:
    if not genre_ids:
        user.preferred_genres = []
        db.commit()
        db.refresh(user)
        return user

    genres = db.query(Genre).filter(Genre.id.in_(genre_ids)).all()
    found_ids = {genre.id for genre in genres}
    missing_ids = [genre_id for genre_id in genre_ids if genre_id not in found_ids]
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Genres not found: {missing_ids}",
        )

    user.preferred_genres = genres
    db.commit()
    db.refresh(user)
    return user
