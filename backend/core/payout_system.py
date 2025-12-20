# Automatic Payout System for Sellers
import requests
import json
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from .models import Order, UserProfile
import os

class RazorpayPayoutSystem:
    """Handles automatic payouts to sellers using Razorpay Payouts API"""
    
    def __init__(self):
        # Use environment variables for Razorpay credentials
        self.key_id = os.getenv('RAZORPAY_KEY_ID')
        self.key_secret = os.getenv('RAZORPAY_KEY_SECRET')
        self.base_url = "https://api.razorpay.com/v1"
        
    def create_contact(self, seller_profile):
        """Create a contact in Razorpay for the seller"""
        try:
            url = f"{self.base_url}/contacts"
            
            data = {
                "name": seller_profile.account_holder_name or seller_profile.user.get_full_name() or seller_profile.user.username,
                "email": seller_profile.user.email,
                "contact": seller_profile.phone_number,
                "type": "vendor",
                "reference_id": f"seller_{seller_profile.user.id}"
            }
            
            response = requests.post(
                url,
                auth=(self.key_id, self.key_secret),
                headers={'Content-Type': 'application/json'},
                data=json.dumps(data)
            )
            
            if response.status_code == 200:
                contact_data = response.json()
                seller_profile.razorpay_contact_id = contact_data['id']
                seller_profile.save()
                return contact_data['id']
            else:
                print(f"Failed to create contact: {response.text}")
                return None
                
        except Exception as e:
            print(f"Error creating contact: {str(e)}")
            return None
    
    def create_fund_account(self, contact_id, seller_profile):
        """Create a fund account for the seller"""
        try:
            url = f"{self.base_url}/fund_accounts"
            
            # Prefer UPI if available, otherwise use bank account
            if seller_profile.upi_id:
                account_data = {
                    "account_type": "vpa",
                    "vpa": {
                        "address": seller_profile.upi_id
                    }
                }
            elif seller_profile.account_number and seller_profile.ifsc_code:
                account_data = {
                    "account_type": "bank_account",
                    "bank_account": {
                        "name": seller_profile.account_holder_name,
                        "account_number": seller_profile.account_number,
                        "ifsc": seller_profile.ifsc_code
                    }
                }
            else:
                print("No valid payment method found for seller")
                return None
            
            data = {
                "contact_id": contact_id,
                **account_data
            }
            
            response = requests.post(
                url,
                auth=(self.key_id, self.key_secret),
                headers={'Content-Type': 'application/json'},
                data=json.dumps(data)
            )
            
            if response.status_code == 200:
                return response.json()['id']
            else:
                print(f"Failed to create fund account: {response.text}")
                return None
                
        except Exception as e:
            print(f"Error creating fund account: {str(e)}")
            return None
    
    def process_payout(self, order):
        """Process payout for a specific order"""
        try:
            seller_profile = order.seller.profile
            
            # Create contact if not exists
            if not seller_profile.razorpay_contact_id:
                contact_id = self.create_contact(seller_profile)
                if not contact_id:
                    return False
            else:
                contact_id = seller_profile.razorpay_contact_id
            
            # Create fund account
            fund_account_id = self.create_fund_account(contact_id, seller_profile)
            if not fund_account_id:
                return False
            
            # Create payout
            url = f"{self.base_url}/payouts"
            
            data = {
                "fund_account_id": fund_account_id,
                "amount": int(order.seller_earnings * 100),  # Amount in paise
                "currency": "INR",
                "mode": "UPI" if seller_profile.upi_id else "NEFT",
                "purpose": "payout",
                "queue_if_low_balance": True,
                "reference_id": f"order_{order.order_id}",
                "narration": f"Payment for order {order.order_id}"
            }
            
            response = requests.post(
                url,
                auth=(self.key_id, self.key_secret),
                headers={'Content-Type': 'application/json'},
                data=json.dumps(data)
            )
            
            if response.status_code == 200:
                payout_data = response.json()
                
                # Update order status
                order.payout_status = 'processing'
                order.razorpay_payout_id = payout_data['id']
                order.save()
                
                # Update seller profile
                seller_profile.pending_payout -= order.seller_earnings
                seller_profile.total_paid_out += order.seller_earnings
                seller_profile.save()
                
                print(f"Payout initiated for order {order.order_id}: ₹{order.seller_earnings}")
                return True
            else:
                print(f"Failed to create payout: {response.text}")
                order.payout_status = 'failed'
                order.save()
                return False
                
        except Exception as e:
            print(f"Error processing payout: {str(e)}")
            order.payout_status = 'failed'
            order.save()
            return False
    
    def process_all_pending_payouts(self):
        """Process all pending payouts for delivered orders"""
        pending_orders = Order.objects.filter(
            payment_status='paid',
            order_status='delivered',
            payout_status='pending'
        )
        
        success_count = 0
        total_count = pending_orders.count()
        
        for order in pending_orders:
            if self.process_payout(order):
                success_count += 1
        
        return {
            'total_processed': total_count,
            'successful': success_count,
            'failed': total_count - success_count
        }
    
    def check_payout_status(self, payout_id):
        """Check the status of a payout"""
        try:
            url = f"{self.base_url}/payouts/{payout_id}"
            
            response = requests.get(
                url,
                auth=(self.key_id, self.key_secret)
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Failed to check payout status: {response.text}")
                return None
                
        except Exception as e:
            print(f"Error checking payout status: {str(e)}")
            return None


# Helper functions for easy use
def setup_seller_for_payouts(seller_profile):
    """Setup a seller for automatic payouts"""
    payout_system = RazorpayPayoutSystem()
    
    # Validate seller has payment details
    if not (seller_profile.upi_id or (seller_profile.account_number and seller_profile.ifsc_code)):
        return False, "Seller must add UPI ID or bank account details"
    
    # Create contact in Razorpay
    contact_id = payout_system.create_contact(seller_profile)
    if contact_id:
        seller_profile.payout_enabled = True
        seller_profile.save()
        return True, "Seller setup for automatic payouts"
    else:
        return False, "Failed to setup seller in Razorpay"

def process_order_payout(order):
    """Process payout for a single order"""
    payout_system = RazorpayPayoutSystem()
    return payout_system.process_payout(order)

def process_all_payouts():
    """Process all pending payouts"""
    payout_system = RazorpayPayoutSystem()
    return payout_system.process_all_pending_payouts()

# Usage examples:
"""
# Setup seller for payouts
seller_profile = UserProfile.objects.get(user__email='seller@example.com')
success, message = setup_seller_for_payouts(seller_profile)

# Process single order payout
order = Order.objects.get(order_id='ORD123')
success = process_order_payout(order)

# Process all pending payouts
result = process_all_payouts()
print(f"Processed {result['successful']} out of {result['total_processed']} payouts")
"""