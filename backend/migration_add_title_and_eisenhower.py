#!/usr/bin/env python3
"""
Migration script to add new fields to tasks table:
- Add title field
- Replace priority with urgency and importance (Eisenhower Matrix)
- Add participant field
- Update existing data with reasonable defaults
"""

import sqlite3
import sys
import os

# Add the backend directory to the path so we can import our models
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def migrate_database():
    """Migrate the SQLite database to the new schema"""
    
    # Connect to the database
    db_path = "data/cortex_assistant.db"
    
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found. Creating new database with updated schema.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("Starting database migration...")
        
        # Check if the new columns already exist
        cursor.execute("PRAGMA table_info(tasks)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Add title column if it doesn't exist
        if 'title' not in columns:
            print("Adding title column...")
            cursor.execute("ALTER TABLE tasks ADD COLUMN title VARCHAR(200)")
            
            # Update existing tasks with generated titles from content
            cursor.execute("""
                UPDATE tasks 
                SET title = CASE 
                    WHEN LENGTH(content) <= 8 THEN content
                    ELSE SUBSTR(content, 1, 7) || '...'
                END
                WHERE title IS NULL OR title = ''
            """)
            
            # Make title NOT NULL after populating
            cursor.execute("UPDATE tasks SET title = '未命名任务' WHERE title IS NULL OR title = ''")
        
        # Add participant column if it doesn't exist
        if 'participant' not in columns:
            print("Adding participant column...")
            cursor.execute("ALTER TABLE tasks ADD COLUMN participant VARCHAR(100) DEFAULT '你'")
            cursor.execute("UPDATE tasks SET participant = '你' WHERE participant IS NULL")
        
        # Add urgency column if it doesn't exist
        if 'urgency' not in columns:
            print("Adding urgency column...")
            cursor.execute("ALTER TABLE tasks ADD COLUMN urgency VARCHAR(20) DEFAULT 'low'")
            
            # Migrate priority to urgency/importance if priority column exists
            if 'priority' in columns:
                print("Migrating priority to urgency...")
                cursor.execute("""
                    UPDATE tasks 
                    SET urgency = CASE 
                        WHEN priority = 'high' THEN 'high'
                        ELSE 'low'
                    END
                """)
        
        # Add importance column if it doesn't exist
        if 'importance' not in columns:
            print("Adding importance column...")
            cursor.execute("ALTER TABLE tasks ADD COLUMN importance VARCHAR(20) DEFAULT 'low'")
            
            # Migrate priority to importance if priority column exists
            if 'priority' in columns:
                print("Migrating priority to importance...")
                cursor.execute("""
                    UPDATE tasks 
                    SET importance = CASE 
                        WHEN priority IN ('medium', 'high') THEN 'high'
                        ELSE 'low'
                    END
                """)
        
        # Update source field to handle 'ai_generated' if needed
        cursor.execute("UPDATE tasks SET source = 'ai_generated' WHERE source = 'ai'")
        
        # Always rebuild the schema to remove old priority column and ensure proper constraints
        if True:  # Force rebuild to ensure proper schema
            print("Removing old priority column...")
            
            # Create a new table with the updated schema
            cursor.execute("""
                CREATE TABLE tasks_new (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    title VARCHAR(200) NOT NULL,
                    content TEXT NOT NULL,
                    deadline DATETIME,
                    assignee VARCHAR(100),
                    participant VARCHAR(100) DEFAULT '你',
                    urgency VARCHAR(20) DEFAULT 'low',
                    importance VARCHAR(20) DEFAULT 'low',
                    difficulty INTEGER DEFAULT 5,
                    source VARCHAR(20) DEFAULT 'manual',
                    status VARCHAR(20) DEFAULT 'pending',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # Copy data from old table to new table
            cursor.execute("""
                INSERT INTO tasks_new (
                    id, user_id, title, content, deadline, assignee, participant, 
                    urgency, importance, difficulty, source, status, created_at, updated_at
                )
                SELECT 
                    id, user_id, title, content, deadline, assignee, participant,
                    urgency, importance, difficulty, source, status, created_at, updated_at
                FROM tasks
            """)
            
            # Drop old table and rename new table
            cursor.execute("DROP TABLE tasks")
            cursor.execute("ALTER TABLE tasks_new RENAME TO tasks")
            
            print("Successfully removed priority column and finalized schema migration.")
        
        # Commit all changes
        conn.commit()
        print("Migration completed successfully!")
        
        # Print current schema for verification
        cursor.execute("PRAGMA table_info(tasks)")
        print("\nCurrent tasks table schema:")
        for column in cursor.fetchall():
            print(f"  {column[1]} {column[2]} {'NOT NULL' if column[3] else 'NULL'}")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()