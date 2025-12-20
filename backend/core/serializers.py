from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, Item, ItemImage, Order, PlatformSettings, Conversation, Message, Review

class SignupSerializer(serializers.ModelSerializer):
    phone_number = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'phone_number']

    def validate_email(self, value):
        """Check if email already exists"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("User with that email already exists")
        return value

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
    
    def to_representation(self, instance):
        """Include phone number in the response"""
        data = super().to_representation(instance)
        if hasattr(instance, 'profile'):
            data['phone_number'] = instance.profile.phone_number
        else:
            data['phone_number'] = ""
        return data


class ItemImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemImage
        fields = ['id', 'image', 'order']


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = ['username', 'email', 'phone_number', 'profile_picture', 
                  'account_holder_name', 'account_number', 'ifsc_code', 'upi_id']
        read_only_fields = ['username', 'email']


class ItemSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_profile_picture = serializers.SerializerMethodField()
    display_category = serializers.CharField(source='get_display_category', read_only=True)
    display_size = serializers.CharField(source='get_display_size', read_only=True)
    additional_images = ItemImageSerializer(many=True, read_only=True)
    image_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Item
        fields = [
            'id', 'user', 'username', 'user_email', 'user_profile_picture', 'listing_type', 'title', 'description',
            'image', 'additional_images', 'image_count', 'condition', 'category', 
            'custom_category', 'display_category', 'size', 'custom_size', 'display_size', 
            'price', 'rent_price', 'deposit', 'payment_method', 'created_at', 'updated_at', 'is_active', 'is_claimed'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'username', 'user_email', 'user_profile_picture', 'display_category', 'display_size', 'user', 'image_count', 'is_active', 'is_claimed']
    
    def get_user_profile_picture(self, obj):
        """Return user's profile picture URL"""
        if obj.user.profile.profile_picture:
            return obj.user.profile.profile_picture.url
        return None
    
    def get_image_count(self, obj):
        """Return total number of images (main + additional)"""
        count = 1 if obj.image else 0
        count += obj.additional_images.count()
        return count
    
    def create(self, validated_data):
        # User will be set from the request in the view
        return super().create(validated_data)


class OrderSerializer(serializers.ModelSerializer):
    buyer_username = serializers.CharField(source='buyer.username', read_only=True)
    seller_username = serializers.CharField(source='seller.username', read_only=True)
    item_title = serializers.CharField(source='item.title', read_only=True)
    item_image = serializers.SerializerMethodField()
    has_review = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_id', 'buyer', 'buyer_username', 'seller', 'seller_username',
            'item', 'item_title', 'item_image', 'item_price', 'platform_commission_rate',
            'platform_commission', 'seller_earnings', 'payment_method', 'payment_status',
            'order_status', 'buyer_name', 'buyer_phone', 'delivery_address',
            'razorpay_order_id', 'razorpay_payment_id', 'created_at', 'updated_at',
            'paid_at', 'delivered_at', 'has_review'
        ]
        read_only_fields = ['id', 'order_id', 'platform_commission', 'seller_earnings', 
                           'created_at', 'updated_at', 'paid_at', 'delivered_at']
    
    def get_item_image(self, obj):
        if obj.item.image:
            return obj.item.image.url
        return None
    
    def get_has_review(self, obj):
        return hasattr(obj, 'review')


class PlatformSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSettings
        fields = ['commission_rate', 'cod_commission_rate', 'min_order_value', 'updated_at']
        read_only_fields = ['updated_at']


class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    sender_email = serializers.CharField(source='sender.email', read_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'sender_username', 'sender_email', 'content', 'is_read', 'created_at']
        read_only_fields = ['id', 'created_at']


class ConversationSerializer(serializers.ModelSerializer):
    participant1_username = serializers.CharField(source='participant1.username', read_only=True)
    participant1_email = serializers.CharField(source='participant1.email', read_only=True)
    participant1_profile_picture = serializers.SerializerMethodField()
    participant2_username = serializers.CharField(source='participant2.username', read_only=True)
    participant2_email = serializers.CharField(source='participant2.email', read_only=True)
    participant2_profile_picture = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = ['id', 'participant1', 'participant1_username', 'participant1_email', 'participant1_profile_picture',
                  'participant2', 'participant2_username', 'participant2_email', 'participant2_profile_picture',
                  'last_message', 'unread_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_participant1_profile_picture(self, obj):
        if hasattr(obj.participant1, 'profile') and obj.participant1.profile.profile_picture:
            return obj.participant1.profile.profile_picture.url
        return None
    
    def get_participant2_profile_picture(self, obj):
        if hasattr(obj.participant2, 'profile') and obj.participant2.profile.profile_picture:
            return obj.participant2.profile.profile_picture.url
        return None
    
    def get_last_message(self, obj):
        last_msg = obj.messages.last()
        if last_msg:
            return {
                'content': last_msg.content,
                'created_at': last_msg.created_at,
                'sender_username': last_msg.sender.username
            }
        return None
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0


class ReviewSerializer(serializers.ModelSerializer):
    buyer_username = serializers.CharField(source='buyer.username', read_only=True)
    buyer_profile_picture = serializers.SerializerMethodField()
    seller_username = serializers.CharField(source='seller.username', read_only=True)
    order_id = serializers.CharField(source='order.order_id', read_only=True)
    
    class Meta:
        model = Review
        fields = ['id', 'order', 'order_id', 'buyer', 'buyer_username', 'buyer_profile_picture',
                  'seller', 'seller_username', 'rating', 'review_text', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_buyer_profile_picture(self, obj):
        if hasattr(obj.buyer, 'profile') and obj.buyer.profile.profile_picture:
            return obj.buyer.profile.profile_picture.url
        return None
