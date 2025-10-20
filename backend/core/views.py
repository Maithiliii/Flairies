from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from .serializers import SignupSerializer

# Class-based signup view
class SignupView(generics.CreateAPIView):
    serializer_class = SignupSerializer


# Function-based login view
@api_view(['POST'])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')

    if not email or not password:
        return Response({"error": "Email and password required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"error": "Invalid email"}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=user.username, password=password)
    if user:
        return Response({
            "username": user.username,
            "email": user.email,
            "phone_number": user.profile.phone_number  # Assumes OneToOne UserProfile
        })
    return Response({"error": "Invalid password"}, status=status.HTTP_400_BAD_REQUEST)
