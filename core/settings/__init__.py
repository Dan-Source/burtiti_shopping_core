import os

# Loader settings: pick env-specific settings module.
# Set DJANGO_ENV to 'production' to load production settings, otherwise 'development' is used.
DJANGO_ENV = os.getenv('DJANGO_ENV', 'development')

if DJANGO_ENV == 'production':
    from .production import *  # noqa: F401,F403
else:
    from .development import *  # noqa: F401,F403
