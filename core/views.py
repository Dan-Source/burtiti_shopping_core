from django.http import JsonResponse
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.encoding import force_bytes, force_str

from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from oscarapi.basket import operations
from oscarapi.views.basket import BasketLineDetail


User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name")
        read_only_fields = ("id", "email")


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(min_length=8, write_only=True)


class UserMeView(APIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = UserProfileSerializer

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PasswordResetRequestView(APIView):
    serializer_class = PasswordResetRequestSerializer

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        user = User.objects.filter(email__iexact=email).first()
        if user is not None:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            # Token is returned for API-driven clients. Email dispatch can be added later.
            return Response(
                {
                    "detail": "Instrucoes de recuperacao enviadas para o email informado.",
                    "token": f"{uid}:{token}",
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {"detail": "Instrucoes de recuperacao enviadas para o email informado."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    serializer_class = PasswordResetConfirmSerializer

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token_value = serializer.validated_data["token"]
        password = serializer.validated_data["password"]

        if ":" not in token_value:
            return Response({"detail": "Token invalido."}, status=status.HTTP_400_BAD_REQUEST)

        uidb64, token = token_value.split(":", 1)
        try:
            user_id = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=user_id)
        except (User.DoesNotExist, ValueError, TypeError):
            return Response({"detail": "Token invalido."}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({"detail": "Token invalido ou expirado."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save(update_fields=["password"])
        return Response({"detail": "Senha redefinida com sucesso."}, status=status.HTTP_200_OK)


class CurrentBasketLineDetailView(BasketLineDetail):
    def get_queryset(self):
        basket = operations.get_basket(self.request)
        prepared_basket = operations.prepare_basket(basket, self.request)
        return prepared_basket.all_lines()


@ensure_csrf_cookie
def csrf_token_view(request):
    """Return a CSRF token and set the csrftoken cookie for frontend clients."""
    return JsonResponse({"csrfToken": get_token(request)})
