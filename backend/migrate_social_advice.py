#!/usr/bin/env python3
"""
Migration script to add social_advice column to tasks table
Run this script to update existing database schema
"""

import sqlite3
import os

def migrate_social_advice():
    """Add social_advice column to tasks table if it doesn't exist"""
    
    # Database path
    db_path = "app/data/sqlite_database.db"
    
    if not os.path.exists(db_path):
        print(f"Database file not found at {db_path}")
        return
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if social_advice column already exists
        cursor.execute("PRAGMA table_info(tasks)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'social_advice' in columns:
            print("✅ social_advice column already exists in tasks table")
        else:
            # Add social_advice column
            cursor.execute("""
                ALTER TABLE tasks 
                ADD COLUMN social_advice TEXT
            """)
            
            conn.commit()
            print("✅ Successfully added social_advice column to tasks table")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")

if __name__ == "__main__":
    migrate_social_advice()