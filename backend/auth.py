from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import database

# SECRET_KEY should be in env vars in production
SECRET_KEY = "supersecretkey"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password, hashed_password):
    # Bcrypt has a 72-byte limit, so we truncate long passwords
    password_bytes = plain_password.encode('utf-8')[:72]
    return bcrypt.checkpw(password_bytes, hashed_password.encode('utf-8'))

def get_password_hash(password):
    # Bcrypt has a 72-byte limit, so we truncate long passwords
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(db = Depends(database.get_db)):
    # BYPASS AUTHENTICATION
    # Return a dummy user for development
    from prisma import Prisma
    if isinstance(db, Prisma):
        user = await db.user.find_unique(where={"email": "test@example.com"})
        if not user:
            # Create dummy user if not exists
            user = await db.user.create(
                data={
                    "email": "test@example.com",
                    "hashedPassword": "dummy_password"
                }
            )
        return user
    return None
