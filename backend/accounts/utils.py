from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.conf import settings

def verify_google_token(token):
    """
    Verify Google ID token and return decoded payload.
    Returns None if token is invalid or expired.
    """
    try:
        if not settings.GOOGLE_CLIENT_ID:
            return None
        idinfo = id_token.verify_oauth2_token(
            token, 
            google_requests.Request(), 
            settings.GOOGLE_CLIENT_ID
        )
        # Verify that the token was issued for our client
        if idinfo['aud'] != settings.GOOGLE_CLIENT_ID:
            return None
        return idinfo
    except Exception:
        return None