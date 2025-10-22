# 입사 (입어보고 사자)

## Overview

"입사 (FITSA)" is an AI-powered virtual try-on application that generates realistic images by superimposing user photos with clothing items. Its core vision is to provide a "mirror-like natural" experience, prioritizing user experience and natural-looking results over technical complexity. Key features include AI-driven virtual fitting, a mobile-responsive design, and a credit-based monetization model with Stripe integration. The project aims to offer a premium, immersive boutique fitting room experience, with a focus on intuitive UI/UX and clear calls to action. A new "Wardrobe" feature allows users to save and manage their fitted outfits alongside shopping information.

The "Luxury Hall" (명품관) showcases 9 luxury brands across Youth/Modern/Classic categories. Users can select clothing from brand rooms, which automatically loads into the main try-on interface. **Critical requirement**: Clothing images must be product-only (no models), fully unfolded, and not cropped for optimal virtual try-on results. For pants, use flat-lay photography with both legs fully extended and visible from waistband to hem.

## User Preferences

Preferred communication style: Simple, everyday language.

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