from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie


@ensure_csrf_cookie
def csrf_token_view(request):
    """Return a CSRF token and set the csrftoken cookie for frontend clients."""
    return JsonResponse({"csrfToken": get_token(request)})
