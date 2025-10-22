# 입사 (입어보고 사자)

## Overview

"입사 (FITSA)" is an AI-powered virtual try-on application that generates realistic images by superimposing user photos with clothing items. Its core vision is to provide a "mirror-like natural" experience, prioritizing user experience and natural-looking results over technical complexity. Key features include AI-driven virtual fitting, a mobile-responsive design, and a credit-based monetization model with Stripe integration. The project aims to offer a premium, immersive boutique fitting room experience, with a focus on intuitive UI/UX and clear calls to action. A new "Wardrobe" feature allows users to save and manage their fitted outfits alongside shopping information.

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