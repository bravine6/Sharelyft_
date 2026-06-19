# ShareLyft - Ride Sharing Platform

ShareLyft is a comprehensive ride-sharing platform with a Node.js backend, React frontend, and planned React Native mobile app. The platform supports both passengers and drivers with features like M-Pesa payments, Google authentication, and real-time ride management.

## 🏗️ Architecture Overview

```
ShareLyft/
├── backend/           # Node.js/Express API server
├── frontend/          # React/TypeScript web application
├── mobile/           # React Native mobile app (in development)
└── database/         # Supabase database migrations and setup
```

## 🚀 Features

### Authentication & User Management
- ✅ Email/Password registration and login
- ✅ Google OAuth integration
- ✅ Email verification with Supabase
- ✅ Phone verification with Twilio
- ✅ JWT token-based authentication
- ✅ User profile management
- ✅ Password change functionality

### Payment Integration
- ✅ M-Pesa STK Push integration
- ✅ Payment webhooks and verification
- ✅ Booking payment processing

### Driver Features
- ✅ Driver document upload (ID, License, Insurance)
- ✅ Document verification system
- ✅ Driver profile management
- ✅ Vehicle management
- 🔄 Earnings tracking (in progress)

### Passenger Features
- ✅ Ride booking system
- ✅ Real-time ride status tracking
- ✅ Ride history
- ✅ In-app chat with drivers
- 🔄 Rating system (in progress)

### Admin Features
- ✅ Admin dashboard
- ✅ Driver verification management
- ✅ User management
- ✅ Payment monitoring
- 🔄 Analytics dashboard (in progress)

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + JWT
- **File Storage**: Supabase Storage
- **Payment**: M-Pesa API
- **SMS**: Twilio
- **Email**: Supabase Auth

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Authentication**: Supabase Client
- **Real-time**: WebSocket integration

### Mobile (React Native)
- **Framework**: React Native with Expo
- **Navigation**: React Navigation v6
- **State Management**: React Context API
- **Storage**: AsyncStorage

### Database Schema
- **Users**: `user_profiles` table with Supabase Auth integration
- **Rides**: `rides` table for ride management
- **Bookings**: `bookings` table for ride bookings
- **Vehicles**: `vehicles` table for driver vehicle management
- **Chat**: `conversations` and `messages` tables for in-app messaging
- **Payments**: M-Pesa transaction tracking
- **Driver Documents**: File storage in Supabase buckets

## 📁 Project Structure

### Backend (`/backend`)
```
backend/
├── src/
│   ├── controllers/           # Route handlers
│   │   ├── authController.js     # Authentication logic
│   │   ├── profileController.js  # User profile management
│   │   ├── rideController.js     # Ride management
│   │   ├── mpesaController.js    # M-Pesa payments
│   │   ├── adminController.js    # Admin operations
│   │   ├── chatController.js     # In-app messaging
│   │   ├── vehicleController.js  # Vehicle management
│   │   └── driverVerificationController.js
│   ├── routes/               # API routes
│   │   ├── authRoutes.js
│   │   ├── profileRoutes.js
│   │   ├── rideRoutes.js
│   │   ├── mpesaRoutes.js
│   │   ├── adminRoutes.js
│   │   ├── chatRoutes.js
│   │   ├── vehicleRoutes.js
│   │   └── driverVerificationRoutes.js
│   ├── middlewares/          # Custom middleware
│   │   ├── authMiddleware.js    # Authentication middleware
│   │   └── adminMiddleware.js   # Admin authorization
│   ├── services/             # Business logic services
│   │   ├── emailService.js
│   │   ├── smsService.js
│   │   └── mpesaService.js
│   └── index.js             # Server entry point
├── .env                     # Environment variables
└── package.json
```

### Frontend (`/frontend`)
```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── layout/
│   │   │   └── DashboardLayout.tsx
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx
│   │   │   └── ConversationList.tsx
│   │   ├── ui/              # UI primitives
│   │   ├── CancelBookingModal.tsx
│   │   ├── DriverVerification.tsx
│   │   ├── VehicleManagement.tsx
│   │   └── ServiceFeePayment.tsx
│   ├── contexts/            # React Context providers
│   │   └── AuthContext.tsx     # Authentication state
│   ├── hooks/               # Custom React hooks
│   │   ├── useChat.ts
│   │   ├── useRideRequests.ts
│   │   └── useVehicles.ts
│   ├── pages/               # Page components
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── OfferRidePage.tsx
│   │   ├── FindRidesPage.tsx
│   │   ├── ChatPage.tsx
│   │   ├── VehiclesPage.tsx
│   │   ├── AdminDashboard.tsx
│   │   └── PaymentMethodsPage.tsx
│   ├── lib/                 # Utility libraries
│   │   └── supabase.ts
│   ├── utils/               # Utility functions
│   ├── App.tsx              # Main app component
│   └── main.tsx            # App entry point
├── package.json
└── vite.config.ts
```

### Mobile (`/mobile`)
```
mobile/
├── src/
│   ├── components/          # Reusable mobile components
│   ├── contexts/            # React Context providers
│   │   └── AuthContext.tsx
│   ├── screens/             # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   └── DashboardScreen.tsx
│   ├── services/            # API services
│   │   ├── api.ts
│   │   └── authService.ts
│   ├── types/               # TypeScript definitions
│   │   └── index.ts
│   └── utils/               # Utility functions
├── App.tsx                  # Main app component
├── app.json                 # Expo configuration
└── package.json
```

## 🔧 Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account
- M-Pesa developer account (for payments)
- Twilio account (for SMS)
- Google Cloud Console project (for OAuth)

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   Create a `.env` file in the backend directory:
   ```env
   # Supabase Configuration
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # JWT Secret
   JWT_SECRET=your_jwt_secret

   # M-Pesa Configuration
   MPESA_CONSUMER_KEY=your_mpesa_consumer_key
   MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
   MPESA_SHORTCODE=your_business_shortcode
   MPESA_PASSKEY=your_mpesa_passkey
   MPESA_CALLBACK_URL=http://localhost:5000/api/mpesa/callback

   # Twilio Configuration
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_phone_number

   # Server Configuration
   PORT=5000
   ```

4. **Start the server**
   ```bash
   npm start
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   Create a `.env` file in the frontend directory:
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

   # API Configuration
   VITE_API_URL=http://localhost:5000/api
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

### Database Setup (Supabase)

1. **Create a new Supabase project**
2. **Run the database migrations** (SQL files in `/backend/sql/`)
3. **Enable Row Level Security (RLS)** for all tables
4. **Create storage buckets**:
   - `user-uploads` for profile photos and documents
   - Set appropriate policies for file access

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/verify-email` - Verify email address
- `POST /api/auth/verify-phone` - Verify phone number
- `POST /api/auth/google` - Google OAuth login

### Profile Management
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile
- `POST /api/profile/change-password` - Change password
- `POST /api/profile/upload-photo` - Upload profile photo

### Rides
- `GET /api/rides` - Get available rides
- `POST /api/rides` - Create new ride
- `GET /api/rides/:id` - Get specific ride
- `PUT /api/rides/:id` - Update ride
- `DELETE /api/rides/:id` - Cancel ride

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get user bookings
- `PATCH /api/bookings/:id/cancel` - Cancel booking

### M-Pesa Payments
- `POST /api/mpesa/stk-push` - Initiate STK Push
- `POST /api/mpesa/callback` - Handle payment callback

### Vehicle Management
- `GET /api/vehicles` - Get user vehicles
- `POST /api/vehicles` - Add new vehicle
- `PUT /api/vehicles/:id` - Update vehicle
- `DELETE /api/vehicles/:id` - Delete vehicle

### Chat System
- `GET /api/chat/conversations` - Get user conversations
- `POST /api/chat/conversations` - Start new conversation
- `GET /api/chat/conversations/:id/messages` - Get conversation messages
- `POST /api/chat/conversations/:id/messages` - Send message

### Driver Verification
- `POST /api/driver-verification/upload` - Upload driver documents
- `GET /api/driver-verification/status` - Check verification status

### Admin
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id` - Update user
- `GET /api/admin/drivers/pending` - Get pending driver verifications
- `PUT /api/admin/drivers/:id/verify` - Verify driver

## 🔐 Environment Variables

### Backend Environment Variables
```env
# Database
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Authentication
JWT_SECRET=

# M-Pesa
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
MPESA_CALLBACK_URL=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Server
PORT=5000
```

### Frontend Environment Variables
```env
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# API
VITE_API_URL=http://localhost:5000/api
```

## 🚦 Development Workflow

### Backend Development
1. Make changes to controllers, routes, or middleware
2. Test endpoints using Postman or curl
3. Ensure proper error handling and validation
4. Update documentation if API changes

### Frontend Development
1. Create/modify React components
2. Update TypeScript interfaces if needed
3. Test user interactions and API integration
4. Ensure responsive design

### Testing M-Pesa Integration
Use the sandbox credentials:
- **Phone**: 254708374149
- **PIN**: 1234

## 📋 Current Status

### ✅ Completed Features
- User authentication system (email/password + Google OAuth)
- Profile management with photo upload
- M-Pesa payment integration with STK Push
- Driver document verification system
- Vehicle management for drivers
- In-app chat system between drivers and passengers
- Admin dashboard for user and driver management
- Real-time ride status tracking
- Service fee payment system
- React frontend with responsive design
- Basic React Native app structure

### 🔄 In Progress
- Mobile app development (dependency issues to resolve)
- Enhanced analytics dashboard
- Rating and review system

### 📋 Planned Features
- Push notifications
- Advanced trip analytics
- Referral system
- Multi-language support
- Offline mode for mobile app
- Advanced route optimization

## 🐛 Known Issues

1. **Mobile App Dependencies**: Some Expo dependencies have version conflicts
2. **File Upload Size**: Large file uploads may timeout
3. **M-Pesa Callback**: Ensure proper webhook URL configuration for production

## 🔧 Troubleshooting

### Common Backend Issues
1. **Database Connection**: Verify Supabase credentials
2. **M-Pesa Integration**: Check sandbox/production environment settings
3. **File Uploads**: Ensure storage bucket permissions are correct

### Common Frontend Issues
1. **CORS Errors**: Check backend CORS configuration
2. **Authentication**: Verify Supabase keys match backend configuration
3. **Build Errors**: Check TypeScript interfaces and imports

## 📖 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [M-Pesa API Documentation](https://developer.safaricom.co.ke/)
- [React Documentation](https://react.dev/)
- [Express.js Documentation](https://expressjs.com/)
- [React Native Documentation](https://reactnative.dev/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is proprietary software. All rights reserved.

---

**ShareLyft** - Connecting rides, simplifying journeys.
