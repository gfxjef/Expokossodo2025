# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ExpoKossodo 2025 is a comprehensive event registration and management system for a 4-day medical conference. The system features real-time registration, QR code verification, admin dashboards, advisor panels, and AI-powered chat support.

## Development Commands

### Frontend (React 19)
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
python verify_setup.py      # Test database connection
```

### Production Deployment
```bash
# Backend with Gunicorn
gunicorn app:app --config gunicorn_config.py

# Frontend deployment to Vercel
vercel --prod
```

## Architecture Overview

### Frontend Stack
- **React 19.1.1** with functional components and hooks
- **Tailwind CSS** for styling with custom configuration
- **Framer Motion** for animations
- **Chart.js** for data visualization
- **FullPage.js** for landing page sections
- **html5-qrcode** for QR scanning capabilities
- **React Router v7** for navigation

### Backend Stack
- **Flask 2.3.3** with CORS support for multiple origins
- **MySQL** with mysql-connector-python
- **OpenAI API** integration for AI chat features
- **Google Generative AI** support
- **QR Code generation** with qrcode and Pillow
- **Email system** with SMTP and HTML templates
- **Gunicorn** for production deployment

### Key Service Architecture

**Frontend Services:**
- `api.js` - Core API client with axios
- `adminService.js` - Admin operations and statistics
- `visualizacionService.js` - Data visualization and reporting
- `asesoresService.js` - Advisor-specific functionality
- `analytics.js` - Google Analytics 4 integration

**Backend Endpoints:**
- `/api/eventos` - Event management
- `/api/registro` - User registration
- `/api/fechas-info-activas` - Active date information
- `/api/time-slots` - Time slot management
- `/api/verificar-qr` - QR code verification
- `/api/admin/*` - Admin operations
- `/api/asesores/*` - Advisor operations
- `/api/leads/*` - Lead capture system
- `/api/chat` - AI chat integration

## Database Schema

### Core Tables
```sql
expokossodo_eventos          # Events with speakers, times, capacity
expokossodo_registros         # User registrations and personal data
expokossodo_registro_eventos  # Many-to-many event selections
expokossodo_qr_registros      # QR code data for verification
expokossodo_fechas_info       # Date-specific information and themes
expokossodo_leads             # Lead capture data
```

## Environment Configuration

### Backend (.env in backend/)
```env
# Database
DB_HOST=
DB_NAME=
DB_USER=
DB_PASSWORD=
DB_PORT=

# Email
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# OpenAI
OPENAI_API_KEY=
OPENAI_ASSISTANT_ID=
OPENAI_VECTOR_STORE_ID=

# Flask
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=
```

### Frontend (.env in frontend/)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GA_MEASUREMENT_ID=G-EPRBXXTWTM
```

## Component Architecture

### Landing Flow
1. `EventRegistrationWithLanding` - Main landing with fullscreen sections
2. `EventRegistration` - Registration flow controller
3. `EventCalendar` - Interactive event selection grid
4. `RegistrationForm` - User data collection

### Admin System
- `AdminDashboard` - Main admin interface
- `AdminEventGrid` - Event management grid
- `DateInfoManager` - Date and theme configuration
- `ScheduleManager` - Time slot management
- `ExportManager` - Data export functionality

### QR Verification System
- `QRScanner` - Camera-based scanning
- `VerificadorGeneral` - General event verification
- `VerificadorSala` - Room-specific verification
- QR Format: `3LETTERS|DNI|POSITION|COMPANY|TIMESTAMP`

### Advisor Dashboard
- `AsesoresDashboard` - Main advisor interface
- `AsesoresEventGrid` - Event grid for advisors
- `RegistrosAsesores` - Registration management
- `CharlaDetailModal` - Event detail views

## CORS Configuration

Backend supports multiple origins:
- `http://localhost:3000` - Local development
- `https://*.vercel.app` - Vercel deployments
- `https://*.ngrok-free.app` - Ngrok tunnels
- `https://expokossodo.com` - Production domain

## Key Features Implementation

### Event Selection Logic
- Maximum one event per time slot
- Automatic capacity tracking
- Real-time availability updates
- Intercambio system for slot swapping

### QR Code System
- Dynamic generation on registration
- Unique format with encryption
- Real-time verification
- Attendance tracking

### Email Confirmation
- Automatic sending on registration
- HTML templates with event details
- QR code attachment
- Fallback for failed sends

### Analytics Integration
- Google Analytics 4 tracking
- Custom event tracking
- Registration funnel analysis
- Error tracking

## React 19 Specific Considerations

- Using React 19.1.1 (upgraded from 18.x)
- Some peer dependency warnings are expected
- Full compatibility with existing component library
- Enhanced performance with automatic batching

## Common Development Tasks

### Clear Frontend Cache
```bash
cd frontend
rm -rf node_modules/.cache build .parcel-cache
npm start
```

### Test Database Connection
```bash
cd backend
python verify_setup.py
```

### Generate Sample Data
```bash
cd backend
python app.py  # Automatically creates tables and sample data
```

### Run with Ngrok (for external testing)
```bash
ngrok http 5000  # Backend
ngrok http 3000  # Frontend
```

## Deployment Notes

### Frontend (Vercel)
- Automatic deployment on push
- Environment variables in Vercel dashboard
- Build command: `npm run build`
- Output directory: `build`

### Backend (Production)
- Use Gunicorn with config file
- Set `FLASK_ENV=production`
- Ensure all environment variables are set
- Static files served from `../frontend/build`

## Testing Approach

- Manual API testing with Postman/curl
- Frontend component testing with React Testing Library
- Integration testing through full registration flow
- QR verification testing with test devices

## Security Considerations

- BCrypt for password hashing (admin/advisor accounts)
- JWT tokens for authentication
- CORS restrictions by origin
- SQL injection prevention with parameterized queries
- XSS protection in React
- Environment variables for sensitive data