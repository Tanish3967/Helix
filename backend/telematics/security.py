"""
IoT Telematics Cryptographic Security & Anti-Spoofing Module.
Enforces hardware-level packet signature verification (HMAC-SHA256)
and prevents replay attacks with timestamp drift and nonce tracking.
"""

import hmac
import hashlib
import time
from typing import Dict, Any, Tuple
from backend.config import settings

# Nonce cache to prevent replay attacks (in-memory sliding window)
_SEEN_NONCES: Dict[str, float] = {}

def clean_expired_nonces():
    """Removes nonces older than 2x the max timestamp drift window."""
    now = time.time()
    cutoff = now - (settings.MAX_TIMESTAMP_DRIFT_SEC * 2)
    expired_keys = [k for k, v in _SEEN_NONCES.items() if v < cutoff]
    for k in expired_keys:
        _SEEN_NONCES.pop(k, None)

def sign_telematics_payload(payload: Dict[str, Any], secret_key: str = None) -> str:
    """
    Computes a cryptographic HMAC-SHA256 signature for an outbound telematics packet.
    Payload must contain 'vehicle_id', 'timestamp', and 'lat'/'lng'.
    """
    key = (secret_key or settings.TELEMATICS_HMAC_SECRET).encode('utf-8')
    v_id = str(payload.get("vehicle_id", payload.get("id", "")))
    ts = str(payload.get("timestamp", ""))
    lat = str(payload.get("lat", payload.get("location", {}).get("lat", "")))
    lng = str(payload.get("lng", payload.get("location", {}).get("lng", "")))
    nonce = str(payload.get("nonce", ""))

    message = f"{v_id}:{ts}:{lat}:{lng}:{nonce}".encode('utf-8')
    return hmac.new(key, message, hashlib.sha256).hexdigest()

def verify_telematics_signature(
    payload: Dict[str, Any],
    provided_signature: str,
    secret_key: str = None
) -> Tuple[bool, str]:
    """
    Verifies that the telematics packet was signed by an authentic onboard hardware gateway
    and is not a replayed or spoofed packet.
    """
    if not settings.TELEMATICS_ENFORCE_SIGNATURE and not provided_signature:
        return True, "Verification bypassed (dev mode)"

    if not provided_signature:
        return False, "Missing telematics cryptographic signature"

    # 1. Timestamp drift check (anti-replay)
    now = time.time()
    packet_ts = payload.get("timestamp")
    if packet_ts:
        try:
            # Handle float seconds or ISO format
            if isinstance(packet_ts, (int, float)):
                ts_val = float(packet_ts)
            else:
                from datetime import datetime
                ts_val = datetime.fromisoformat(str(packet_ts).replace('Z', '+00:00')).timestamp()

            drift = abs(now - ts_val)
            if drift > settings.MAX_TIMESTAMP_DRIFT_SEC:
                return False, f"Timestamp drift {drift:.1f}s exceeds threshold ({settings.MAX_TIMESTAMP_DRIFT_SEC}s)"
        except Exception as e:
            return False, f"Invalid timestamp format: {e}"

    # 2. Nonce replay check
    nonce = payload.get("nonce")
    if nonce:
        clean_expired_nonces()
        if nonce in _SEEN_NONCES:
            return False, f"Replay attack detected: Nonce '{nonce}' already processed"
        _SEEN_NONCES[nonce] = now

    # 3. Signature verification
    expected_sig = sign_telematics_payload(payload, secret_key)
    if not hmac.compare_digest(provided_signature, expected_sig):
        return False, "Invalid HMAC signature (potential GPS/CAN-bus spoofing attempt)"

    return True, "Valid authentic hardware signature"
