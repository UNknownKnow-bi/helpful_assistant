#!/usr/bin/env python3
"""
Migration script to add extended fields to work_relationships table.
This script safely adds the new columns to support expanded colleague information.
"""

import sqlite3
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_work_relationships():
    """Add new columns to work_relationships table for expanded colleague info"""
    
    db_path = "app/data/sqlite_database.db"
    
    if not os.path.exists(db_path):
        logger.error(f"Database file not found: {db_path}")
        return False
        
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(work_relationships)")
        columns = [col[1] for col in cursor.fetchall()]
        logger.info(f"Existing columns: {columns}")
        
        # Add new columns if they don't exist
        new_columns = [
            ("work_nickname", "VARCHAR(100)"),
            ("job_type", "VARCHAR(200)"),  
            ("job_level", "VARCHAR(20)"),
            ("personality_openness", "JSON DEFAULT '[]'"),
            ("personality_conscientiousness", "JSON DEFAULT '[]'"),
            ("personality_extraversion", "JSON DEFAULT '[]'"),
            ("personality_agreeableness", "JSON DEFAULT '[]'"),
            ("personality_neuroticism", "JSON DEFAULT '[]'"),
            ("updated_at", "DATETIME")  # SQLite can't add columns with non-constant defaults
        ]
        
        for column_name, column_type in new_columns:
            if column_name not in columns:
                try:
                    cursor.execute(f"ALTER TABLE work_relationships ADD COLUMN {column_name} {column_type}")
                    logger.info(f"✅ Added column: {column_name}")
                except sqlite3.Error as e:
                    if "duplicate column name" in str(e).lower():
                        logger.info(f"⏩ Column {column_name} already exists")
                    else:
                        logger.error(f"❌ Error adding column {column_name}: {e}")
                        raise
            else:
                logger.info(f"⏩ Column {column_name} already exists")
        
        # Update existing records to have empty JSON arrays for personality fields
        personality_updates = [
            ("personality_openness", "[]"),
            ("personality_conscientiousness", "[]"),
            ("personality_extraversion", "[]"),
            ("personality_agreeableness", "[]"),
            ("personality_neuroticism", "[]")
        ]
        
        for field, default_value in personality_updates:
            if field in [col[0] for col in new_columns]:
                try:
                    cursor.execute(f"UPDATE work_relationships SET {field} = ? WHERE {field} IS NULL", (default_value,))
                    updated_count = cursor.rowcount
                    if updated_count > 0:
                        logger.info(f"✅ Updated {updated_count} records for {field}")
                except sqlite3.Error as e:
                    logger.error(f"❌ Error updating {field}: {e}")
        
        # Set updated_at to created_at for existing records that don't have updated_at
        if "updated_at" in [col[0] for col in new_columns]:
            try:
                cursor.execute("UPDATE work_relationships SET updated_at = created_at WHERE updated_at IS NULL")
                updated_count = cursor.rowcount
                if updated_count > 0:
                    logger.info(f"✅ Updated {updated_count} records for updated_at")
            except sqlite3.Error as e:
                logger.error(f"❌ Error updating updated_at: {e}")
        
        # Commit changes
        conn.commit()
        logger.info("✅ Migration completed successfully!")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        if conn:
            conn.rollback()
        return False
        
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    logger.info("🚀 Starting work relationships migration...")
    success = migrate_work_relationships()
    
    if success:
        logger.info("🎉 Migration completed successfully!")
        exit(0)
    else:
        logger.error("💥 Migration failed!")
        exit(1)