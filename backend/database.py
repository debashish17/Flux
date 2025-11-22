"""
Database configuration and connection management using Prisma
"""
from prisma import Prisma
from typing import AsyncGenerator
import logging

logger = logging.getLogger("uvicorn.error")

# Global Prisma client instance
prisma_client = Prisma()

async def connect_db():
    """Connect to the database"""
    try:
        if not prisma_client.is_connected():
            await prisma_client.connect()
            logger.info("Database connected successfully")
        return prisma_client
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise

async def disconnect_db():
    """Disconnect from the database"""
    try:
        if prisma_client.is_connected():
            await prisma_client.disconnect()
            logger.info("Database disconnected")
    except Exception as e:
        logger.error(f"Error disconnecting database: {e}")

async def get_db() -> AsyncGenerator[Prisma, None]:
    """
    Dependency for FastAPI routes to get database session
    Usage: db: Prisma = Depends(get_db)
    """
    try:
        # Ensure connection is active
        if not prisma_client.is_connected():
            await prisma_client.connect()

        yield prisma_client

    except Exception as e:
        logger.error(f"Database error in get_db: {e}")
        # Try to reconnect on error
        try:
            if prisma_client.is_connected():
                await prisma_client.disconnect()
            await prisma_client.connect()
        except Exception as reconnect_error:
            logger.error(f"Failed to reconnect: {reconnect_error}")
        raise
