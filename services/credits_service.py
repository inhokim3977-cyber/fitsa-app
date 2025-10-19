import sqlite3
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Tuple

class CreditsService:
    def __init__(self, db_path='credits.db'):
        self.db_path = db_path
        self._init_db()
    
    def _init_db(self):
        """Initialize database schema"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_key TEXT PRIMARY KEY,
                free_used_today INTEGER DEFAULT 0,
                credits INTEGER DEFAULT 0,
                last_reset TEXT DEFAULT CURRENT_TIMESTAMP,
                last_request_hash TEXT DEFAULT NULL
            )
        ''')
        
        # Add column if it doesn't exist (for migration)
        try:
            c.execute('ALTER TABLE users ADD COLUMN last_request_hash TEXT DEFAULT NULL')
            print("Added last_request_hash column to database")
        except sqlite3.OperationalError:
            pass  # Column already exists
        
        conn.commit()
        conn.close()
    
    def get_user_key(self, ip: str, user_agent: str) -> str:
        """Generate unique user key from IP + User Agent"""
        combined = f"{ip}:{user_agent}"
        return hashlib.sha256(combined.encode()).hexdigest()[:16]
    
    def calculate_request_hash(self, user_photo_bytes: bytes, clothing_photo_bytes: bytes) -> str:
        """Calculate hash of the photos to detect refitting with same images"""
        combined = user_photo_bytes + clothing_photo_bytes
        return hashlib.sha256(combined).hexdigest()
    
    def _reset_daily_if_needed(self, conn, user_key: str):
        """Reset free_used_today if last_reset was yesterday or earlier"""
        c = conn.cursor()
        c.execute('SELECT last_reset FROM users WHERE user_key = ?', (user_key,))
        result = c.fetchone()
        
        if result:
            last_reset = datetime.fromisoformat(result[0])
            now = datetime.now()
            
            # If last reset was on a different day, reset counter
            if last_reset.date() < now.date():
                c.execute(
                    'UPDATE users SET free_used_today = 0, last_reset = ? WHERE user_key = ?',
                    (now.isoformat(), user_key)
                )
                conn.commit()
                print(f"Daily reset applied for user {user_key}")
    
    def check_and_consume(self, ip: str, user_agent: str, request_hash: Optional[str] = None) -> Tuple[bool, dict]:
        """
        Check if user can make a try-on and consume 1 credit/free attempt
        If request_hash matches last request, it's a refitting (no charge)
        
        Args:
            ip: User IP address
            user_agent: User agent string
            request_hash: Hash of the photos (for refitting detection)
        
        Returns:
            (allowed: bool, info: dict)
            - allowed: True if user can proceed
            - info: {remaining_free: int, credits: int, needs_payment: bool, is_refitting: bool}
        """
        user_key = self.get_user_key(ip, user_agent)
        conn = sqlite3.connect(self.db_path)
        
        try:
            self._reset_daily_if_needed(conn, user_key)
            
            c = conn.cursor()
            
            # Get or create user
            c.execute('SELECT free_used_today, credits, last_request_hash FROM users WHERE user_key = ?', (user_key,))
            result = c.fetchone()
            
            if not result:
                # New user - create with 0 usage
                c.execute(
                    'INSERT INTO users (user_key, free_used_today, credits, last_request_hash) VALUES (?, 0, 0, ?)',
                    (user_key, request_hash)
                )
                conn.commit()
                free_used = 0
                credits = 0
                last_hash = None
            else:
                free_used, credits, last_hash = result
            
            # Check if this is a refitting (same photos as last request)
            is_refitting = (request_hash is not None and request_hash == last_hash)
            
            if is_refitting:
                # Refitting - no charge, just return current status
                print(f"Refitting detected for user {user_key} - no charge")
                remaining_free = max(0, 3 - free_used)
                return True, {
                    'remaining_free': remaining_free,
                    'credits': credits,
                    'needs_payment': False,
                    'is_refitting': True,
                    'used_type': 'refitting'
                }
            
            # Update last request hash for future refitting detection
            if request_hash:
                c.execute(
                    'UPDATE users SET last_request_hash = ? WHERE user_key = ?',
                    (request_hash, user_key)
                )
            
            # Check if can proceed
            remaining_free = max(0, 3 - free_used)
            
            # Try to use free attempt first
            if free_used < 3:
                c.execute(
                    'UPDATE users SET free_used_today = free_used_today + 1 WHERE user_key = ?',
                    (user_key,)
                )
                conn.commit()
                return True, {
                    'remaining_free': remaining_free - 1,
                    'credits': credits,
                    'needs_payment': False,
                    'is_refitting': False,
                    'used_type': 'free'
                }
            
            # Check paid credits
            if credits > 0:
                c.execute(
                    'UPDATE users SET credits = credits - 1 WHERE user_key = ?',
                    (user_key,)
                )
                conn.commit()
                return True, {
                    'remaining_free': 0,
                    'credits': credits - 1,
                    'needs_payment': False,
                    'is_refitting': False,
                    'used_type': 'credit'
                }
            
            # No free or paid credits left
            return False, {
                'remaining_free': 0,
                'credits': 0,
                'needs_payment': True,
                'is_refitting': False
            }
        
        finally:
            conn.close()
    
    def get_user_status(self, ip: str, user_agent: str) -> dict:
        """Get user's current credit status without consuming"""
        user_key = self.get_user_key(ip, user_agent)
        conn = sqlite3.connect(self.db_path)
        
        try:
            self._reset_daily_if_needed(conn, user_key)
            
            c = conn.cursor()
            c.execute('SELECT free_used_today, credits FROM users WHERE user_key = ?', (user_key,))
            result = c.fetchone()
            
            if not result:
                return {'remaining_free': 3, 'credits': 0}
            
            free_used, credits = result
            remaining_free = max(0, 3 - free_used)
            
            return {
                'remaining_free': remaining_free,
                'credits': credits
            }
        
        finally:
            conn.close()
    
    def add_credits(self, user_key: str, amount: int):
        """Add credits to user (called after successful payment)"""
        conn = sqlite3.connect(self.db_path)
        
        try:
            c = conn.cursor()
            
            # Ensure user exists
            c.execute('SELECT user_key FROM users WHERE user_key = ?', (user_key,))
            if not c.fetchone():
                c.execute(
                    'INSERT INTO users (user_key, free_used_today, credits) VALUES (?, 0, ?)',
                    (user_key, amount)
                )
            else:
                c.execute(
                    'UPDATE users SET credits = credits + ? WHERE user_key = ?',
                    (amount, user_key)
                )
            
            conn.commit()
            print(f"Added {amount} credits to user {user_key}")
        
        finally:
            conn.close()
