from .base import *

# Development-specific settings
DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "web"]
OSCARAPI_ENABLE_REGISTRATION = True

CORS_ALLOWED_ORIGINS = CORS_ALLOWED_ORIGINS + [
    "http://192.168.10.230:3000"
]
