#!/usr/bin/env python
"""
Run this script to apply the address fields migration
Usage: python run_migration.py
"""

import os
import sys
import django

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'flairies_backend.settings')
django.setup()

from django.core.management import execute_from_command_line

if __name__ == '__main__':
    print("Running migration for address fields...")
    try:
        execute_from_command_line(['manage.py', 'migrate'])
        print("✅ Migration completed successfully!")
    except Exception as e:
        print(f"❌ Migration failed: {e}")