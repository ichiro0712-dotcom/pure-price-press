"""
Database configuration and session management for Pure Price Press.
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Database URL from environment variable or default to local SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/app.db")

# Supabase/Railway uses postgres:// but SQLAlchemy needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create engine with appropriate configuration
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
elif DATABASE_URL.startswith("postgresql"):
    # For Supabase/PostgreSQL, use SSL
    connect_args = {"sslmode": "require"}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False,  # Set to True for SQL query debugging
    pool_pre_ping=True,  # Enable connection health checks
    pool_size=5,
    max_overflow=10,
)

# Create SessionLocal class for database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for declarative models
Base = declarative_base()


def get_db():
    """
    Dependency function for FastAPI routes to get database session.

    Yields:
        Session: SQLAlchemy database session

    Usage:
        @app.get("/items")
        def read_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def init_db():
    """
    Initialize database by creating all tables.
    Should be called on application startup.
    """
    try:
        # Import models to ensure they're registered with Base
        import models  # noqa: F401

        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✓ Database initialized successfully")
    except Exception as e:
        print(f"✗ Error initializing database: {e}")
        raise e


def close_db():
    """
    Close database connections.
    Should be called on application shutdown.
    """
    try:
        engine.dispose()
        print("✓ Database connections closed")
    except Exception as e:
        print(f"✗ Error closing database: {e}")
        raise e
