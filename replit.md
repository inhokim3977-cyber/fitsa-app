# 입사 (입어보고 사자)

## Overview

"입사"는 AI 기술을 활용한 가상 피팅 앱으로, 사용자가 자신의 사진과 옷 사진을 업로드하면 AI가 자연스럽게 합성된 이미지를 생성합니다. "거울처럼 자연스럽게"라는 비전 아래, 기술보다는 사용자 경험과 결과의 자연스러움에 집중합니다. 핵심 기능은 AI 기반 가상 피팅, 모바일 반응형 디자인, 그리고 신용카드 결제 시스템을 통한 수익화 모델입니다.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend uses static HTML/CSS/JavaScript with Tailwind CSS via CDN for styling. It features a mobile-responsive design optimized for portrait mode, displaying all input elements vertically. The UI emphasizes a "mirror-like" natural experience with a circular layout (or vertical stacking on mobile), minimal whitespace, and a focus on visual results rather than technical details. Key UI elements include drag & drop image upload, a before/after slider, and download functionality. The design uses a light gray background (#F7F7F7) and rose pink (#F45B69) for main actions, with Noto Sans KR typography.

### Backend Architecture

The backend is built with Flask (Python) and features a CORS-enabled API for virtual try-on. It handles multipart form data with a maximum file size of 16MB. The core is an optimized AI pipeline:

**Stage 0: Background Removal**
- Optional local `rembg` processing for clothing images.

**Stage 1: Virtual Try-On**
- **Primary Model**: Gemini 2.5 Flash for all categories (upper\_body, lower\_body, dress), chosen for its quality, natural results, and ability to preserve image dimensions and details like hands/objects.
- **Fallback Model**: IDM-VTON, primarily used as a fallback, especially for dress categories where it shows consistency.

**Monetization System**

A monetization MVP is implemented with a free tier of 3 virtual try-ons per day per user, and a paid tier of 10 credits for $2 USD via Stripe Checkout. User identification is based on an IP + User-Agent hash. Credits are managed in an SQLite database (`credits.db`), with free tries resetting daily at midnight UTC. A "Refitting Feature" allows up to 5 free retries per hour for the same photo set, improving user satisfaction without consuming credits.

**Data Storage Solutions**

Object storage is handled via Google Cloud Storage, authenticated through a Replit sidecar service, using UUID-based file naming. An in-memory storage class (`MemStorage`) is used for fitting records, with a prepared Drizzle ORM schema for future migration to PostgreSQL (e.g., Neon serverless).

## External Dependencies

*   **Cloud Services**: Google Cloud Storage, Replit Object Storage sidecar endpoint.
*   **AI & Machine Learning**: Gemini 2.5 Flash API, IDM-VTON (via Replicate), `rembg` for local background removal.
*   **Payment Processing**: Stripe Checkout.
*   **Development & Libraries**: Flask, Werkzeug, Tailwind CSS, Drizzle ORM, SQLite.