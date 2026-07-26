from __future__ import annotations

import tempfile

from .development import *  # noqa: F401,F403

# Tests should not depend on filesystem permissions from a checked-in index path.
HAYSTACK_CONNECTIONS["default"]["PATH"] = tempfile.mkdtemp(prefix="whoosh_test_")
HAYSTACK_SIGNAL_PROCESSOR = "haystack.signals.BaseSignalProcessor"

# Keep tests fast and deterministic.
ALLOWED_HOSTS = ["*"]
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
