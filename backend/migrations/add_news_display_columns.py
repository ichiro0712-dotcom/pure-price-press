"""
Migration: Add news display duration and importance tracking columns to curated_news table.

This migration adds:
- first_seen_at: When the news was first detected
- last_seen_at: When the news was last seen in feeds
- reporting_days: Number of days of continuous reporting
- is_pinned: Whether user pinned this news
- pinned_at: When the news was pinned
- effective_score: Calculated score with boosts and decay

Safe migration using ALTER TABLE ADD COLUMN (existing data preserved).
"""

import sqlite3
import sys
from pathlib import Path
from datetime import datetime


def get_db_path() -> Path:
    """Get the database path."""
    # Check common locations
    possible_paths = [
        Path(__file__).parent.parent / "pure_price_press.db",
        Path(__file__).parent.parent.parent / "pure_price_press.db",
        Path("backend/pure_price_press.db"),
        Path("pure_price_press.db"),
    ]

    for path in possible_paths:
        if path.exists():
            return path

    # Default to backend directory
    return Path(__file__).parent.parent / "pure_price_press.db"


def column_exists(cursor: sqlite3.Cursor, table: str, column: str) -> bool:
    """Check if a column exists in a table."""
    cursor.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in cursor.fetchall()]
    return column in columns


def migrate():
    """Run the migration."""
    db_path = get_db_path()

    if not db_path.exists():
        print(f"Database not found at {db_path}")
        print("Skipping migration - database will be created with new schema on first run")
        return True

    print(f"Running migration on: {db_path}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Define new columns to add
        new_columns = [
            ("first_seen_at", "DATETIME"),
            ("last_seen_at", "DATETIME"),
            ("reporting_days", "INTEGER DEFAULT 1"),
            ("is_pinned", "BOOLEAN DEFAULT 0"),
            ("pinned_at", "DATETIME"),
            ("effective_score", "FLOAT"),
        ]

        # Check if curated_news table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='curated_news'")
        if not cursor.fetchone():
            print("curated_news table does not exist yet. Skipping migration.")
            return True

        added_count = 0
        skipped_count = 0

        for column_name, column_type in new_columns:
            if column_exists(cursor, "curated_news", column_name):
                print(f"  Column '{column_name}' already exists, skipping")
                skipped_count += 1
            else:
                sql = f"ALTER TABLE curated_news ADD COLUMN {column_name} {column_type}"
                cursor.execute(sql)
                print(f"  Added column: {column_name} ({column_type})")
                added_count += 1

        # Set first_seen_at to created_at for existing records (if first_seen_at is NULL)
        cursor.execute("""
            UPDATE curated_news
            SET first_seen_at = created_at
            WHERE first_seen_at IS NULL
        """)
        updated = cursor.rowcount
        if updated > 0:
            print(f"  Set first_seen_at for {updated} existing records")

        # Set last_seen_at to created_at for existing records (if last_seen_at is NULL)
        cursor.execute("""
            UPDATE curated_news
            SET last_seen_at = created_at
            WHERE last_seen_at IS NULL
        """)
        updated = cursor.rowcount
        if updated > 0:
            print(f"  Set last_seen_at for {updated} existing records")

        # Set effective_score to importance_score for existing records (if effective_score is NULL)
        cursor.execute("""
            UPDATE curated_news
            SET effective_score = importance_score
            WHERE effective_score IS NULL
        """)
        updated = cursor.rowcount
        if updated > 0:
            print(f"  Set effective_score for {updated} existing records")

        conn.commit()
        print(f"\nMigration complete: {added_count} columns added, {skipped_count} already existed")
        return True

    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        return False

    finally:
        conn.close()


def rollback():
    """Rollback the migration (for reference - SQLite doesn't support DROP COLUMN easily)."""
    print("Note: SQLite doesn't easily support dropping columns.")
    print("To rollback, restore from backup or recreate the table.")
    print("The added columns are safe to leave in place - they just won't be used.")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        rollback()
    else:
        success = migrate()
        sys.exit(0 if success else 1)
