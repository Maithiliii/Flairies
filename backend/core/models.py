from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone_number = models.CharField(max_length=15, blank=True)
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)
    
    # Bank details for receiving payments
    account_holder_name = models.CharField(max_length=200, blank=True)
    account_number = models.CharField(max_length=50, blank=True)
    ifsc_code = models.CharField(max_length=11, blank=True)
    upi_id = models.CharField(max_length=100, blank=True)
    
    # Payout tracking
    total_earnings = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_paid_out = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    pending_payout = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    razorpay_contact_id = models.CharField(max_length=100, blank=True, null=True)  # For Razorpay Payouts
    payout_enabled = models.BooleanField(default=False)
    
    # Push notification token
    push_token = models.CharField(max_length=255, blank=True, null=True)
    
    # Address fields
    address = models.TextField(blank=True, null=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)

    def __str__(self):
        return self.user.username


class Item(models.Model):
    LISTING_TYPE_CHOICES = [
        ('sell', 'Sell'),
        ('rent', 'Rent'),
        ('sell_accessories', 'Sell Accessories'),
        ('donate', 'Donate'),
    ]
    
    CONDITION_CHOICES = [
        ('new', 'New'),
        ('like_new', 'Like New'),
        ('good', 'Good'),
        ('used', 'Used'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('online', 'Online Payment'),
        ('cod', 'Cash on Delivery'),
        ('both', 'Both'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='items')
    listing_type = models.CharField(max_length=20, choices=LISTING_TYPE_CHOICES)
    
    # Common fields
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='items/', null=True, blank=True)
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES)
    
    # Category and size
    category = models.CharField(max_length=100)
    custom_category = models.CharField(max_length=100, blank=True)
    size = models.CharField(max_length=50, blank=True)
    custom_size = models.CharField(max_length=50, blank=True)
    
    # Pricing
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    rent_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    deposit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Payment method
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES, default='both')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    is_claimed = models.BooleanField(default=False)  # For donations
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.get_listing_type_display()}"
    
    def get_display_category(self):
        """Return custom category if set, otherwise return category"""
        return self.custom_category if self.custom_category else self.category
    
    def get_display_size(self):
        """Return custom size if set, otherwise return size"""
        return self.custom_size if self.custom_size else self.size


class ItemImage(models.Model):
    """Additional images for an item"""
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='additional_images')
    image = models.ImageField(upload_to='items/')
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['order', 'created_at']
    
    def __str__(self):
        return f"Image for {self.item.title}"


class Order(models.Model):
    """Order/Transaction model"""
    ORDER_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    # Order details
    order_id = models.CharField(max_length=100, unique=True)
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='purchases')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sales')
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='orders')
    
    # Pricing
    item_price = models.DecimalField(max_digits=10, decimal_places=2)
    platform_commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)  # Percentage
    platform_commission = models.DecimalField(max_digits=10, decimal_places=2)
    seller_earnings = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Payment details
    payment_method = models.CharField(max_length=10, choices=[('online', 'Online'), ('cod', 'COD')])
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    razorpay_order_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=200, blank=True, null=True)
    
    # Order status
    order_status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default='pending')
    
    # Payout status
    PAYOUT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    payout_status = models.CharField(max_length=20, choices=PAYOUT_STATUS_CHOICES, default='pending')
    razorpay_payout_id = models.CharField(max_length=100, blank=True, null=True)
    
    # Delivery details
    buyer_name = models.CharField(max_length=200)
    buyer_phone = models.CharField(max_length=15)
    delivery_address = models.TextField()
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Order {self.order_id} - {self.item.title}"
    
    def calculate_commission(self):
        """Calculate platform commission and seller earnings"""
        if self.payment_method == 'cod':
            # No commission for COD (or set to 0)
            self.platform_commission = 0
            self.seller_earnings = self.item_price
        else:
            # Calculate commission for online payments
            commission = (self.item_price * self.platform_commission_rate) / 100
            self.platform_commission = commission
            self.seller_earnings = self.item_price - commission
    
    def save(self, *args, **kwargs):
        # Auto-calculate commission before saving
        if not self.platform_commission:
            self.calculate_commission()
        super().save(*args, **kwargs)


class PlatformSettings(models.Model):
    """Platform-wide settings"""
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=15.00, help_text="Commission percentage for online payments")
    cod_commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, help_text="Commission percentage for COD (0 = no commission)")
    min_order_value = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Platform Settings"
        verbose_name_plural = "Platform Settings"
    
    def __str__(self):
        return f"Commission: {self.commission_rate}% (Online), {self.cod_commission_rate}% (COD)"
    
    @classmethod
    def get_settings(cls):
        """Get or create platform settings"""
        settings, created = cls.objects.get_or_create(pk=1)
        return settings


class Conversation(models.Model):
    """Conversation between two users"""
    participant1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations_as_participant1')
    participant2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations_as_participant2')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['participant1', 'participant2']
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"Conversation between {self.participant1.username} and {self.participant2.username}"
    
    def get_other_participant(self, user):
        """Get the other participant in the conversation"""
        return self.participant2 if self.participant1 == user else self.participant1


class Message(models.Model):
    """Individual message in a conversation"""
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Message from {self.sender.username} at {self.created_at}"


class Review(models.Model):
    """Review/Rating for a seller after order completion"""
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='review')
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_given')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_received')
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])  # 1-5 stars
    review_text = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.buyer.username} rated {self.seller.username} - {self.rating} stars"
