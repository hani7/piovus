import os
import requests
import logging

logger = logging.getLogger(__name__)

def verify_recaptcha(token):
    """
    Verifies a Google reCAPTCHA v3 token.
    Returns (True, score) if valid, (False, 0) otherwise.
    """
    secret_key = os.environ.get('RECAPTCHA_SECRET_KEY')
    if not secret_key:
        logger.warning("RECAPTCHA_SECRET_KEY not set. Bypassing captcha validation for development.")
        return True, 1.0  # Bypass if not configured (e.g., dev environment)

    if not token:
        return False, 0.0

    try:
        response = requests.post(
            'https://www.google.com/recaptcha/api/siteverify',
            data={
                'secret': secret_key,
                'response': token
            }
        )
        result = response.json()
        
        if result.get('success'):
            score = result.get('score', 0.0)
            if score >= 0.5:
                return True, score
            else:
                logger.warning(f"reCAPTCHA failed: low score {score}")
                return False, score
        else:
            logger.warning(f"reCAPTCHA failed: {result.get('error-codes')}")
            return False, 0.0
    except Exception as e:
        logger.error(f"reCAPTCHA verification error: {e}")
        return False, 0.0
