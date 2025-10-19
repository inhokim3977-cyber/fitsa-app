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
                last_reset TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
        conn.close()
    
    def get_user_key(self, ip: str, user_agent: str) -> str:
        """Generate unique user key from IP + User Agent"""
        combined = f"{ip}:{user_agent}"
        return hashlib.sha256(combined.encode()).hexdigest()[:16]
    
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
    
    def check_and_consume(self, ip: str, user_agent: str) -> Tuple[bool, dict]:
        """
        Check if user can make a try-on and consume 1 credit/free attempt
        
        Returns:
            (allowed: bool, info: dict)
            - allowed: True if user can proceed
            - info: {remaining_free: int, credits: int, needs_payment: bool}
        """
        user_key = self.get_user_key(ip, user_agent)
        conn = sqlite3.connect(self.db_path)
        
        try:
            self._reset_daily_if_needed(conn, user_key)
            
            c = conn.cursor()
            
            # Get or create user
            c.execute('SELECT free_used_today, credits FROM users WHERE user_key = ?', (user_key,))
            result = c.fetchone()
            
            if not result:
                # New user - create with 0 usage
                c.execute(
                    'INSERT INTO users (user_key, free_used_today, credits) VALUES (?, 0, 0)',
                    (user_key,)
                )
                conn.commit()
                free_used = 0
                credits = 0
            else:
                free_used, credits = result
            
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
                    'used_type': 'credit'
                }
            
            # No free or paid credits left
            return False, {
                'remaining_free': 0,
                'credits': 0,
                'needs_payment': True
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
