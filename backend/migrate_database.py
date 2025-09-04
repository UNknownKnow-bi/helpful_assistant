#!/usr/bin/env python3
"""
Database migration script to add execution_procedures column to tasks table
"""

import sqlite3
import sys
import os
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def migrate_database():
    """Add execution_procedures column to tasks table"""
    db_path = backend_dir / "app" / "data" / "sqlite_database.db"
    
    if not db_path.exists():
        print(f"❌ Database not found at {db_path}")
        return False
    
    try:
        # Connect to database
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(tasks)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'execution_procedures' in columns:
            print("✅ Column 'execution_procedures' already exists in tasks table")
            conn.close()
            return True
        
        print("📝 Adding 'execution_procedures' column to tasks table...")
        
        # Add the new column (SQLite doesn't support adding JSON columns directly, so we use TEXT)
        cursor.execute("""
            ALTER TABLE tasks ADD COLUMN execution_procedures TEXT DEFAULT NULL
        """)
        
        # Commit the changes
        conn.commit()
        
        # Verify the column was added
        cursor.execute("PRAGMA table_info(tasks)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'execution_procedures' in columns:
            print("✅ Successfully added 'execution_procedures' column to tasks table")
            
            # Show current table schema
            print("\n📋 Updated tasks table schema:")
            cursor.execute("PRAGMA table_info(tasks)")
            for column in cursor.fetchall():
                col_id, name, type_, notnull, default, pk = column
                nullable = "NOT NULL" if notnull else "NULL"
                print(f"  {name}: {type_} ({nullable})")
                
            conn.close()
            return True
        else:
            print("❌ Failed to add column")
            conn.close()
            return False
            
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        if conn:
            conn.close()
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        if conn:
            conn.close()
        return False

if __name__ == "__main__":
    print("🚀 Starting database migration...")
    print("=" * 50)
    
    success = migrate_database()
    
    if success:
        print("=" * 50)
        print("🎉 Migration completed successfully!")
        print("💡 You can now restart the FastAPI server to use the new feature")
    else:
        print("=" * 50)
        print("❌ Migration failed!")
        sys.exit(1)