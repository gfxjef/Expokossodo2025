# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ExpoKossodo 2025 is a complete event registration system for a 4-day medical conference. The system includes:

- **Frontend**: React 19 app with Tailwind CSS, charts, QR scanning, and fullscreen landing pages
- **Backend**: Python Flask API with MySQL database, email systems, QR generation, and OpenAI integration
- **Features**: Event registration, admin panels, QR verification, analytics, advisor dashboards, and chat functionality

## Development Commands

### Frontend (React)
```bash
cd frontend
npm install                 # Install dependencies
npm start                   # Development server (port 3000)
npm run dev                 # Alternative dev command
npm run build               # Production build
npm test                    # Run tests
```

### Backend (Python Flask)
```bash
cd backend
python -m venv venv         # Create virtual environment
venv\Scripts\activate.bat   # Activate (Windows)
source venv/bin/activate    # Activate (macOS/Linux)
pip install -r requirements.txt
python app.py               # Start server (port 5000)
```

### Build and Deploy
- Frontend builds to `frontend/build/` directory
- Backend serves static files from `../frontend/build`
- Uses Vercel for frontend deployment
- Backend supports CORS for multiple domains including ngrok and Vercel

## Architecture Overview

### Frontend Structure
- **Main App**: Routes-based navigation with analytics tracking
- **Landing**: EventRegistrationWithLanding with fullscreen video/animations
- **Admin**: Complete dashboard with event management and statistics
- **QR System**: Scanner and verification components for event check-ins
- **Advisors**: Separate dashboard system for event advisors
- **Charts**: Data visualization using Chart.js
- **Services**: API communication, analytics, and admin services

### Backend Architecture
- **Flask App**: Main server with CORS configuration for multiple origins
- **Database**: MySQL with automatic table creation and sample data
- **Email System**: SMTP with HTML templates for confirmations
- **QR Generation**: Dynamic QR code creation with PIL/Pillow
- **OpenAI Integration**: Chat system with RAG using vector stores
- **Authentication**: Basic auth for admin and advisor sections

### Key Services
- **adminService.js**: Event management, statistics, exports
- **visualizacionService.js**: Data visualization and reporting
- **asesoresService.js**: Advisor-specific functionality
- **analytics.js**: Google Analytics integration

## Database Schema

Main tables:
- `expokossodo_eventos`: Event information (speakers, times, capacity)
- `expokossodo_registros`: User registrations and personal data
- `expokossodo_registro_eventos`: Many-to-many relationship for event selections

## Environment Configuration

### Backend (.env in backend/)
Required variables:
- Database: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`
- Email: `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_HOST`, `EMAIL_PORT`
- OpenAI: `OPENAI_API_KEY`, `OPENAI_ASSISTANT_ID`, `OPENAI_VECTOR_STORE_ID`
- Flask: `FLASK_ENV`, `FLASK_DEBUG`, `SECRET_KEY`

### Frontend (.env in frontend/)
- `REACT_APP_API_URL`: Backend API URL (typically http://localhost:5000/api)

## Key Components and Features

### QR System
- **QRScanner.js**: Camera-based QR code scanning with html5-qrcode
- **VerificadorGeneral.js**: General event verification
- **VerificadorSala.js**: Room-specific verification with attendance tracking

### Admin Features
- Event grid management with capacity tracking
- Statistics and analytics visualization
- Export functionality for registrations
- Schedule management with toggle controls

### User Registration Flow
1. Landing page with video/animations (uses FullPage.js)
2. Event calendar selection (5 time slots × 4 rooms per day)
3. Registration form with validation
4. Email confirmation with event details

## React 19 Considerations
- Project uses React 19.1.1 (recently upgraded from 18.3.1)
- Some dependencies may show peer dependency warnings - this is expected
- Build process works correctly despite warnings

## Common Issues and Solutions

### Build Errors
- If "use is not exported from react" error occurs, ensure React 19 is installed
- Clear build cache: `rm -rf build/ node_modules/ && npm install`

### Database Connection
- Verify `.env` file exists in backend with correct database credentials
- Run `python verify_setup.py` to test database connection

### CORS Issues
- Backend is configured for multiple origins including localhost, Vercel, and ngrok
- Add new domains to `allowed_origins` array in `app.py`

## Testing
- Frontend: Use `npm test` for React testing
- Backend: Manual API testing or run `python app.py` to verify setup
- Integration: Test full registration flow from landing to email confirmation

## Deployment Notes
- Frontend: Configured for Vercel deployment with `vercel.json`
- Backend: Supports production deployment with gunicorn
- Static files: Backend serves React build files in production mode