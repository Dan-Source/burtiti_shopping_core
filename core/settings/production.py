from .base import *

# Production-specific settings
DEBUG = False

# Read ALLOWED_HOSTS from env var (comma-separated) or require explicit setting
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "").split(",") if os.getenv("DJANGO_ALLOWED_HOSTS") else ["example.com"]

# It's recommended to set DJANGO_SECRET_KEY in the environment for production
if not os.getenv('DJANGO_SECRET_KEY'):
    # Do not raise here to avoid crashing management commands; log or handle as needed.
    pass
