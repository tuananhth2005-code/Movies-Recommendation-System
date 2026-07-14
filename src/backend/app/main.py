from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import auth, movies, ratings, watchlist, recommends, chat

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Movie Recommendation System API",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # Restrict in production!
    allow_credentials=True,
    allow_methods=["*"],    
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,      prefix="/api/v1")
app.include_router(movies.router,    prefix="/api/v1")
app.include_router(ratings.router,   prefix="/api/v1")
app.include_router(watchlist.router, prefix="/api/v1")
app.include_router(recommends.router, prefix="/api/v1")
app.include_router(chat.router,      prefix="/api/v1")

@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "app": settings.APP_NAME}
