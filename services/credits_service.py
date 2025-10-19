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
                last_request_hash TEXT DEFAULT NULL,
                refit_count INTEGER DEFAULT 0,
                last_refit_reset TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Add columns if they don't exist (for migration)
        migrations = [
            ('last_request_hash', 'TEXT DEFAULT NULL'),
            ('refit_count', 'INTEGER DEFAULT 0'),
            ('last_refit_reset', 'TEXT DEFAULT CURRENT_TIMESTAMP'),
            ('completed_sessions', 'TEXT DEFAULT NULL')
        ]
        
        for column_name, column_type in migrations:
            try:
                c.execute(f'ALTER TABLE users ADD COLUMN {column_name} {column_type}')
                print(f"Added {column_name} column to database")
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
    
    def check_and_consume(self, ip_or_user_key: str, user_agent: str = '', request_hash: Optional[str] = None) -> Tuple[bool, dict]:
        """
        Check if user can make a try-on and consume 1 credit/free attempt
        If request_hash matches last request, it's a refitting (no charge, max 5 per hour)
        
        Args:
            ip_or_user_key: User IP address OR pre-computed user_key (if user_agent is empty, treated as user_key)
            user_agent: User agent string (empty string means ip_or_user_key is already a user_key)
            request_hash: Hash of the photos (for refitting detection)
        
        Returns:
            (allowed: bool, info: dict)
            - allowed: True if user can proceed
            - info: {remaining_free: int, credits: int, needs_payment: bool, is_refitting: bool}
        """
        # If user_agent is empty, ip_or_user_key is already a computed user_key
        if user_agent == '':
            user_key = ip_or_user_key
        else:
            user_key = self.get_user_key(ip_or_user_key, user_agent)
        conn = sqlite3.connect(self.db_path)
        
        try:
            self._reset_daily_if_needed(conn, user_key)
            
            c = conn.cursor()
            
            # Get or create user
            c.execute('SELECT free_used_today, credits, last_request_hash, refit_count, last_refit_reset FROM users WHERE user_key = ?', (user_key,))
            result = c.fetchone()
            
            if not result:
                # New user - create with 0 usage
                now = datetime.now().isoformat()
                c.execute(
                    'INSERT INTO users (user_key, free_used_today, credits, last_request_hash, refit_count, last_refit_reset) VALUES (?, 0, 0, ?, 0, ?)',
                    (user_key, request_hash, now)
                )
                conn.commit()
                free_used = 0
                credits = 0
                last_hash = None
                refit_count = 0
                last_refit_reset = now
            else:
                free_used, credits, last_hash, refit_count, last_refit_reset = result
            
            # Check if this is a refitting (same photos as last request)
            is_refitting = (request_hash is not None and request_hash == last_hash)
            
            if is_refitting:
                # Check if 1 hour has passed since last refit reset
                last_reset_time = datetime.fromisoformat(last_refit_reset)
                now = datetime.now()
                hours_passed = (now - last_reset_time).total_seconds() / 3600
                
                if hours_passed >= 1.0:
                    # Reset refit counter after 1 hour
                    refit_count = 0
                    c.execute(
                        'UPDATE users SET refit_count = 0, last_refit_reset = ? WHERE user_key = ?',
                        (now.isoformat(), user_key)
                    )
                    conn.commit()
                    print(f"Refit counter reset for user {user_key} (1 hour passed)")
                
                # Check if refit limit exceeded (5 per hour)
                if refit_count >= 5:
                    print(f"Refit limit exceeded for user {user_key}: {refit_count}/5 per hour")
                    remaining_free = max(0, 3 - free_used)
                    return False, {
                        'remaining_free': remaining_free,
                        'credits': credits,
                        'needs_payment': False,
                        'is_refitting': True,
                        'refit_limit_exceeded': True,
                        'error': '재피팅 한도 초과: 1시간 내 최대 5회까지 가능합니다.'
                    }
                
                # Refitting allowed - increment counter
                c.execute(
                    'UPDATE users SET refit_count = refit_count + 1 WHERE user_key = ?',
                    (user_key,)
                )
                conn.commit()
                
                print(f"Refitting ({refit_count + 1}/5 per hour) for user {user_key} - no charge")
                remaining_free = max(0, 3 - free_used)
                return True, {
                    'remaining_free': remaining_free,
                    'credits': credits,
                    'needs_payment': False,
                    'is_refitting': True,
                    'refit_count': refit_count + 1,
                    'used_type': 'refitting'
                }
            
            # New generation (not a refit) - update hash and reset refit counter
            if request_hash:
                now = datetime.now().isoformat()
                c.execute(
                    'UPDATE users SET last_request_hash = ?, refit_count = 0, last_refit_reset = ? WHERE user_key = ?',
                    (request_hash, now, user_key)
                )
                print(f"New generation for user {user_key} - refit counter reset")
            
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
                print(f"[get_user_status] New user {user_key}: 3 free, 0 credits")
                return {'remaining_free': 3, 'credits': 0}
            
            free_used, credits = result
            remaining_free = max(0, 3 - free_used)
            
            print(f"[get_user_status] user_key={user_key}: free_used={free_used}, credits={credits}, remaining_free={remaining_free}")
            
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
