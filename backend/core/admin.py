from django.contrib import admin
from .models import UserProfile, Item, ItemImage, Order, PlatformSettings, Conversation, Message, Review


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'phone_number', 'account_number', 'upi_id', 'total_earnings', 'pending_payout', 'payout_enabled']
    search_fields = ['user__username', 'user__email', 'phone_number']
    list_filter = ['payout_enabled']
    readonly_fields = ['total_earnings', 'total_paid_out', 'pending_payout', 'razorpay_contact_id']


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'listing_type', 'price', 'payment_method', 'is_active', 'created_at']
    list_filter = ['listing_type', 'payment_method', 'is_active', 'condition']
    search_fields = ['title', 'description', 'user__username']


@admin.register(ItemImage)
class ItemImageAdmin(admin.ModelAdmin):
    list_display = ['item', 'order', 'created_at']
    list_filter = ['created_at']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_id', 'buyer', 'seller', 'item', 'item_price', 'platform_commission', 
                    'seller_earnings', 'payment_method', 'payment_status', 'order_status', 'payout_status', 'created_at']
    list_filter = ['payment_method', 'payment_status', 'order_status', 'payout_status', 'created_at']
    search_fields = ['order_id', 'buyer__username', 'seller__username', 'item__title']
    readonly_fields = ['order_id', 'platform_commission', 'seller_earnings', 'created_at', 'updated_at']
    actions = ['process_payouts']
    
    def process_payouts(self, request, queryset):
        """Admin action to process payouts for selected orders"""
        from .payout_system import process_order_payout
        
        processed = 0
        for order in queryset.filter(payment_status='paid', order_status='delivered', payout_status='pending'):
            if process_order_payout(order):
                processed += 1
        
        self.message_user(request, f"Processed {processed} payouts successfully")
    
    process_payouts.short_description = "Process payouts for selected orders"


@admin.register(PlatformSettings)
class PlatformSettingsAdmin(admin.ModelAdmin):
    list_display = ['commission_rate', 'cod_commission_rate', 'min_order_value', 'updated_at']
    
    def has_add_permission(self, request):
        # Only allow one settings instance
        return not PlatformSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Don't allow deletion of settings
        return False



@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['id', 'participant1', 'participant2', 'created_at', 'updated_at']
    search_fields = ['participant1__username', 'participant2__username']
    list_filter = ['created_at', 'updated_at']


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'conversation', 'sender', 'content_preview', 'is_read', 'created_at']
    search_fields = ['sender__username', 'content']
    list_filter = ['is_read', 'created_at']
    
    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content'



@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['id', 'buyer', 'seller', 'rating', 'order', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['buyer__username', 'seller__username', 'review_text']
    readonly_fields = ['created_at']
