from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.utils import timezone
from django.db import models
from decimal import Decimal
import uuid
from .serializers import SignupSerializer, ItemSerializer, UserProfileSerializer, OrderSerializer, PlatformSettingsSerializer
from .models import Item, ItemImage, UserProfile, Order, PlatformSettings
from .revenue_analytics import RevenueAnalytics

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
        try:
            # Ensure user has a profile
            if not hasattr(user, 'profile'):
                from .models import UserProfile
                UserProfile.objects.create(user=user)
            
            profile_pic_url = user.profile.profile_picture.url if user.profile.profile_picture else None
            phone_number = user.profile.phone_number if hasattr(user.profile, 'phone_number') else ""
            
            return Response({
                "username": user.username,
                "email": user.email,
                "phone_number": phone_number,
                "profile_picture": profile_pic_url
            })
        except Exception as e:
            # Fallback response if profile access fails
            return Response({
                "username": user.username,
                "email": user.email,
                "phone_number": "",
                "profile_picture": None
            })
    return Response({"error": "Invalid password"}, status=status.HTTP_400_BAD_REQUEST)


# Item views
@api_view(['POST'])
def create_item(request):
    """Create a new item listing with multiple images"""
    serializer = ItemSerializer(data=request.data)
    if serializer.is_valid():
        # Get user from email (since we don't have auth tokens yet)
        email = request.data.get('user_email')
        if not email:
            return Response({"error": "user_email is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_400_BAD_REQUEST)
        
        item = serializer.save(user=user)
        
        # Ensure item is active (should be default, but let's be explicit)
        if not item.is_active:
            item.is_active = True
            item.save()
        
        # Debug: Log item creation
        print(f"DEBUG: Item created - ID: {item.id}, Title: {item.title}, User: {user.email}, Active: {item.is_active}")
        
        # Handle additional images
        additional_images = request.FILES.getlist('additional_images')
        for idx, img_file in enumerate(additional_images):
            ItemImage.objects.create(item=item, image=img_file, order=idx)
        
        # Return the item with all images
        response_serializer = ItemSerializer(item)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def list_items(request):
    """List all active items, optionally filtered by listing_type"""
    listing_type = request.query_params.get('listing_type', None)
    
    items = Item.objects.filter(is_active=True)
    
    if listing_type:
        items = items.filter(listing_type=listing_type)
    
    serializer = ItemSerializer(items, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def user_items(request):
    """Get items for a specific user"""
    email = request.query_params.get('email')
    include_donations = request.query_params.get('include_donations', 'false').lower() == 'true'
    debug = request.query_params.get('debug', 'false').lower() == 'true'
    
    if not email:
        return Response({"error": "email parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_400_BAD_REQUEST)
    
    if debug:
        # Debug mode: return all items for this user with their status
        all_items = Item.objects.filter(user=user)
        debug_data = []
        for item in all_items:
            debug_data.append({
                'id': item.id,
                'title': item.title,
                'listing_type': item.listing_type,
                'is_active': item.is_active,
                'created_at': item.created_at.isoformat(),
            })
        return Response({
            'debug': True,
            'user_email': email,
            'total_items': all_items.count(),
            'items': debug_data
        })
    
    # Get items
    items = Item.objects.filter(user=user, is_active=True)
    
    if not include_donations:
        items = items.exclude(listing_type='donate')
    
    serializer = ItemSerializer(items, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def fix_inactive_items(request):
    """Fix items that were created as inactive"""
    email = request.data.get('email')
    
    if not email:
        return Response({"error": "email is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
        inactive_items = Item.objects.filter(user=user, is_active=False)
        
        count = inactive_items.count()
        inactive_items.update(is_active=True)
        
        return Response({
            "message": f"Fixed {count} inactive items",
            "fixed_count": count
        })
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def update_profile_picture(request):
    """Update user's profile picture"""
    email = request.data.get('email')
    
    if not email:
        return Response({"error": "email is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_400_BAD_REQUEST)
    
    if 'profile_picture' not in request.FILES:
        return Response({"error": "profile_picture file is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    user.profile.profile_picture = request.FILES['profile_picture']
    user.profile.save()
    
    return Response({
        "message": "Profile picture updated successfully",
        "profile_picture": user.profile.profile_picture.url
    })


@api_view(['GET', 'POST'])
def profile_address(request):
    """Get or update user's address"""
    email = request.query_params.get('email') if request.method == 'GET' else request.data.get('email')
    
    if not email:
        return Response({"error": "email is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_400_BAD_REQUEST)
    
    if request.method == 'GET':
        # Return existing address if any
        try:
            # Ensure user has a profile
            if not hasattr(user, 'profile'):
                from .models import UserProfile
                UserProfile.objects.create(user=user)
            
            profile = user.profile
            address = getattr(profile, 'address', None)
            
            if address:
                return Response({
                    "address": address,
                    "latitude": getattr(profile, 'latitude', None),
                    "longitude": getattr(profile, 'longitude', None)
                })
            else:
                return Response({"address": None})
        except Exception as e:
            return Response({"address": None})
    
    elif request.method == 'POST':
        # Save new address
        address = request.data.get('address')
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        
        if not address:
            return Response({"error": "address is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Ensure user has a profile
            if not hasattr(user, 'profile'):
                from .models import UserProfile
                UserProfile.objects.create(user=user)
            
            # Update or create profile with address
            profile = user.profile
            profile.address = address
            if latitude:
                profile.latitude = latitude
            if longitude:
                profile.longitude = longitude
            profile.save()
            
            return Response({
                "message": "Address saved successfully",
                "address": address
            })
        except Exception as e:
            return Response({
                "error": f"Failed to save address: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'POST'])
def bank_details(request):
    """Get or update user's bank details"""
    email = request.query_params.get('email') if request.method == 'GET' else request.data.get('email')
    
    if not email:
        return Response({"error": "email is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_400_BAD_REQUEST)
    
    if request.method == 'GET':
        serializer = UserProfileSerializer(user.profile)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Update bank details
        profile = user.profile
        profile.account_holder_name = request.data.get('account_holder_name', profile.account_holder_name)
        profile.account_number = request.data.get('account_number', profile.account_number)
        profile.ifsc_code = request.data.get('ifsc_code', profile.ifsc_code)
        profile.upi_id = request.data.get('upi_id', profile.upi_id)
        profile.save()
        
        serializer = UserProfileSerializer(profile)
        return Response({
            "message": "Bank details updated successfully",
            "profile": serializer.data
        })


@api_view(['POST'])
def create_order(request):
    """Create a new order"""
    buyer_email = request.data.get('buyer_email')
    item_id = request.data.get('item_id')
    payment_method = request.data.get('payment_method')
    delivery_address = request.data.get('delivery_address')
    buyer_name = request.data.get('buyer_name')
    buyer_phone = request.data.get('buyer_phone')
    
    # Validation
    if not all([buyer_email, item_id, payment_method, delivery_address, buyer_name, buyer_phone]):
        return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        buyer = User.objects.get(email=buyer_email)
        item = Item.objects.get(id=item_id, is_active=True)
    except User.DoesNotExist:
        return Response({"error": "Buyer not found"}, status=status.HTTP_400_BAD_REQUEST)
    except Item.DoesNotExist:
        return Response({"error": "Item not found or not available"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Get platform settings
    settings = PlatformSettings.get_settings()
    
    # Determine price based on listing type
    if item.listing_type == 'rent':
        item_price = item.rent_price
    else:
        item_price = item.price
    
    # Generate unique order ID
    order_id = f"ORD{uuid.uuid4().hex[:8].upper()}"
    
    # Create order
    order = Order.objects.create(
        order_id=order_id,
        buyer=buyer,
        seller=item.user,
        item=item,
        item_price=item_price,
        platform_commission_rate=settings.cod_commission_rate if payment_method == 'cod' else settings.commission_rate,
        payment_method=payment_method,
        buyer_name=buyer_name,
        buyer_phone=buyer_phone,
        delivery_address=delivery_address,
    )
    
    # For COD orders, deactivate item immediately
    # For online payments, item will be deactivated when payment is confirmed
    if payment_method == 'cod':
        item.is_active = False
        item.save()
        # Notify seller of COD order
        notify_seller_of_purchase(order)
    
    serializer = OrderSerializer(order)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def user_orders(request):
    """Get orders for a user (as buyer or seller)"""
    email = request.query_params.get('email')
    role = request.query_params.get('role', 'buyer')  # 'buyer' or 'seller'
    
    if not email:
        return Response({"error": "email is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_400_BAD_REQUEST)
    
    if role == 'seller':
        orders = Order.objects.filter(seller=user)
    else:
        orders = Order.objects.filter(buyer=user)
    
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def seller_earnings(request):
    """Get seller's earnings summary"""
    email = request.query_params.get('email')
    
    if not email:
        return Response({"error": "email is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Get all seller's orders
    orders = Order.objects.filter(seller=user)
    
    # Calculate totals
    total_sales = orders.filter(payment_status='paid').count()
    total_revenue = sum(order.item_price for order in orders.filter(payment_status='paid'))
    total_commission = sum(order.platform_commission for order in orders.filter(payment_status='paid'))
    total_earnings = sum(order.seller_earnings for order in orders.filter(payment_status='paid'))
    pending_orders = orders.filter(order_status='pending').count()
    
    return Response({
        "total_sales": total_sales,
        "total_revenue": float(total_revenue),
        "total_commission": float(total_commission),
        "total_earnings": float(total_earnings),
        "pending_orders": pending_orders,
    })


@api_view(['GET'])
def platform_settings(request):
    """Get platform settings (commission rates, etc.)"""
    settings = PlatformSettings.get_settings()
    serializer = PlatformSettingsSerializer(settings)
    return Response(serializer.data)


# Chat Views
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer
from django.db.models import Q

@api_view(['GET', 'POST'])
def conversation_list(request):
    """Get all conversations for the current user or create a new one"""
    if request.method == 'GET':
        user_email = request.query_params.get('email')
        if not user_email:
            return Response({"error": "Email parameter required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=user_email)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get all conversations where user is either participant1 or participant2
        conversations = Conversation.objects.filter(
            Q(participant1=user) | Q(participant2=user)
        ).order_by('-updated_at')
        
        serializer = ConversationSerializer(conversations, many=True, context={'request': request})
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Create or get conversation between two users
        user1_email = request.data.get('user1_email')
        user2_email = request.data.get('user2_email')
        
        if not user1_email or not user2_email:
            return Response({"error": "Both user emails required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user1 = User.objects.get(email=user1_email)
            user2 = User.objects.get(email=user2_email)
        except User.DoesNotExist:
            return Response({"error": "One or both users not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if conversation already exists (in either direction)
        conversation = Conversation.objects.filter(
            (Q(participant1=user1) & Q(participant2=user2)) |
            (Q(participant1=user2) & Q(participant2=user1))
        ).first()
        
        if not conversation:
            # Create new conversation
            conversation = Conversation.objects.create(
                participant1=user1,
                participant2=user2
            )
        
        serializer = ConversationSerializer(conversation, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def conversation_messages(request, conversation_id):
    """Get all messages in a conversation"""
    user_email = request.query_params.get('email')
    if not user_email:
        return Response({"error": "Email parameter required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=user_email)
        conversation = Conversation.objects.get(id=conversation_id)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    except Conversation.DoesNotExist:
        return Response({"error": "Conversation not found"}, status=status.HTTP_404_NOT_FOUND)
    
    # Verify user is part of the conversation
    if conversation.participant1 != user and conversation.participant2 != user:
        return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
    
    messages = conversation.messages.all()
    
    # Mark messages as read
    messages.filter(is_read=False).exclude(sender=user).update(is_read=True)
    
    serializer = MessageSerializer(messages, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def send_message(request):
    """Send a message in a conversation"""
    conversation_id = request.data.get('conversation_id')
    sender_email = request.data.get('sender_email')
    content = request.data.get('content')
    
    if not all([conversation_id, sender_email, content]):
        return Response({"error": "conversation_id, sender_email, and content required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        sender = User.objects.get(email=sender_email)
        conversation = Conversation.objects.get(id=conversation_id)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    except Conversation.DoesNotExist:
        return Response({"error": "Conversation not found"}, status=status.HTTP_404_NOT_FOUND)
    
    # Verify sender is part of the conversation
    if conversation.participant1 != sender and conversation.participant2 != sender:
        return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
    
    # Create message
    message = Message.objects.create(
        conversation=conversation,
        sender=sender,
        content=content
    )
    
    # Update conversation timestamp
    conversation.save()
    
    serializer = MessageSerializer(message)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def update_payment_status(request):
    """Update payment status for an order"""
    order_id = request.data.get('order_id')
    payment_id = request.data.get('payment_id')
    payment_status = request.data.get('payment_status')
    
    if not order_id:
        return Response({"error": "Order ID required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        order = Order.objects.get(order_id=order_id)
        
        if payment_id:
            order.razorpay_payment_id = payment_id
        
        if payment_status:
            order.payment_status = payment_status
            if payment_status == 'paid':
                order.paid_at = timezone.now()
                order.order_status = 'confirmed'
                
                # Deactivate the item so it doesn't appear in listings anymore
                try:
                    item = order.item
                    item.is_active = False
                    item.save()
                    print(f"Item {item.id} ({item.title}) deactivated successfully")
                    
                    # Send notifications
                    notify_seller_of_purchase(order)
                    notify_buyer_of_confirmation(order)
                except Exception as e:
                    print(f"Error deactivating item: {e}")
        
        order.save()
        
        serializer = OrderSerializer(order)
        return Response(serializer.data)
        
    except Order.DoesNotExist:
        return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)


# Review Views
from .models import Review
from .serializers import ReviewSerializer

@api_view(['POST'])
def create_review(request):
    """Create a review for a seller after order completion"""
    order_id = request.data.get('order_id')
    buyer_email = request.data.get('buyer_email')
    rating = request.data.get('rating')
    review_text = request.data.get('review_text', '')
    
    if not all([order_id, buyer_email, rating]):
        return Response({"error": "order_id, buyer_email, and rating are required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        buyer = User.objects.get(email=buyer_email)
        order = Order.objects.get(order_id=order_id)
        
        # Verify buyer owns this order
        if order.buyer != buyer:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
        # Check if review already exists
        if hasattr(order, 'review'):
            return Response({"error": "Review already exists for this order"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create review
        review = Review.objects.create(
            order=order,
            buyer=buyer,
            seller=order.seller,
            rating=rating,
            review_text=review_text
        )
        
        serializer = ReviewSerializer(review)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    except Order.DoesNotExist:
        return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
def seller_reviews(request):
    """Get all reviews for a seller with average rating"""
    seller_email = request.query_params.get('email')
    
    if not seller_email:
        return Response({"error": "email parameter required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        seller = User.objects.get(email=seller_email)
        reviews = Review.objects.filter(seller=seller)
        
        # Calculate average rating
        if reviews.exists():
            avg_rating = sum(r.rating for r in reviews) / reviews.count()
        else:
            avg_rating = 0
        
        serializer = ReviewSerializer(reviews, many=True)
        return Response({
            "reviews": serializer.data,
            "average_rating": round(avg_rating, 1),
            "total_reviews": reviews.count()
        })
        
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
def order_can_review(request):
    """Check if an order can be reviewed"""
    order_id = request.query_params.get('order_id')
    
    if not order_id:
        return Response({"error": "order_id parameter required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        order = Order.objects.get(order_id=order_id)
        can_review = order.payment_status == 'paid' and not hasattr(order, 'review')
        
        return Response({
            "can_review": can_review,
            "has_review": hasattr(order, 'review'),
            "payment_status": order.payment_status
        })
        
    except Order.DoesNotExist:
        return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)


# Notification Views
import requests
import json

@api_view(['POST'])
def register_push_token(request):
    """Register user's push notification token"""
    email = request.data.get('email')
    push_token = request.data.get('push_token')
    
    if not email or not push_token:
        return Response({"error": "Email and push_token required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
        profile = user.profile
        profile.push_token = push_token
        profile.save()
        
        return Response({"message": "Push token registered successfully"})
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)


def send_push_notification(push_token, title, body, data=None):
    """Send push notification via Expo Push API"""
    if not push_token or not push_token.startswith('ExponentPushToken'):
        return False
    
    message = {
        "to": push_token,
        "sound": "default",
        "title": title,
        "body": body,
        "data": data or {},
    }
    
    try:
        response = requests.post(
            'https://exp.host/--/api/v2/push/send',
            headers={
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            data=json.dumps(message)
        )
        
        if response.status_code == 200:
            print(f"Notification sent successfully to {push_token[:20]}...")
            return True
        else:
            print(f"Failed to send notification: {response.text}")
            return False
    except Exception as e:
        print(f"Error sending notification: {e}")
        return False


def notify_seller_of_purchase(order):
    """Notify seller when their item is purchased"""
    seller = order.seller
    if hasattr(seller, 'profile') and seller.profile.push_token:
        title = "🎉 Item Sold!"
        body = f"{order.buyer_name} just purchased your {order.item.title} for ₹{order.item_price}"
        data = {
            "type": "purchase",
            "order_id": order.order_id,
            "item_id": order.item.id,
        }
        send_push_notification(seller.profile.push_token, title, body, data)


def notify_buyer_of_confirmation(order):
    """Notify buyer when payment is confirmed"""
    buyer = order.buyer
    if hasattr(buyer, 'profile') and buyer.profile.push_token:
        title = "✅ Order Confirmed!"
        body = f"Your order for {order.item.title} has been confirmed. Order ID: {order.order_id}"
        data = {
            "type": "order_confirmed",
            "order_id": order.order_id,
        }
        send_push_notification(buyer.profile.push_token, title, body, data)


@api_view(['GET'])
def check_notifications(request):
    """Check if user has new notifications (for in-app polling)"""
    email = request.query_params.get('email')
    
    if not email:
        return Response({"error": "Email required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
        
        # Check for new orders as seller (last 1 minute)
        one_minute_ago = timezone.now() - timezone.timedelta(minutes=1)
        new_orders = Order.objects.filter(
            seller=user,
            created_at__gte=one_minute_ago,
            payment_status='paid'
        ).first()
        
        if new_orders:
            return Response({
                "has_new": True,
                "title": "🎉 Item Sold!",
                "message": f"{new_orders.buyer_name} just purchased your {new_orders.item.title} for ₹{new_orders.item_price}"
            })
        
        return Response({"has_new": False})
        
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)


# Revenue Analytics API for App Creator
@api_view(['GET'])
def revenue_analytics(request):
    """
    Get revenue analytics for app creator dashboard
    Usage: GET /api/revenue-analytics/
    """
    try:
        summary = RevenueAnalytics.get_revenue_summary()
        
        return Response({
            'success': True,
            'data': {
                'all_time': {
                    'total_orders': summary['all_time']['total_orders'],
                    'total_sales': float(summary['all_time']['total_sales']),
                    'platform_commission': float(summary['all_time']['platform_commission']),
                },
                'today': {
                    'total_orders': summary['today']['total_orders'],
                    'total_sales': float(summary['today']['total_sales']),
                    'platform_commission': float(summary['today']['platform_commission']),
                },
                'this_month': {
                    'total_orders': summary['this_month']['total_orders'],
                    'total_sales': float(summary['this_month']['total_sales']),
                    'platform_commission': float(summary['this_month']['platform_commission']),
                },
                'payment_methods': {
                    'online': {
                        'orders': summary['payment_methods']['online']['orders'],
                        'revenue': float(summary['payment_methods']['online']['revenue']),
                    },
                    'cod': {
                        'orders': summary['payment_methods']['cod']['orders'],
                        'revenue': float(summary['payment_methods']['cod']['revenue']),
                    }
                },
                'top_sellers': [
                    {
                        'username': seller['seller__username'],
                        'email': seller['seller__email'],
                        'total_earnings': float(seller['total_earnings']),
                        'total_orders': seller['total_orders']
                    }
                    for seller in summary['top_sellers']
                ],
                'pending_payouts': [
                    {
                        'username': payout['seller__username'],
                        'email': payout['seller__email'],
                        'pending_amount': float(payout['pending_amount']),
                        'order_count': payout['order_count']
                    }
                    for payout in summary['pending_payouts']
                ]
            }
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def daily_revenue(request):
    """
    Get daily revenue breakdown
    Usage: GET /api/daily-revenue/?date=2024-01-15
    """
    try:
        date_str = request.GET.get('date')
        if date_str:
            from datetime import datetime
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        else:
            date = None
            
        revenue = RevenueAnalytics.get_daily_revenue(date)
        
        return Response({
            'success': True,
            'data': {
                'date': revenue['date'].strftime('%Y-%m-%d'),
                'total_orders': revenue['total_orders'],
                'total_sales': float(revenue['total_sales']),
                'platform_commission': float(revenue['platform_commission']),
                'seller_earnings': float(revenue['seller_earnings']),
            }
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
# Comprehensive Admin Dashboard API
@api_view(['GET'])
def admin_dashboard(request):
    """
    Complete admin dashboard with all financial data
    Usage: GET /api/admin-dashboard/
    """
    try:
        from .payout_system import RazorpayPayoutSystem
        
        # Revenue Analytics
        revenue_summary = RevenueAnalytics.get_revenue_summary()
        
        # Payout Analytics
        pending_payouts = Order.objects.filter(
            payment_status='paid',
            order_status='delivered',
            payout_status='pending'
        )
        
        processing_payouts = Order.objects.filter(payout_status='processing')
        completed_payouts = Order.objects.filter(payout_status='completed')
        
        # Seller Analytics
        active_sellers = UserProfile.objects.filter(payout_enabled=True).count()
        total_sellers = UserProfile.objects.count()
        
        # Platform Analytics
        platform_settings = PlatformSettings.get_settings()
        
        return Response({
            'success': True,
            'data': {
                # Revenue Section
                'revenue': {
                    'all_time': {
                        'total_orders': revenue_summary['all_time']['total_orders'],
                        'total_sales': float(revenue_summary['all_time']['total_sales']),
                        'platform_commission': float(revenue_summary['all_time']['platform_commission']),
                    },
                    'today': {
                        'total_orders': revenue_summary['today']['total_orders'],
                        'total_sales': float(revenue_summary['today']['total_sales']),
                        'platform_commission': float(revenue_summary['today']['platform_commission']),
                    },
                    'this_month': {
                        'total_orders': revenue_summary['this_month']['total_orders'],
                        'total_sales': float(revenue_summary['this_month']['total_sales']),
                        'platform_commission': float(revenue_summary['this_month']['platform_commission']),
                    }
                },
                
                # Payout Section
                'payouts': {
                    'pending': {
                        'count': pending_payouts.count(),
                        'total_amount': float(pending_payouts.aggregate(
                            total=models.Sum('seller_earnings')
                        )['total'] or 0)
                    },
                    'processing': {
                        'count': processing_payouts.count(),
                        'total_amount': float(processing_payouts.aggregate(
                            total=models.Sum('seller_earnings')
                        )['total'] or 0)
                    },
                    'completed': {
                        'count': completed_payouts.count(),
                        'total_amount': float(completed_payouts.aggregate(
                            total=models.Sum('seller_earnings')
                        )['total'] or 0)
                    }
                },
                
                # Seller Section
                'sellers': {
                    'total_sellers': total_sellers,
                    'active_sellers': active_sellers,
                    'payout_enabled_percentage': round((active_sellers / total_sellers * 100) if total_sellers > 0 else 0, 1),
                    'top_earners': [
                        {
                            'username': seller['seller__username'],
                            'email': seller['seller__email'],
                            'total_earnings': float(seller['total_earnings']),
                            'total_orders': seller['total_orders']
                        }
                        for seller in revenue_summary['top_sellers']
                    ]
                },
                
                # Platform Settings
                'platform': {
                    'commission_rate': float(platform_settings.commission_rate),
                    'cod_commission_rate': float(platform_settings.cod_commission_rate),
                    'min_order_value': float(platform_settings.min_order_value)
                },
                
                # Payment Methods Breakdown
                'payment_methods': revenue_summary['payment_methods']
            }
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def process_all_payouts(request):
    """
    Process all pending payouts
    Usage: POST /api/process-payouts/
    """
    try:
        from .payout_system import process_all_payouts
        
        result = process_all_payouts()
        
        return Response({
            'success': True,
            'data': {
                'total_processed': result['total_processed'],
                'successful': result['successful'],
                'failed': result['failed'],
                'message': f"Processed {result['successful']} out of {result['total_processed']} payouts successfully"
            }
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def seller_earnings(request):
    """
    Get detailed seller earnings
    Usage: GET /api/seller-earnings/
    """
    try:
        sellers = UserProfile.objects.select_related('user').annotate(
            total_orders=models.Count('user__sales', filter=models.Q(user__sales__payment_status='paid')),
            monthly_earnings=models.Sum(
                'user__sales__seller_earnings',
                filter=models.Q(
                    user__sales__payment_status='paid',
                    user__sales__created_at__month=timezone.now().month
                )
            )
        ).order_by('-total_earnings')
        
        seller_data = []
        for seller in sellers:
            if seller.total_earnings > 0:  # Only include sellers with earnings
                seller_data.append({
                    'id': seller.user.id,
                    'username': seller.user.username,
                    'email': seller.user.email,
                    'phone': seller.phone_number,
                    'total_earnings': float(seller.total_earnings),
                    'total_paid_out': float(seller.total_paid_out),
                    'pending_payout': float(seller.pending_payout),
                    'monthly_earnings': float(seller.monthly_earnings or 0),
                    'total_orders': seller.total_orders,
                    'payout_enabled': seller.payout_enabled,
                    'payment_method': 'UPI' if seller.upi_id else 'Bank Account' if seller.account_number else 'Not Set'
                })
        
        return Response({
            'success': True,
            'data': seller_data
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
# Admin Dashboard Web View
from django.shortcuts import render

def admin_dashboard_view(request):
    """
    Serve the admin dashboard HTML page
    Usage: GET /admin-dashboard/
    """
    return render(request, 'admin_dashboard.html')

@api_view(['GET'])
def seller_earnings_detailed(request):
    """
    Get detailed seller earnings with individual sales
    Usage: GET /api/seller/earnings/?email=seller@example.com
    """
    try:
        email = request.GET.get('email')
        if not email:
            return Response({
                'success': False,
                'error': 'Email parameter is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
            user_profile = user.profile
        except User.DoesNotExist:
            return Response({
                'success': False,
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)

        # Get all orders where this user is the seller
        seller_orders = Order.objects.filter(
            seller=user,
            payment_status='paid'
        ).select_related('item', 'buyer').order_by('-created_at')

        # Calculate summary
        total_earnings = seller_orders.aggregate(
            total=models.Sum('seller_earnings')
        )['total'] or 0

        total_paid_out = seller_orders.filter(
            payout_status='completed'
        ).aggregate(
            total=models.Sum('seller_earnings')
        )['total'] or 0

        pending_payout = seller_orders.filter(
            payout_status='pending'
        ).aggregate(
            total=models.Sum('seller_earnings')
        )['total'] or 0

        this_month_earnings = seller_orders.filter(
            created_at__month=timezone.now().month,
            created_at__year=timezone.now().year
        ).aggregate(
            total=models.Sum('seller_earnings')
        )['total'] or 0

        # Prepare earnings data
        earnings_data = []
        for order in seller_orders:
            earnings_data.append({
                'id': order.id,
                'order_id': order.order_id,
                'item_title': order.item.title,
                'item_image': order.item.image.url if order.item.image else None,
                'item_price': float(order.item_price),
                'seller_earnings': float(order.seller_earnings),
                'platform_commission': float(order.platform_commission),
                'buyer_name': order.buyer_name,
                'payment_method': order.payment_method,
                'payment_status': order.payment_status,
                'payout_status': order.payout_status,
                'created_at': order.created_at.isoformat(),
                'paid_at': order.paid_at.isoformat() if order.paid_at else None,
            })

        return Response({
            'success': True,
            'summary': {
                'total_earnings': float(total_earnings),
                'total_paid_out': float(total_paid_out),
                'pending_payout': float(pending_payout),
                'total_orders': seller_orders.count(),
                'this_month_earnings': float(this_month_earnings),
            },
            'earnings': earnings_data
        })

    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)