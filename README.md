# ShareLyft - Ride Sharing Platform

ShareLyft is a community-centered ride-sharing platform designed for the Kenyan market. It connects drivers and passengers directly with a transparent flat-fee model, focusing on longer routes and intercity travel.

## Project Structure

The project is organized into two main parts:

- **Frontend**: - React 18 + TypeScript, Vite, Tailwind CSS, Lucide React Icons, React Router
- **Backend**: - Node.js + Express, Supabase (PostgreSQL), JWT Authentication, Multer for file uploads

## Core Features

- User registration and authentication
- Ride management (offering, searching, requesting)
- Direct payment between drivers and passengers
- Rating and review system
- User profiles with verification

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Supabase account for backend

### Frontend Setup

1. Navigate to the frontend directory:

   ```
   cd frontend
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Start the development server:

   ```
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view the application

### Backend Setup

1. Navigate to the backend directory:

   ```
   cd backend
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example` and configure your environment variables:

   ```
   cp .env.example .env
   ```

4. Start the development server:

   ```
   npm run dev
   ```

5. The API will be available at [http://localhost:5000](http://localhost:5000)

## Technologies Used

### Frontend

- Next.js (React framework)
- Tailwind CSS (styling)
- Context API (state management)

### Backend

- Node.js with Express
- Supabase (database and authentication)
- JWT (authentication)
- Jest (testing)

## Development Roadmap

### Phase 1: MVP

- Basic user authentication
- Ride offering and requesting
- Simple profiles
- Connection fee payment processing
- Basic admin dashboard

### Phase 2: Enhanced Features

- In-app chat
- Enhanced profiles
- Ratings and reviews
- Ride history
- Advanced search and filters

### Phase 3: Growth & Optimization

- Route suggestions
- Recurring rides
- Carpool matching
- Advanced analytics
- Loyalty program
