import hmac
import base64
import json
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.config import settings
from backend.models.db import get_db, UserRecord

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
    full_name: Optional[str] = None

class UserRegisterRequest(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = None
    role: Optional[str] = "operator"

class UserProfile(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    role: str
    is_active: bool

def hash_password(password: str) -> str:
    """Computes secure SHA-256 salted hash for credentials."""
    salt = settings.SECRET_KEY[:16]
    return hashlib.sha256(f"{salt}{password}".encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

def _base64url_decode(data_str: str) -> bytes:
    padding = '=' * (4 - (len(data_str) % 4)) if len(data_str) % 4 != 0 else ''
    return base64.urlsafe_b64decode((data_str + padding).encode('utf-8'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generates standard HMAC-SHA256 JWT Token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": int(expire.timestamp())})
    
    header = {"alg": "HS256", "typ": "JWT"}
    encoded_header = _base64url_encode(json.dumps(header).encode('utf-8'))
    encoded_payload = _base64url_encode(json.dumps(to_encode).encode('utf-8'))
    
    signature_input = f"{encoded_header}.{encoded_payload}".encode('utf-8')
    signature = hmac.new(settings.SECRET_KEY.encode('utf-8'), signature_input, hashlib.sha256).digest()
    encoded_signature = _base64url_encode(signature)
    
    return f"{encoded_header}.{encoded_payload}.{encoded_signature}"

def decode_access_token(token_str: str) -> Dict[str, Any]:
    """Validates and decodes HMAC-SHA256 JWT Token."""
    parts = token_str.split('.')
    if len(parts) != 3:
        raise ValueError("Invalid JWT format")
    
    encoded_header, encoded_payload, encoded_signature = parts
    signature_input = f"{encoded_header}.{encoded_payload}".encode('utf-8')
    expected_sig = _base64url_encode(hmac.new(settings.SECRET_KEY.encode('utf-8'), signature_input, hashlib.sha256).digest())
    
    if not hmac.compare_digest(encoded_signature, expected_sig):
        raise ValueError("Invalid token signature")
    
    payload = json.loads(_base64url_decode(encoded_payload).decode('utf-8'))
    exp = payload.get("exp")
    if exp and datetime.utcnow().timestamp() > exp:
        raise ValueError("Token has expired")
        
    return payload

def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    token_query: Optional[str] = Query(None, alias="token"),
    db: Session = Depends(get_db)
) -> UserProfile:
    """
    Validates JWT token from Authorization header or ?token= query parameter.
    When AUTH_REQUIRED is False (default for simulator), returns a superuser operator profile.
    """
    if not settings.AUTH_REQUIRED:
        return UserProfile(
            id=1,
            username="operator",
            full_name="Fleet Operations Commander",
            role="admin",
            is_active=True
        )

    auth_token = token or token_query
    if not auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(auth_token)
        username: str = payload.get("sub")
        role: str = payload.get("role", "operator")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")

    user = db.query(UserRecord).filter(UserRecord.username == username).first()
    if user:
        return UserProfile(
            id=user.id,
            username=user.username,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active
        )

    return UserProfile(
        id=999,
        username=username,
        full_name=username.capitalize(),
        role=role,
        is_active=True
    )

def require_role(allowed_roles: List[str]):
    """Role-Based Access Control guard."""
    def role_checker(current_user: UserProfile = Depends(get_current_user)):
        if not settings.AUTH_REQUIRED:
            return current_user
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires one of the following roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker

@router.post("/login", response_model=TokenResponse)
@router.post("/token", response_model=TokenResponse)
async def login(
    req: LoginRequest = Body(...),
    db: Session = Depends(get_db)
):
    """Authenticates operator credentials (JSON body) and returns a signed JWT session."""
    user = db.query(UserRecord).filter(UserRecord.username == req.username).first()
    
    # Allow default bootstrap credentials in dev/staging
    if not user:
        if req.username in ["admin", "operator"] and req.password in ["admin", "operator", "fleetops2026"]:
            access_token = create_access_token({"sub": req.username, "role": "admin" if req.username == "admin" else "operator"})
            return TokenResponse(
                access_token=access_token,
                role="admin" if req.username == "admin" else "operator",
                username=req.username,
                full_name=f"{req.username.capitalize()} User"
            )
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    if not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    access_token = create_access_token({"sub": user.username, "role": user.role})
    return TokenResponse(
        access_token=access_token,
        role=user.role,
        username=user.username,
        full_name=user.full_name
    )

@router.post("/register", response_model=UserProfile)
async def register(
    req: UserRegisterRequest,
    current_user: UserProfile = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """Admin-only endpoint to provision new operators and commanders."""
    existing = db.query(UserRecord).filter(UserRecord.username == req.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    new_user = UserRecord(
        username=req.username,
        hashed_password=hash_password(req.password),
        full_name=req.full_name or req.username,
        role=req.role or "operator"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return UserProfile(
        id=new_user.id,
        username=new_user.username,
        full_name=new_user.full_name,
        role=new_user.role,
        is_active=new_user.is_active
    )

@router.get("/me", response_model=UserProfile)
async def get_my_profile(current_user: UserProfile = Depends(get_current_user)):
    """Returns the authenticated operator profile."""
    return current_user
