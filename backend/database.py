"""
Database configuration and connection management using Prisma
Enhanced with connection pooling and health checks
"""
from prisma import Prisma
from typing import AsyncGenerator
import logging
import asyncio
from datetime import datetime, timedelta

logger = logging.getLogger("uvicorn.error")

# Global Prisma client instance
prisma_client = Prisma()

# Connection health tracking
last_health_check = None
health_check_interval = timedelta(minutes=5)
connection_lock = asyncio.Lock()

async def ensure_connection():
    """
    Ensure database connection is alive with health checks
    Implements connection pooling best practices
    """
    global last_health_check

    async with connection_lock:
        now = datetime.now()

        # Check if we need a health check
        needs_health_check = (
            last_health_check is None or
            (now - last_health_check) > health_check_interval
        )

        # If not connected, connect
        if not prisma_client.is_connected():
            try:
                logger.info("Establishing database connection...")
                await prisma_client.connect()
                last_health_check = now
                logger.info("Database connected successfully")
            except Exception as e:
                logger.error(f"Failed to connect to database: {e}")
                raise

        # Perform health check if needed
        elif needs_health_check:
            try:
                # Simple query to test connection
                await prisma_client.execute_raw("SELECT 1")
                last_health_check = now
                logger.debug("Database health check passed")
            except Exception as e:
                logger.warning(f"Database health check failed: {e}. Reconnecting...")
                # Connection is stale, reconnect
                try:
                    await prisma_client.disconnect()
                except:
                    pass
                await prisma_client.connect()
                last_health_check = now
                logger.info("Database reconnected successfully")

async def connect_db():
    """Connect to the database"""
    await ensure_connection()
    return prisma_client

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

    Implements automatic reconnection and health checks
    """
    try:
        # Ensure healthy connection before yielding
        await ensure_connection()
        yield prisma_client

    except Exception as e:
        logger.error(f"Database error in get_db: {e}")

        # Attempt recovery
        try:
            logger.info("Attempting database recovery...")
            await ensure_connection()
            logger.info("Database recovery successful")
        except Exception as reconnect_error:
            logger.error(f"Failed to recover database connection: {reconnect_error}")

        raise
