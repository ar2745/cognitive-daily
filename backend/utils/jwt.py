from fastapi import HTTPException, status
from jose import JWTError, jwt

try:
    from backend.core.config import get_settings
except ImportError:
    from core.config import get_settings

settings = get_settings()


def decode_jwt(token: str):
    try:
        payload = jwt.decode(
            token,
            key="59Kil8q/9o0MtRHGLN2sRJoLqUIEFLTZE6bNWkniUk4xwRImjPiQXwhun4rs2cl0fm9odb9sNg72LunphEB95Q==",
            algorithms=[settings.JWT_ALGORITHM],
            audience="authenticated",
        )
        return payload
    except JWTError as e:
        print(f"JWT decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) 