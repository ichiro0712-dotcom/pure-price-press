"""
Pure Price Press - Main FastAPI Application
バイアスのかかっていない真実のニュースをお金の動きから分析する

Optimized for Vercel Serverless deployment.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from api.routes import router as api_router


# Initialize FastAPI app (no lifespan for serverless compatibility)
app = FastAPI(
    title="Pure Price Press API",
    description="バイアスのかかっていない真実のニュースをお金の動きから分析する",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS Configuration
# Allow all origins for Vercel deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
from fastapi.responses import JSONResponse

@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Custom 404 handler."""
    return JSONResponse(
        status_code=404,
        content={
            "detail": "Resource not found",
            "message": "The requested endpoint does not exist",
            "hint": "Visit /docs for API documentation"
        }
    )


@app.exception_handler(500)
async def internal_error_handler(request, exc):
    """Custom 500 handler."""
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "message": "Something went wrong on our end",
            "hint": "Please try again later or contact support"
        }
    )


if __name__ == "__main__":
    # Run the application
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
