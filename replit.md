# Virtual Fitting App

## Overview

This is a Virtual Fitting application that allows users to virtually try on clothing items using AI technology. Users upload a photo of themselves and a photo of a clothing item, and the app generates a composite image showing how the clothing would look when worn. 

**Current Implementation: Flask Backend with Monetization MVP** ✅

The app uses:
- **Node.js Proxy (5000)**: Opens port for Autoscale deployment, proxies to Flask ✅
- **Flask Backend (5001)**: AI pipeline with Gemini 2.5 Flash + background removal
- **Static HTML/CSS/JS Frontend**: Artistic circular layout with glassmorphism
- **Mobile Responsive**: Vertical layout for portrait mode (all inputs visible)
- **Monetization System**: 3 free tries/day → Stripe Checkout ($2 = 10 credits) ✅

## How to Run

**자동 실행:** 워크플로우가 자동으로 실행됩니다:
- Node.js Express: Port 5000 (opens port for deployment, proxies all requests)
- Flask backend: Port 5001 (AI processing)

브라우저를 열면 바로 가상 피팅 앱을 사용할 수 있습니다!

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Tooling**
- **Static HTML/CSS/JavaScript** (no React framework)
- **Tailwind CSS** via CDN for styling
- Canvas API for image editing (rotate, crop, preview)
- Vanilla JS for file upload, drag & drop, and API communication

**UI Features**
- Clothing type selection: "상의 + 하의" or "원피스/전체"
- Circular layout with person in center, items around:
  - Left: Top clothing (상의) - in separate mode
  - Right: Bottom clothing (하의) - in separate mode  
  - Center: Dress (원피스) - in dress mode
- **Removed**: Hat, glasses, and shoes (focus on clothing only)
- Drag & drop image upload for all zones
- Before/After slider comparison for results
- Download functionality for final images
- Background removal checkbox (checked by default)

**Design**
- Artistic circular layout with glassmorphism effects
- Gradient background (purple to violet)
- Floating animations and smooth transitions
- Korean language interface
- Two clothing modes for flexible styling

**Mobile Responsive** ✅
- @media (max-width: 768px) for mobile devices
- Vertical layout on portrait mode (all drop zones visible)
- Flexbox column layout replaces circular positioning
- All inputs accessible on narrow screens (tested iPhone 12 Pro 390x844)

### Backend Architecture

**Server Framework**
- **Flask (Python)** following AIFurnish interior app structure
- CORS enabled for cross-origin requests
- Multipart form data handling with Werkzeug
- Maximum file size: 16MB

**Optimized AI Pipeline for Clothing & Shoes** ✅

**Stage 0: Background Removal** (Optional)
- Local `rembg` processing (~5 seconds)
- Removes background from clothing images
- Applied when checkbox is checked

**Stage 1: Virtual Try-On** (Gemini-first for all categories)

*Supported Categories: upper_body, lower_body, dress*

**All Categories:**
1. **Gemini 2.5 Flash** (1st priority) ✅
   - Preserves full image dimensions and ratio
   - Natural results
   - For upper body & dress: preserves hands/books/objects
   - For lower body: may affect hands but preserves full body
2. **IDM-VTON** (fallback)
   - Note: lower_body may have ratio issues (crops image short)

**Stage 2: Quality Enhancement** (Removed)
- Not needed for simple workflow

**API Design**
- `POST /api/virtual-fitting` - Main endpoint
  - Accepts: `userPhoto`, `clothingPhoto`, `removeBackground` (boolean)
  - Returns: JSON with `resultUrl` or error message
- `GET /health` - Health check endpoint
- Static file serving from `/static/` directory

**Environment Variables**
- `REPLICATE_API_TOKEN` - Set in Replit Secrets
- `GEMINI_API_KEY` - Set in Replit Secrets (paid plan active)
- `AI_INTEGRATIONS_OPENAI_API_KEY` - Auto-provided by Replit
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - Auto-provided by Replit

**Recent Improvements (October 2025)**
- ✅ Simplified to 3 categories: upper_body, lower_body, dress
- ✅ Removed hat, glasses, and shoes - focus on clothing only
- ✅ Local rembg background removal (faster than Replicate)
- ✅ Smart category-based AI routing for best results
- ✅ Image format validation (PNG/JPG only)
- ✅ Preserves hands/objects for upper body & dress (Gemini)
- ✅ Mobile responsive layout - vertical stacking on portrait mode
- ✅ Node.js proxy (5000) → Flask (5001) for Replit deployment
- ✅ **Monetization MVP**: Free-to-paid conversion with Stripe integration

**Supported Categories:**
- Top (상의): upper_body - ✅ Gemini (preserves hands/books/objects)
- Bottom (하의): lower_body - ✅ Gemini (preserves full body, may affect hands)
- Dress (원피스): dress - ✅ Gemini (full body preservation)

### Monetization System ✅

**Business Model**
- Free tier: 3 virtual try-ons per day per user
- Paid tier: $2 USD = 10 credits (credits never expire)
- User identification: IP + User-Agent hash (no signup required)

**Implementation**
- **Database**: SQLite (`credits.db`) with users table
  - Schema: `user_key, free_used_today, credits, last_reset`
  - Daily reset logic: Free tries reset at midnight UTC
- **Payment Processing**: Stripe Checkout (test mode)
  - Product: "Virtual Try-On Credits"
  - Price: $2.00 USD
  - Credits awarded: 10 per purchase
- **API Endpoints**:
  - `GET /stripe/user-status` - Get current credit balance
  - `POST /stripe/create-checkout-session` - Initiate payment
  - `POST /stripe/webhook` - Handle payment completion
  - `POST /stripe/simulate-purchase` - Testing endpoint (bypass Stripe)
- **Credit Consumption**:
  - Priority: Free tries consumed first, then paid credits
  - 1 credit = 1 virtual try-on request
  - 402 Payment Required response when no credits available
- **Frontend Integration**:
  - Credit status display on homepage
  - Buy credits button (shown when balance is 0)
  - Real-time credit updates after generation
  - Success page after payment completion

**Testing**
- Stripe test card: 4242 4242 4242 4242
- Test endpoint: `/stripe/simulate-purchase` (adds 10 credits without payment)
- E2E test verified: Free tries → 402 → Purchase → Credit consumption

### Data Storage Solutions

**Object Storage**
- Google Cloud Storage integration via Replit sidecar service
- External account authentication using credential source flow
- Private object directory structure for security
- UUID-based file naming to prevent collisions
- Custom ObjectStorageService class wrapping GCS client

**In-Memory Storage**
- MemStorage class implementing IStorage interface for virtual fitting records
- Map-based data structure for fast lookups
- Stores fitting metadata: user photo path, clothing photo path, result path, status
- Designed for easy migration to persistent storage (Drizzle/PostgreSQL schema already defined)

**Database Schema (Prepared for Migration)**
- Drizzle ORM configured with PostgreSQL dialect
- Virtual fittings table with UUID primary keys
- User authentication table structure
- Neon serverless PostgreSQL ready for deployment

### External Dependencies

**Cloud Services**
- Google Cloud Storage (@google-cloud/storage) for object/file storage
- Replit Object Storage sidecar endpoint (http://127.0.0.1:1106) for authentication
- Replit AI Integrations for OpenAI API access without separate API key

**AI & Machine Learning**
- OpenAI SDK pointing to Replit's AI gateway
- GPT-5-nano model for vision and text completion tasks
- Image analysis via base64-encoded image URLs in chat completions

**Image Processing**
- Sharp for server-side image manipulation and format conversion
- Multer for handling multipart file uploads with validation

**UI Libraries**
- Radix UI primitives for accessible, unstyled components
- Lucide React for icon system
- React Hook Form with Zod resolvers for form validation
- Uppy for potential advanced file upload UI

**Development Tools**
- Drizzle Kit for database schema management and migrations
- ESBuild for production server bundling
- TypeScript for static type checking
- PostCSS with Autoprefixer for CSS processing