# 입사 (입어보고 사자)

## Overview

"입사 (FITSA)" is an AI-powered virtual try-on application that generates realistic images by superimposing user photos with clothing items. Its core vision is to provide a "mirror-like natural" experience, prioritizing user experience and natural-looking results over technical complexity. Key features include AI-driven virtual fitting, a mobile-responsive design, and a credit-based monetization model with Stripe integration. The project aims to offer a premium, immersive boutique fitting room experience, with a focus on intuitive UI/UX and clear calls to action. A new "Wardrobe" feature allows users to save and manage their fitted outfits alongside shopping information.

The "Luxury Hall" (명품관) showcases 9 luxury brands across Youth/Modern/Classic categories. Users can select clothing from brand rooms, which automatically loads into the main try-on interface. **Critical requirement**: Clothing images must be product-only (no models), fully unfolded, and not cropped for optimal virtual try-on results. For pants, use flat-lay photography with both legs fully extended and visible from waistband to hem.

### Strategic Evolution Roadmap

**Phase 1: Traffic Acquisition (0-3 months)** - Current Focus
- Goal: 5,000-10,000 monthly visitors via Luxury Hall
- Strategy: Instagram/TikTok ads, viral features (SNS sharing, referrals), SEO optimization, influencer partnerships
- Success Metrics: 5K+ monthly visitors, 5% conversion rate, 3+ press mentions

**Phase 2: Partner Rooms Launch (3-6 months)**
- Goal: 10-30 shopping mall partnerships, $5K-10K monthly revenue
- Concept: Two-sided marketplace where shopping malls operate virtual fitting rooms within FITSA platform
- 3-Tier Model: FREE (10 items, 15% commission), BASIC ($99/mo, 30 items, 10%), PREMIUM ($299/mo, unlimited, 5%)
- Strategy: Leverage Phase 1 traffic as proof → "We have 10K visitors, join our platform"

**Phase 3: SaaS/White-Label (6-12 months)**
- Goal: 20-50 self-service customers, $50K+ monthly revenue
- Concept: FITSA technology embedded into shopping mall websites (reverse integration)
- Pricing: $199-1,999/month based on usage tier, enterprise custom pricing
- Strategy: Convert successful Partner Room merchants → "Put this on your own website"

**Why This Sequence Works:**
1. Phase 1 builds traffic → Phase 2 leverage (not vice versa)
2. Phase 2 proves ROI → Phase 3 sales become easy
3. Each phase funds the next, reduces risk
4. Follows proven Uber/Airbnb playbook (demand first, then supply)

## User Preferences

Preferred communication style: Simple, everyday language.

## Competitive Position Analysis (Oct 2025)

### Market Opportunity
- Global virtual try-on market: $2-6B (2025) → $48B (2030) at 25% CAGR
- Asia-Pacific: Fastest growing region (27.4% CAGR)
- Korean e-commerce fashion: $24.5B (2025), $1.24K per user spending

### FITSA Competitive Advantages
1. **Technology**: Gemini 2.5 Flash Image ranked #1 on LMArena for image generation/editing (verified superior quality for virtual try-on)
2. **Pricing**: B2C pay-per-use ($0.20/fitting) vs. competitors' B2B subscription ($129-549/month) - blue ocean strategy
3. **Luxury Curation**: 9 premium brands (Dior, Chanel, Hermès) with British tailor aesthetic
4. **Mobile Optimization**: Full Samsung browser compatibility, portrait-mode optimized

### Current Assessment
- **Technology Competitiveness**: ⭐⭐⭐⭐⭐ (5/5) - World-class AI
- **Market Traction**: ⭐⭐☆☆☆ (2/5) - Needs immediate marketing push
- **Monetization Potential**: ⭐⭐⭐⭐☆ (4/5) - Proven model, needs traffic

### Immediate Action Plan (Next 2 Weeks)
1. ✅ **Viral Features**: SNS share buttons (Instagram/KakaoTalk) with +5 credit rewards implemented - watermarking, Web Share API, daily reward limits
2. **Paid Ads**: Instagram/TikTok $100 test campaign targeting Korean women 18-35, fashion interest
3. **SEO**: Meta tags, Naver blog posts (3), community seeding (10 communities)
4. **Influencer Outreach**: 20 micro-influencers (5K-30K followers), free credit sponsorships

### SNS Share System (Implemented Oct 2025)
**Features:**
- ✅ Automatic watermark on ALL downloads and shares (bottom-right corner)
  - "Created with FITSA" (gold text)
  - "fitsa-web.onrender.com" (ivory text)
  - Semi-transparent green background
- Instagram/KakaoTalk dedicated share buttons
- +5 credit reward per platform per day (max 1 reward/platform/day)
- Web Share API for mobile (iOS/Android native sharing)
- Security: Platform whitelist validation, CORS handling with fallback

**Technical Implementation:**
- Frontend: Canvas-based watermarking (data: URI and blob: URL support)
- Watermark: Responsive sizing (2.5% of image width, min 14px)
- Backend: /api/share-reward endpoint with platform validation
- Database: share_log table (user_key, platform, shared_at, credits_rewarded)
- Platforms: 'instagram', 'kakao', 'general'
- Download: downloadResult() adds watermark before file save
- Share: shareToSNS() adds watermark before Web Share API

### Revenue Projections
- **Pessimistic** (no marketing): 100-500 monthly visitors, $50-200/month
- **Realistic** ($500/month marketing): 5K-10K visitors by Month 3, $1K-3K/month
- **Optimistic** (viral success): 50K+ visitors, $10K+/month, VC-fundable

## System Architecture

### Frontend Architecture

The frontend uses static HTML/CSS/JavaScript with Tailwind CSS via CDN, featuring a mobile-responsive design optimized for portrait mode. The UI emphasizes a "mirror-like" natural experience with a dark British tailor shop theme (Primary Green: `#1E3D2B`, Ivory: `#F5F1EA` for components, Gold for highlights). It includes drag & drop image upload, wood-frame mirror styling for results, and download functionality. UX features include an Empty State Guide, Progressive Disclosure for UI elements based on user interaction, and a prominent Upload CTA. A modular Button Component System v2 ensures consistent interactions and accessibility.

**Mobile Browser Compatibility (v3.0.0):**
- **Image Loading:** Uses `URL.createObjectURL()` instead of FileReader for cross-browser compatibility (Samsung Internet, Safari iOS, Chrome Mobile)
- **Compression:** Canvas-based image resizing with fallback to original file if compression fails
- **Memory Management:** Automatic object URL cleanup via `URL.revokeObjectURL()`
- **No FileReader dependency:** Eliminates issues with Samsung Internet's aggressive throttling of FileReader/DataURL conversions on large mobile images

### Backend Architecture

The backend is built with Flask, providing a CORS-enabled API for virtual try-on, handling multipart form data up to 16MB. The core AI pipeline consists of:
- **Stage 0: Background Removal**: Optional local `rembg` processing for clothing images.
- **Stage 1: Virtual Try-On**: Primarily uses Gemini 2.5 Flash for all categories (upper_body, lower_body, dress) due to its quality and detail preservation. IDM-VTON serves as a fallback model.

A monetization MVP is implemented with a free tier and a paid credit system via Stripe Checkout, identified by IP + User-Agent hash. Credits are managed in an SQLite database, with daily resets for free tries. A "Refitting Feature" allows free retries for the same photo set. A Credit Protection System ensures automatic credit refunds for failed AI generations or server errors.

Data storage uses Google Cloud Storage via a Replit sidecar for object storage, with UUID-based file naming. An in-memory storage class (`MemStorage`) is used for fitting records, with a prepared Drizzle ORM schema for future PostgreSQL migration.

The "Wardrobe" system allows saving and managing virtual fitting results with shopping information. It uses an SQLite database (`saved_fits.db`) to store user-specific data, including image URLs, shop/product details with automatic UTM parameter injection, and optional metadata. RESTful API endpoints support saving, retrieving, and deleting fits, with a grid-based frontend display, pagination, and search functionality.

## External Dependencies

*   **Cloud Services**: Google Cloud Storage, Replit Object Storage sidecar endpoint.
*   **AI & Machine Learning**: Gemini 2.5 Flash API, IDM-VTON (via Replicate), `rembg`.
*   **Payment Processing**: Stripe Checkout.
*   **Development & Libraries**: Flask, Werkzeug, Tailwind CSS, Drizzle ORM, SQLite.

## Production Deployment

### Deployment Pipeline
The project uses an automated **Replit → GitHub → Render** deployment pipeline:
1. **Development**: Code changes on Replit
2. **Version Control**: Push to GitHub (`main` branch)
3. **Auto-Deploy**: Render detects GitHub push and triggers build
4. **Production**: Live at https://fitsa-web.onrender.com (Singapore region)

### Infrastructure
- **Web Server**: Gunicorn (2 workers, 4 threads, 120s timeout)
- **Platform**: Render Free Tier (upgradable to Starter $7/mo for zero downtime)
- **Region**: Singapore (closest to Korea for optimal latency)
- **Health Check**: `/healthz` endpoint for monitoring
- **Build Time**: ~3-5 minutes
- **Cold Start**: ~15 seconds on Free Tier (instant on paid plans)

### Production Optimizations
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, HSTS
- **Request Logging**: Structured logs with timing metrics
- **CORS**: Configurable via `CORS_ORIGINS` environment variable
- **Error Handling**: Comprehensive exception handlers with traceback logging
- **Compression**: Brotli/gzip support via Gunicorn
- **Environment Isolation**: Production `.env` separate from development

### Critical Environment Variables
- `GEMINI_API_KEY`: Google AI Studio API key (required)
- `REPLICATE_API_TOKEN`: Replicate API token (required)
- `STRIPE_SECRET_KEY`: Stripe Live secret key (required)
- `VITE_STRIPE_PUBLIC_KEY`: Stripe publishable key (required)
- `SESSION_SECRET`: Flask session secret (64-char random string)
- `CORS_ORIGINS`: Allowed CORS origins (default: `*`)

### Deployment Files
- `requirements-prod.txt`: Production Python dependencies with pinned versions
- `render.yaml`: Infrastructure-as-Code configuration for Render
- `deploy.sh`: Automated deployment script with Git workflow
- `DEPLOY.md`: Comprehensive deployment guide and troubleshooting
- `.env.sample`: Environment variable template (safe to commit)
- `.gitignore`: Security-focused ignore rules (excludes `.env`, `*.db`)

### Performance Monitoring
- Health Check: `GET /healthz` returns service status + timestamp
- Logs: Structured JSON logs via Gunicorn stdout
- Metrics: Request timing logged for all endpoints
- Uptime: Monitor via UptimeRobot or similar (5-min ping recommended)