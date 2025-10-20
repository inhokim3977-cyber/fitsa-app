"""
Saved Fits Service
Manages saved virtual fitting results with shopping information
"""
import sqlite3
import uuid
import time
from typing import List, Dict, Optional
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
import re

DB_PATH = 'saved_fits.db'

def init_db():
    """Initialize saved_fits database table"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS saved_fits (
            id TEXT PRIMARY KEY,
            created_at INTEGER NOT NULL,
            result_image_url TEXT NOT NULL,
            thumb_url TEXT,
            shop_name TEXT NOT NULL,
            product_name TEXT NOT NULL,
            product_url TEXT NOT NULL,
            price_snapshot INTEGER,
            currency TEXT DEFAULT 'KRW',
            sku TEXT,
            category TEXT,
            tags TEXT,
            note TEXT,
            user_key TEXT NOT NULL
        )
    ''')
    
    # Index for faster queries
    c.execute('CREATE INDEX IF NOT EXISTS idx_user_key ON saved_fits(user_key)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_created_at ON saved_fits(created_at DESC)')
    
    conn.commit()
    conn.close()

def validate_url(url: str) -> bool:
    """Validate that URL is HTTPS and from allowed domains"""
    try:
        parsed = urlparse(url)
        # Must be HTTPS
        if parsed.scheme != 'https':
            return False
        # Must have a domain
        if not parsed.netloc:
            return False
        return True
    except:
        return False

def add_utm_params(url: str) -> str:
    """Add UTM parameters to product URL"""
    try:
        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        
        # Add UTM parameters
        params['utm_source'] = ['fitsa']
        params['utm_medium'] = ['savedfits']
        params['utm_campaign'] = ['buy']
        
        # Rebuild URL
        new_query = urlencode(params, doseq=True)
        new_url = urlunparse((
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            parsed.params,
            new_query,
            parsed.fragment
        ))
        return new_url
    except:
        return url

def save_fit(user_key: str, data: Dict) -> Dict:
    """
    Save a virtual fitting result
    
    Args:
        user_key: User identifier
        data: Fit data (result_image_url, shop_name, product_name, product_url, etc.)
    
    Returns:
        Dict with {ok: True, id: str} or {ok: False, error: str}
    """
    # Validate required fields
    required_fields = ['result_image_url', 'shop_name', 'product_name', 'product_url']
    for field in required_fields:
        if field not in data or not data[field]:
            return {'ok': False, 'error': f'Missing required field: {field}'}
    
    # Validate product URL
    if not validate_url(data['product_url']):
        return {'ok': False, 'error': 'Invalid product URL (must be HTTPS)'}
    
    # Generate ID and timestamp
    fit_id = str(uuid.uuid4())
    created_at = int(time.time())
    
    # Add UTM parameters to product URL
    product_url_with_utm = add_utm_params(data['product_url'])
    
    # Prepare tags (convert list to comma-separated string)
    tags_str = ','.join(data.get('tags', [])) if 'tags' in data else None
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    try:
        c.execute('''
            INSERT INTO saved_fits (
                id, created_at, result_image_url, thumb_url,
                shop_name, product_name, product_url,
                price_snapshot, currency, sku, category, tags, note, user_key
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            fit_id,
            created_at,
            data['result_image_url'],
            data.get('thumb_url'),
            data['shop_name'],
            data['product_name'],
            product_url_with_utm,
            data.get('price_snapshot'),
            data.get('currency', 'KRW'),
            data.get('sku'),
            data.get('category'),
            tags_str,
            data.get('note'),
            user_key
        ))
        
        conn.commit()
        return {'ok': True, 'id': fit_id}
        
    except Exception as e:
        print(f'Error saving fit: {e}')
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

def get_saved_fits(user_key: str, page: int = 1, per_page: int = 20, query: Optional[str] = None) -> Dict:
    """
    Get saved fits for a user with pagination
    
    Args:
        user_key: User identifier
        page: Page number (1-indexed)
        per_page: Items per page
        query: Optional search query
    
    Returns:
        Dict with {items: List[Dict], total: int, page: int, per_page: int}
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    offset = (page - 1) * per_page
    
    # Build query
    where_clause = 'WHERE user_key = ?'
    params = [user_key]
    
    if query:
        where_clause += ' AND (shop_name LIKE ? OR product_name LIKE ? OR category LIKE ?)'
        search_pattern = f'%{query}%'
        params.extend([search_pattern, search_pattern, search_pattern])
    
    # Get total count
    count_query = f'SELECT COUNT(*) as count FROM saved_fits {where_clause}'
    c.execute(count_query, params)
    total = c.fetchone()['count']
    
    # Get items
    items_query = f'''
        SELECT * FROM saved_fits 
        {where_clause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    '''
    c.execute(items_query, params + [per_page, offset])
    
    items = []
    for row in c.fetchall():
        item = dict(row)
        # Convert tags string back to list
        if item['tags']:
            item['tags'] = item['tags'].split(',')
        else:
            item['tags'] = []
        items.append(item)
    
    conn.close()
    
    return {
        'items': items,
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page
    }

def get_fit_by_id(user_key: str, fit_id: str) -> Optional[Dict]:
    """Get a single saved fit by ID"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    c.execute('SELECT * FROM saved_fits WHERE id = ? AND user_key = ?', (fit_id, user_key))
    row = c.fetchone()
    conn.close()
    
    if row:
        item = dict(row)
        if item['tags']:
            item['tags'] = item['tags'].split(',')
        else:
            item['tags'] = []
        return item
    return None

def delete_fit(user_key: str, fit_id: str) -> Dict:
    """Delete a saved fit"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    try:
        # Verify ownership before deleting
        c.execute('SELECT id FROM saved_fits WHERE id = ? AND user_key = ?', (fit_id, user_key))
        if not c.fetchone():
            return {'ok': False, 'error': 'Fit not found or access denied'}
        
        c.execute('DELETE FROM saved_fits WHERE id = ? AND user_key = ?', (fit_id, user_key))
        conn.commit()
        
        return {'ok': True}
        
    except Exception as e:
        print(f'Error deleting fit: {e}')
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

# Initialize database on module load
init_db()
