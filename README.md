# ASAP Parking 🚀
> Premium Real-time Peer-to-Peer Parking Marketplace

ASAP Parking transforms empty driveways, garages, and commercial spaces into active, bookable parking nodes. Drivers can search, book, pay, and check-in via QR codes in real-time, while hosts monetize idle property space with full operational dashboard controls.

---

## 🏗️ Core Stack

- **Frontend:** React, Vite, Framer Motion, Vanilla CSS, Axios
- **Backend:** Node.js, Express, MongoDB (Mongoose), Socket.io, Firebase Admin SDK
- **Gateways & Integrations:** Razorpay (Payments), Cloudinary (Image Hosting), Google Maps API (Geospatial maps & markers)

---

## 📂 Repository Directory Structure

```
ASAP/
├── backend/
│   ├── config/              # MongoDB connection & Firebase Admin setup
│   ├── controllers/         # API business logic (Auth, Parking, Bookings, Payments, Admin)
│   ├── middleware/          # Security (XSS, MongoSanitize, Validator), Error Handling, Auth
│   ├── models/              # Mongoose database schemas (User, Parking, Booking, Payment, Issue, Review)
│   ├── routes/              # Express API route endpoints
│   ├── utils/               # ApiError, helper modules
│   ├── seeder.js            # Mumbai-specific mock database seeder (50+ spots, bookings, reviews)
│   ├── test_full_marketplace.js # 10-step E2E verification suite
│   ├── index.js             # Express API entrypoint
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # UI elements, ParkingCard, Maps, SearchBar
│   │   ├── context/         # Auth React Context
│   │   ├── pages/           # Search, HostDashboard, UserDashboard, AdminDashboard, Checkout
│   │   ├── services/        # Axios API client setup (api.js), socket listeners
│   │   ├── utils/           # normalizeImageUrl, formatters
│   │   ├── App.jsx          # React app routes
│   │   ├── main.jsx         # React application bootstrap
│   │   └── index.css        # Core custom premium stylesheet (Dark mode, glassmorphism)
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## ⚙️ Environment Variables

### Backend Configuration (`backend/.env`)
```ini
PORT=5000
MONGO_URI=your_mongodb_connection_uri
JWT_SECRET=your_jwt_access_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
FRONTEND_URL=http://localhost:5173

# Firebase configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Cloudinary configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Razorpay configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### Frontend Configuration (`frontend/.env`)
```ini
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

---

## ⚡ Quick Start

### 1. Database Seeding & Mock Data
Ensure MongoDB is running locally or connection string is active. Seed the database with 50+ Mumbai spots, active bookings, testimonials, and reviews in one command:
```bash
cd backend
npm run seed
```

### 2. Startup Server & UI
```bash
# Start backend API (runs on http://localhost:5000)
cd backend
npm install
npm run dev

# Start frontend application (runs on http://localhost:5173)
cd ../frontend
npm install
npm run dev
```

---

## 🧪 Testing and Verification Suite

Run the automated integration verification suite covering all 10 core flows of the peer-to-peer lifecycle:
```bash
cd backend
node test_full_marketplace.js
```
The test suite validates:
1. Host registration
2. Parking spot listing creation
3. Onboarding moderation approval
4. Geospatial proximity search
5. Booking initialization
6. Payment gateway signature checks
7. Secure QR check-in gate
8. Session transition and timers
9. Gate check-out and reviews
10. Raising disputes and admin refund processes
