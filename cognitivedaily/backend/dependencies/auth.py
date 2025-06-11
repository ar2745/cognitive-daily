from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer

try:
    from backend.utils.jwt import decode_jwt
except ImportError:
    from utils.jwt import decode_jwt

# The tokenUrl is a placeholder; adjust as needed for your login endpoint
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    email = payload.get("email")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    # Optionally: fetch user from DB for up-to-date info
    return {"user_id": user_id, "email": email} 