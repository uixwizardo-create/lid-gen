import sys
import asyncio
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import init_db, async_session
from app.router import router
from app.scheduler import scheduler_loop

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database on startup
    await init_db()

    # Reset any sessions that were left in 'running' state from a previous
    # server instance. Since no scraper process can survive a restart, these
    # are definitively stale and must be marked as 'failed'.
    async with async_session() as db:
        await db.execute(
            text("UPDATE search_sessions SET status = 'failed' WHERE status = 'running'")
        )
        await db.commit()

    # Start scheduler loop
    scheduler_task = asyncio.create_task(scheduler_loop())

    try:
        yield
    finally:
        scheduler_task.cancel()
        try:
            await scheduler_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="B2B Lead Extraper & Scraper API",
    description="High-performance, stealth-enabled asynchronous B2B scraping backend",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(router)

@app.get("/api/health")
async def health_check():
    """Health check endpoint to verify backend status."""
    return {"status": "healthy", "service": "lead-extractor-api"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
