# Virtual Fitting App

## Overview

This is a Virtual Fitting application that allows users to virtually try on clothing items using AI technology. Users upload a photo of themselves and a photo of a clothing item, and the app generates a composite image showing how the clothing would look when worn. The application is built with a React frontend and Express backend, featuring a modern, image-centric UI inspired by premium fashion e-commerce platforms.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Tooling**
- React with TypeScript for type safety and modern component development
- Vite as the build tool and development server for fast HMR (Hot Module Replacement)
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and API data fetching

**UI Component System**
- shadcn/ui component library (New York style variant) built on Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- Class Variance Authority (CVA) for component variant management
- Dark/Light theme support with system preference detection

**Design System**
- Color palette: Deep teal primary (17 85% 35%), coral secondary (340 75% 55%)
- Typography: Inter font family from Google Fonts
- Responsive spacing system using Tailwind's 4-based scale
- Custom CSS variables for theme-aware colors and elevations

**State Management**
- Local component state for UI interactions (file uploads, previews)
- React Query for async state (API calls, mutations)
- Context API for theme state (ThemeProvider)

### Backend Architecture

**Server Framework**
- Express.js with TypeScript for the API server
- ESM module system throughout the codebase
- Custom middleware for request logging and error handling

**Image Processing & AI**
- OpenAI integration via Replit AI Integrations service (no API key required)
- GPT-5-nano model for image analysis and virtual fitting generation
- Sharp library for image manipulation and processing
- Multer for multipart/form-data file upload handling (10MB limit)

**API Design**
- RESTful endpoints with multipart form data support
- `/objects/*` - Static file serving for uploaded and processed images
- `/api/virtual-fitting` - Main endpoint accepting user and clothing photos
- Error handling middleware with proper HTTP status codes

**Development Environment**
- Hot reload in development via Vite middleware integration
- Replit-specific plugins for error overlay and dev banner
- Development/production environment separation

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