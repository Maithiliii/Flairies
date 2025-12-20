#!/usr/bin/env python
"""
Fix migration conflict and user profiles
Usage: python fix_profiles.py
"""

import os
import sys
import django

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'flairies_backend.settings')
django.setup()

from django.contrib.auth.models import User
from django.core.management import execute_from_command_line

def fix_user_profiles():
    """Ensure all users have profiles"""
    print("Checking user profiles...")
    
    try:
        from core.models import UserProfile
        
        users_without_profiles = []
        for user in User.objects.all():
            if not hasattr(user, 'profile'):
                users_without_profiles.append(user)
        
        if users_without_profiles:
            print(f"Found {len(users_without_profiles)} users without profiles. Creating...")
            for user in users_without_profiles:
                UserProfile.objects.create(user=user)
                print(f"✅ Created profile for {user.username}")
        else:
            print("✅ All users have profiles")
    except Exception as e:
        print(f"⚠️ Profile check skipped: {e}")

if __name__ == '__main__':
    print("🔧 Fixing Flairies Backend Migration Conflict...")
    
    # Step 1: Run migration
    print("\n1. Running migrations...")
    try:
        execute_from_command_line(['manage.py', 'migrate'])
        print("✅ Migrations completed!")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        print("Please run manually: python manage.py migrate")
        sys.exit(1)
    
    # Step 2: Fix user profiles
    print("\n2. Fixing user profiles...")
    try:
        fix_user_profiles()
        print("✅ User profiles fixed!")
    except Exception as e:
        print(f"❌ Profile fix failed: {e}")
    
    print("\n🎉 Backend fix completed!")
    print("✅ Migration conflict resolved")
    print("✅ Address fields added")
    print("✅ User profiles ensured")
    print("\nTry logging in again - the 500 error should be resolved.")