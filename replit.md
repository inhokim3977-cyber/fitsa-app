# Virtual Fitting App

## Overview

This is a Virtual Fitting application that allows users to virtually try on clothing items using AI technology. Users upload a photo of themselves and a photo of a clothing item, and the app generates a composite image showing how the clothing would look when worn. 

**Current Implementation: Flask Backend (Following AIFurnish Interior App Structure)**

The app uses:
- **Flask Backend (Python)**: 3-stage AI pipeline with background removal
- **Static HTML/CSS/JS Frontend**: Canvas editing, Before/After comparison
- **Port 5000**: Flask serves both frontend and API

## How to Run

**Stop the default workflow** (which runs Express):
1. Click the workflow panel and stop it, OR
2. Run manually: `python app.py`

The Flask app will start on port 5000 and serve everything.

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
- Drag & drop image upload for user and clothing photos
- Canvas-based image editing with rotate, crop, reset tools
- Before/After slider comparison for results
- Download functionality for final images
- Background removal checkbox (checked by default)

**Design**
- Clean, modern UI with Tailwind CSS
- Responsive layout for mobile and desktop
- Korean language interface

### Backend Architecture

**Server Framework**
- **Flask (Python)** following AIFurnish interior app structure
- CORS enabled for cross-origin requests
- Multipart form data handling with Werkzeug
- Maximum file size: 16MB

**3-Stage AI Pipeline**
1. **Stage 0 (Optional): Background Removal**
   - Replicate's `cjwbw/rembg` model
   - Cost: ~$0.0043 per image
   - Applied to clothing photos when checkbox is checked
   
2. **Stage 1: Virtual Try-On**
   - Replicate's `wolverinn/ecommerce-virtual-try-on` model
   - Cost: ~$0.11 per image
   - Combines user photo with clothing
   
3. **Stage 2: Quality Enhancement**
   - Nano Banana (gpt-5-nano) via Replit AI Integrations
   - Enhances final image quality
   - No additional cost (uses Replit credits)

**API Design**
- `POST /api/virtual-fitting` - Main endpoint
  - Accepts: `userPhoto`, `clothingPhoto`, `removeBackground` (boolean)
  - Returns: JSON with `resultUrl` or error message
- `GET /health` - Health check endpoint
- Static file serving from `/static/` directory

**Environment Variables (from AIFurnish pattern)**
- `REPLICATE_API_TOKEN` - Set in Replit Secrets
- `AI_INTEGRATIONS_OPENAI_API_KEY` - Auto-provided by Replit
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - Auto-provided by Replit

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