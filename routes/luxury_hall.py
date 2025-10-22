"""
Luxury Hall Routes - Premium Brand Virtual Fitting Rooms
"""
from flask import Blueprint, render_template, jsonify, request
import os

luxury_hall_bp = Blueprint('luxury_hall', __name__)

# Brand configuration
BRANDS = {
    # Youth Category
    'miu_miu': {
        'name': 'Miu Miu',
        'description': '젊고 감각적인 프라다의 세컨드 라인',
        'category': 'youth',
        'theme_color': '#FF69B4'
    },
    'off_white': {
        'name': 'Off-White',
        'description': '스트리트 럭셔리의 대명사',
        'category': 'youth',
        'theme_color': '#FF69B4'
    },
    'diesel': {
        'name': 'Diesel',
        'description': '이탈리아 감성의 데님 전문 브랜드',
        'category': 'youth',
        'theme_color': '#FF69B4'
    },
    
    # Modern Category
    'dior': {
        'name': 'Dior',
        'description': '프랑스 오트 쿠튀르의 상징',
        'category': 'modern',
        'theme_color': '#C9A961'
    },
    'chanel': {
        'name': 'Chanel',
        'description': '영원한 우아함의 대명사',
        'category': 'modern',
        'theme_color': '#C9A961'
    },
    'gucci': {
        'name': 'Gucci',
        'description': '이탈리아 장인정신의 결정체',
        'category': 'modern',
        'theme_color': '#C9A961'
    },
    
    # Classic Category
    'hermes': {
        'name': 'Hermès',
        'description': '프랑스 최고급 가죽 명가',
        'category': 'classic',
        'theme_color': '#8B7355'
    },
    'max_mara': {
        'name': 'Max Mara',
        'description': '이탈리아 정통 럭셔리 패션',
        'category': 'classic',
        'theme_color': '#8B7355'
    },
    'burberry': {
        'name': 'Burberry',
        'description': '영국 전통의 트렌치코트 명가',
        'category': 'classic',
        'theme_color': '#8B7355'
    }
}

def get_sample_items(brand_id, category):
    """
    Get sample clothing items for a brand category.
    Uses stock images for demonstration - will be expanded with more items.
    """
    items = []
    
    # Sample items with AI-generated clothing images (clothing only, no models)
    if category == 'tops':
        items = [
            {'name': '엘레강스 블라우스', 'category': '상의', 'image': '/attached_assets/generated_images/white_luxury_silk_blouse_a0ccc8d2.png'},
            {'name': '실크 셔츠', 'category': '상의', 'image': '/attached_assets/generated_images/cream_silk_luxury_shirt_5e2ade51.png'},
            {'name': '클래식 탑', 'category': '상의', 'image': 'https://via.placeholder.com/300x400/FFFFFF/000000?text=Coming+Soon'},
        ]
    elif category == 'bottoms':
        items = [
            {'name': '테일러드 팬츠', 'category': '하의', 'image': '/attached_assets/generated_images/black_tailored_dress_pants_4016e68c.png'},
            {'name': '슬랙스 팬츠', 'category': '하의', 'image': '/attached_assets/generated_images/navy_wide_leg_trousers_7a120526.png'},
            {'name': '데님 진', 'category': '하의', 'image': 'https://via.placeholder.com/300x400/FFFFFF/000000?text=Coming+Soon'},
        ]
    elif category == 'dresses':
        items = [
            {'name': '이브닝 드레스', 'category': '원피스', 'image': '/attached_assets/generated_images/black_evening_dress_gown_d8fb4e08.png'},
            {'name': '캐주얼 원피스', 'category': '원피스', 'image': 'https://via.placeholder.com/300x400/FFFFFF/000000?text=Coming+Soon'},
            {'name': '트렌치 코트', 'category': '코트', 'image': 'https://via.placeholder.com/300x400/FFFFFF/000000?text=Coming+Soon'},
        ]
    
    return items

@luxury_hall_bp.route('/luxury_hall')
def luxury_hall():
    """Render the main Luxury Hall page"""
    return render_template('luxury_hall.html')

@luxury_hall_bp.route('/room/<brand_id>')
def brand_room(brand_id):
    """Render a specific brand's room page"""
    if brand_id not in BRANDS:
        return jsonify({'error': 'Brand not found'}), 404
    
    brand = BRANDS[brand_id]
    
    # Get sample items for each category
    tops = get_sample_items(brand_id, 'tops')
    bottoms = get_sample_items(brand_id, 'bottoms')
    dresses = get_sample_items(brand_id, 'dresses')
    
    return render_template(
        'rooms/base_room.html',
        brand_name=brand['name'],
        brand_description=brand['description'],
        theme_color=brand['theme_color'],
        tops=tops,
        bottoms=bottoms,
        dresses=dresses
    )

@luxury_hall_bp.route('/api/luxury/brands')
def get_brands():
    """API endpoint to get all brands"""
    return jsonify(BRANDS)

@luxury_hall_bp.route('/api/luxury/brand/<brand_id>')
def get_brand(brand_id):
    """API endpoint to get a specific brand"""
    if brand_id not in BRANDS:
        return jsonify({'error': 'Brand not found'}), 404
    
    return jsonify(BRANDS[brand_id])
