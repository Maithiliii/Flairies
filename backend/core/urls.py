from django.urls import path
from . import views

urlpatterns = [
    path('signup/', views.SignupView.as_view(), name='signup'),  
    path('login/', views.login_view, name='login'),
    path('items/create/', views.create_item, name='create_item'),
    path('items/', views.list_items, name='list_items'),
    path('items/user/', views.user_items, name='user_items'),
    path('profile/picture/', views.update_profile_picture, name='update_profile_picture'),
    path('profile/address/', views.profile_address, name='profile_address'),
    path('items/fix-inactive/', views.fix_inactive_items, name='fix_inactive_items'),
    path('profile/bank-details/', views.bank_details, name='bank_details'),
    path('orders/create/', views.create_order, name='create_order'),
    path('orders/user/', views.user_orders, name='user_orders'),
    path('seller/earnings/', views.seller_earnings, name='seller_earnings'),
    path('settings/', views.platform_settings, name='platform_settings'),
    
    # Chat endpoints
    path('conversations/', views.conversation_list, name='conversation_list'),
    path('conversations/<int:conversation_id>/messages/', views.conversation_messages, name='conversation_messages'),
    path('messages/send/', views.send_message, name='send_message'),
    
    # Payment update
    path('orders/update-payment/', views.update_payment_status, name='update_payment_status'),
    
    # Reviews
    path('reviews/create/', views.create_review, name='create_review'),
    path('reviews/seller/', views.seller_reviews, name='seller_reviews'),
    path('reviews/can-review/', views.order_can_review, name='order_can_review'),
    
    # Notifications
    path('notifications/register/', views.register_push_token, name='register_push_token'),
    path('notifications/check/', views.check_notifications, name='check_notifications'),
    
    # Admin Dashboard APIs
    path('admin-dashboard/', views.admin_dashboard, name='admin_dashboard_api'),
    path('revenue-analytics/', views.revenue_analytics, name='revenue_analytics'),
    path('daily-revenue/', views.daily_revenue, name='daily_revenue'),
    path('process-payouts/', views.process_all_payouts, name='process_payouts'),
    path('seller-earnings/', views.seller_earnings, name='seller_earnings_api'),
    
    # Seller Earnings Detail
    path('seller/earnings/', views.seller_earnings_detailed, name='seller_earnings_detailed'),
]
