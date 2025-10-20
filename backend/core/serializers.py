from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile

class SignupSerializer(serializers.ModelSerializer):
    phone_number = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'phone_number']

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError("Passwords do not match")
        return data

    def create(self, validated_data):
        phone = validated_data.pop('phone_number')
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(user=user, phone_number=phone)
        return user
