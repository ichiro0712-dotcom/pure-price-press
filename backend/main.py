"""
Pure Price Press - Main FastAPI Application
バイアスのかかっていない真実のニュースをお金の動きから分析する
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from database import init_db, close_db
from api.routes import router as api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup
    print("=" * 60)
    print("Pure Price Press - Starting up...")
    print("=" * 60)

    # Initialize database
    init_db()

    # Import and start monitor (will be implemented in next step)
    try:
        from monitor import start_monitor
        start_monitor()
        print("✓ Stock monitor started")
    except ImportError:
        print("⚠ Monitor module not yet implemented")
    except Exception as e:
        print(f"⚠ Monitor startup warning: {e}")

    print("=" * 60)
    print("✓ Pure Price Press is ready")
    print("  - API Docs: http://localhost:8000/docs")
    print("  - Health Check: http://localhost:8000/api/health")
    print("=" * 60)

    yield

    # Shutdown
    print("\nPure Price Press - Shutting down...")

    # Stop monitor
    try:
        from monitor import stop_monitor
        stop_monitor()
        print("✓ Stock monitor stopped")
    except ImportError:
        pass
    except Exception as e:
        print(f"⚠ Monitor shutdown warning: {e}")

    # Close database
    close_db()
    print("✓ Pure Price Press shutdown complete")


# Initialize FastAPI app
app = FastAPI(
    title="Pure Price Press API",
    description="バイアスのかかっていない真実のニュースをお金の動きから分析する",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS Configuration
# Allow frontend to access the API
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include API routes
app.include_router(api_router, prefix="/api", tags=["api"])


# Root endpoint
@app.get("/", tags=["root"])
async def root():
    """Root endpoint - welcome message."""
    return {
        "name": "Pure Price Press",
        "version": "1.0.0",
        "description": "バイアスのかかっていない真実のニュースをお金の動きから分析する",
        "tagline": "Price is truth. News is perspective.",
        "endpoints": {
            "api_docs": "/docs",
            "health": "/api/health",
            "targets": "/api/targets",
            "alerts": "/api/alerts"
        }
    }


# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Custom 404 handler."""
    return {
        "detail": "Resource not found",
        "message": "The requested endpoint does not exist",
        "hint": "Visit /docs for API documentation"
    }


@app.exception_handler(500)
async def internal_error_handler(request, exc):
    """Custom 500 handler."""
    return {
        "detail": "Internal server error",
        "message": "Something went wrong on our end",
        "hint": "Please try again later or contact support"
    }


if __name__ == "__main__":
    # Run the application
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
