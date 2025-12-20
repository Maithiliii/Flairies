# Revenue Analytics for App Creator Dashboard
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Order

class RevenueAnalytics:
    """Analytics class for app creator revenue tracking"""
    
    @staticmethod
    def get_daily_revenue(date=None):
        """Get revenue for a specific date (default: today)"""
        if not date:
            date = timezone.now().date()
        
        orders = Order.objects.filter(
            created_at__date=date,
            payment_status='paid'
        )
        
        return {
            'date': date,
            'total_orders': orders.count(),
            'total_sales': orders.aggregate(Sum('item_price'))['item_price__sum'] or 0,
            'platform_commission': orders.aggregate(Sum('platform_commission'))['platform_commission__sum'] or 0,
            'seller_earnings': orders.aggregate(Sum('seller_earnings'))['seller_earnings__sum'] or 0,
        }
    
    @staticmethod
    def get_monthly_revenue(year=None, month=None):
        """Get revenue for a specific month (default: current month)"""
        if not year or not month:
            now = timezone.now()
            year = now.year
            month = now.month
        
        orders = Order.objects.filter(
            created_at__year=year,
            created_at__month=month,
            payment_status='paid'
        )
        
        return {
            'year': year,
            'month': month,
            'total_orders': orders.count(),
            'total_sales': orders.aggregate(Sum('item_price'))['item_price__sum'] or 0,
            'platform_commission': orders.aggregate(Sum('platform_commission'))['platform_commission__sum'] or 0,
            'seller_earnings': orders.aggregate(Sum('seller_earnings'))['seller_earnings__sum'] or 0,
        }
    
    @staticmethod
    def get_top_sellers(limit=10):
        """Get top sellers by earnings"""
        from django.contrib.auth.models import User
        
        top_sellers = Order.objects.filter(
            payment_status='paid'
        ).values(
            'seller__username',
            'seller__email'
        ).annotate(
            total_earnings=Sum('seller_earnings'),
            total_orders=Count('id')
        ).order_by('-total_earnings')[:limit]
        
        return list(top_sellers)
    
    @staticmethod
    def get_payment_method_breakdown():
        """Get breakdown of payment methods"""
        online_orders = Order.objects.filter(
            payment_method='online',
            payment_status='paid'
        ).aggregate(
            count=Count('id'),
            revenue=Sum('platform_commission')
        )
        
        cod_orders = Order.objects.filter(
            payment_method='cod',
            payment_status='paid'
        ).aggregate(
            count=Count('id'),
            revenue=Sum('platform_commission')
        )
        
        return {
            'online': {
                'orders': online_orders['count'] or 0,
                'revenue': online_orders['revenue'] or 0
            },
            'cod': {
                'orders': cod_orders['count'] or 0,
                'revenue': cod_orders['revenue'] or 0
            }
        }
    
    @staticmethod
    def get_pending_payouts():
        """Get sellers who need to be paid"""
        pending_orders = Order.objects.filter(
            payment_status='paid',
            order_status__in=['confirmed', 'shipped', 'delivered']
        ).values(
            'seller__username',
            'seller__email'
        ).annotate(
            pending_amount=Sum('seller_earnings'),
            order_count=Count('id')
        ).order_by('-pending_amount')
        
        return list(pending_orders)
    
    @staticmethod
    def get_revenue_summary():
        """Get overall revenue summary"""
        total_orders = Order.objects.filter(payment_status='paid')
        
        today_revenue = RevenueAnalytics.get_daily_revenue()
        month_revenue = RevenueAnalytics.get_monthly_revenue()
        
        return {
            'all_time': {
                'total_orders': total_orders.count(),
                'total_sales': total_orders.aggregate(Sum('item_price'))['item_price__sum'] or 0,
                'platform_commission': total_orders.aggregate(Sum('platform_commission'))['platform_commission__sum'] or 0,
            },
            'today': today_revenue,
            'this_month': month_revenue,
            'payment_methods': RevenueAnalytics.get_payment_method_breakdown(),
            'top_sellers': RevenueAnalytics.get_top_sellers(5),
            'pending_payouts': RevenueAnalytics.get_pending_payouts()
        }


# Usage examples:
"""
# In Django shell or views:
from core.revenue_analytics import RevenueAnalytics

# Get today's revenue
today = RevenueAnalytics.get_daily_revenue()
print(f"Today's commission: ₹{today['platform_commission']}")

# Get monthly revenue
month = RevenueAnalytics.get_monthly_revenue()
print(f"This month's commission: ₹{month['platform_commission']}")

# Get complete summary
summary = RevenueAnalytics.get_revenue_summary()
print(f"All-time commission: ₹{summary['all_time']['platform_commission']}")

# Get top sellers
top_sellers = RevenueAnalytics.get_top_sellers()
for seller in top_sellers:
    print(f"{seller['seller__username']}: ₹{seller['total_earnings']}")
"""