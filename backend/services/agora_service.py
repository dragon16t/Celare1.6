"""Agora RTC token issuing for 1:1 video consultations (certificate stays server-side)."""
import os
import time

from agora_token_builder import RtcTokenBuilder

ROLE_PUBLISHER = 1
TTL_SECONDS = 2 * 60 * 60


def configured() -> bool:
    return bool(os.environ.get("AGORA_APP_ID") and os.environ.get("AGORA_APP_CERTIFICATE"))


def rtc_token(channel: str, uid: int) -> dict:
    app_id = os.environ["AGORA_APP_ID"]
    expire = int(time.time()) + TTL_SECONDS
    token = RtcTokenBuilder.buildTokenWithUid(app_id, os.environ["AGORA_APP_CERTIFICATE"], channel, uid,
                                              ROLE_PUBLISHER, expire)
    return {"app_id": app_id, "channel": channel, "uid": uid, "token": token, "expires_in": TTL_SECONDS}
