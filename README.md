# BharBike Backend API

Smart Bike Rental + Delivery Partner Management System

## 🚀 Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Start server:**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

4. **Server runs on:** `http://localhost:3000`

---

## 📦 Deployment

### Deploy to Render

**Quick Deploy:**
1. Read `DEPLOYMENT_GUIDE.md` for complete instructions
2. Follow `DEPLOYMENT_CHECKLIST.md` step-by-step
3. Run `setup-database.sql` in Supabase
4. Configure environment variables on Render
5. Deploy!

**Verify Deployment:**
```bash
chmod +x verify-deployment.sh
./verify-deployment.sh https://your-service-name.onrender.com
```

---

## 🏗️ Architecture

### Tech Stack
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage
- **Payments:** Razorpay
- **Auth:** JWT + Supabase Auth
- **Realtime:** Socket.io (optional)
- **Jobs:** node-cron

### Project Structure
```
src/
├── server.js              # Entry point
├── app.js                 # Express configuration
├── routes/                # API routes
│   ├── index.js          # Main API router
│   ├── auth.routes.js    # Authentication
│   ├── user.routes.js    # User management
│   ├── bike.routes.js    # Bike operations
│   ├── rental.routes.js  # Rental management
│   ├── delivery.routes.js # Delivery partners
│   └── order.routes.js   # Order management
├── controllers/           # Business logic
├── middleware/            # Auth, validation, errors
├── services/              # Business services
├── models/                # Data models
├── utils/                 # Helper functions
├── config/                # Configuration
├── admin/                 # Admin panel (EJS)
├── realtime/              # WebSocket handlers
└── jobs/                  # Scheduled tasks
```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP to phone
- `POST /api/auth/verify-otp` - Verify OTP and login

### Users
- `GET /api/users/:userId` - Get user profile
- `POST /api/users` - Create/update user
- `PUT /api/users/:userId` - Update user profile

### Bikes
- `GET /api/bikes` - List all bikes
- `GET /api/bikes/:id` - Get bike details
- `POST /api/bikes` - Create bike (admin)
- `PUT /api/bikes/:id` - Update bike (admin)

### Rentals & Bookings
- `POST /api/rentals` - Create rental
- `GET /api/rentals` - List rentals
- `GET /api/bookings` - Get user bookings

### Orders
- `GET /api/orders` - List orders
- `GET /api/orders/:id` - Get order details
- `POST /api/orders/accept` - Accept order
- `POST /api/orders/reject` - Reject order
- `POST /api/orders/complete` - Complete order

### Payments
- `POST /api/create-order` - Create Razorpay order
- `POST /api/verify-payment` - Verify payment

### Delivery Partners
- `POST /api/delivery/apply` - Apply as partner
- `GET /api/delivery/status` - Check application status
- `GET /api/delivery-partner/orders` - Get active orders

### KYC
- `POST /api/upload-document` - Upload KYC document
- `POST /api/kyc/electricity` - Submit electricity bill
- `POST /api/kyc/driving-license` - Submit license
- `GET /api/kyc/summary` - Get KYC summary

### Support
- `POST /api/support/create` - Create ticket
- `POST /api/support/upload` - Upload image
- `GET /api/support/user/:userId` - Get user tickets

### Admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/health` - System health
- `GET /api/admin/orders` - Manage orders
- `GET /api/admin/kyc` - Manage KYC
- `PATCH /api/admin/kyc/:id` - Approve/reject KYC
- `GET /api/admin/support` - Manage tickets
- `PATCH /api/admin/delivery/:id` - Approve/reject partner

---

## 🔐 Environment Variables

### Required Variables

```bash
# Server
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key

# Security
JWT_SECRET=your_jwt_secret_min_32_chars

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure_password

# Payments
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_MODE=test
```

### Optional Variables

```bash
# CORS
CORS_ORIGINS=http://localhost:8081,http://localhost:19006

# Demo OTP (development only)
ENABLE_DEMO_OTP=true
DEMO_OTP=123456

# GPS Tracking
LOCONAV_USER_AUTH_TOKEN=your_token
```

---

## 🗄️ Database Setup

### 1. Create Supabase Project
1. Go to https://supabase.com
2. Create new project
3. Wait for database to initialize

### 2. Run Database Setup
```sql
-- In Supabase SQL Editor, run:
-- File: setup-database.sql
```

This creates:
- All required tables
- Indexes for performance
- RLS policies for security
- Triggers for timestamps

### 3. Create Storage Buckets
1. Go to Storage in Supabase Dashboard
2. Create bucket: `kyc-documents` (public)
3. Create bucket: `support-tickets` (public)

---

## 🧪 Testing

### Manual Testing

```bash
# Health check
curl http://localhost:3000/health

# Create user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-123",
    "full_name": "Test User",
    "email": "test@example.com",
    "phone": "+919876543210"
  }'

# List bikes
curl http://localhost:3000/api/bikes
```

### Automated Testing

```bash
# Run verification script
./verify-deployment.sh http://localhost:3000
```

---

## 🔧 Development

### Start Development Server
```bash
npm run dev
```

### Code Structure Guidelines
- Routes handle HTTP requests
- Controllers contain business logic
- Services handle data operations
- Middleware for cross-cutting concerns
- Utils for helper functions

### Adding New Endpoints
1. Create route in `src/routes/`
2. Create controller in `src/controllers/`
3. Add service logic in `src/services/`
4. Register route in `src/routes/index.js`

---

## 🚨 Troubleshooting

### Server won't start
- Check PORT is available
- Verify all environment variables are set
- Check Node.js version (18+)

### Database connection failed
- Verify SUPABASE_URL is correct
- Ensure using service_role key (not anon)
- Check Supabase project is active

### CORS errors
- Add frontend URL to CORS_ORIGINS
- Format: `http://localhost:8081,http://localhost:19006`
- Restart server after changes

### Payment errors
- Verify Razorpay keys are correct
- Check RAZORPAY_MODE (test/live)
- Ensure Razorpay account is active

---

## 📚 Documentation

- **Deployment Guide:** `DEPLOYMENT_GUIDE.md`
- **Deployment Checklist:** `DEPLOYMENT_CHECKLIST.md`
- **Database Schema:** `setup-database.sql`
- **API Documentation:** See endpoints section above

---

## 🔒 Security

### Best Practices
- ✅ Use service_role key only on server
- ✅ Never expose service_role key in frontend
- ✅ Use strong JWT_SECRET (32+ characters)
- ✅ Change default admin password
- ✅ Enable HTTPS in production
- ✅ Configure CORS properly
- ✅ Validate all inputs
- ✅ Use RLS policies in Supabase

### Security Checklist
- [ ] JWT_SECRET is strong and unique
- [ ] Admin password changed from default
- [ ] Service role key kept secret
- [ ] CORS configured for production domains
- [ ] HTTPS enabled (automatic on Render)
- [ ] Demo OTP disabled in production
- [ ] Input validation on all endpoints
- [ ] Rate limiting configured (optional)

---

## 📊 Monitoring

### Health Endpoint
```bash
GET /health
Response: "OK"
```

### Admin Health Dashboard
```bash
GET /api/admin/health
Response: {
  status: "running",
  uptime: 12345,
  memory: 123456789,
  users: 100,
  bikes: 50,
  rentals: 200
}
```

### Logs
- Check Render logs for errors
- Monitor Supabase logs for database issues
- Set up error tracking (Sentry, etc.)

---

## 🤝 Support

### Resources
- **Render Docs:** https://render.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Razorpay Docs:** https://razorpay.com/docs
- **Express Docs:** https://expressjs.com

### Common Issues
See `DEPLOYMENT_GUIDE.md` troubleshooting section

---

## 📝 License

Proprietary - BharBike

---

## 👥 Team

Developed for BharBike bike rental platform

---

**🎉 Happy Coding!**
