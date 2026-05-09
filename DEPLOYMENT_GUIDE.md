# BharBike Backend - Render Deployment Guide

## 🚀 Complete Deployment Checklist

### **Prerequisites**

1. ✅ Render account (https://render.com)
2. ✅ Supabase project with database setup
3. ✅ Razorpay account (for payments)
4. ✅ GitHub repository (recommended) or manual deployment

---

## **Step 1: Prepare Supabase Database**

### 1.1 Create Required Tables

Run these SQL scripts in Supabase SQL Editor:

```sql
-- Users/Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (extended profile)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  location TEXT,
  aadhaar_front_url TEXT,
  aadhaar_back_url TEXT,
  pan_card_url TEXT,
  electricity_bill_url TEXT,
  selfie_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bikes table
CREATE TABLE IF NOT EXISTS bikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  model TEXT,
  type TEXT,
  price_per_hour DECIMAL(10,2),
  price_per_day DECIMAL(10,2),
  available BOOLEAN DEFAULT true,
  location TEXT,
  battery_level INTEGER,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code TEXT UNIQUE,
  user_id UUID REFERENCES users(id),
  bike_id UUID REFERENCES bikes(id),
  plan_name TEXT,
  pickup_location TEXT,
  drop_location TEXT,
  price DECIMAL(10,2),
  amount DECIMAL(10,2),
  distance DECIMAL(10,2),
  status TEXT DEFAULT 'pending',
  tracking_link TEXT,
  vehicle_id UUID,
  earnings DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delivery Partners table
CREATE TABLE IF NOT EXISTS delivery_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  full_name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  city TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  license_number TEXT NOT NULL,
  aadhar_number TEXT NOT NULL,
  license_url TEXT,
  aadhar_url TEXT,
  photo_url TEXT,
  pan_url TEXT,
  electricity_bill_url TEXT,
  status TEXT DEFAULT 'review',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- KYC Documents table
CREATE TABLE IF NOT EXISTS kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL,
  consumer_name TEXT,
  consumer_number TEXT,
  board_name TEXT,
  address TEXT,
  file_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support Tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE,
  user_id UUID REFERENCES users(id),
  bike_name TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles table (for GPS tracking)
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_uuid TEXT UNIQUE,
  name TEXT,
  registration_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rentals/Bookings table
CREATE TABLE IF NOT EXISTS rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_id UUID REFERENCES bikes(id),
  user_id UUID REFERENCES users(id),
  duration INTEGER,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Configs table
CREATE TABLE IF NOT EXISTS payment_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  key_id TEXT NOT NULL,
  key_secret TEXT NOT NULL,
  mode TEXT DEFAULT 'test',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rider Skipped Days table
CREATE TABLE IF NOT EXISTS rider_skipped_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  skip_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.2 Create Storage Buckets

In Supabase Dashboard → Storage:

1. Create bucket: `kyc-documents` (Public)
2. Create bucket: `support-tickets` (Public)

### 1.3 Set Up RLS Policies (Optional but Recommended)

```sql
-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own tickets
CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to create tickets
CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## **Step 2: Deploy to Render**

### Method A: Deploy from GitHub (Recommended)

1. **Push code to GitHub:**
   ```bash
   cd "bike rental system backend"
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Create Web Service on Render:**
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the backend repository

3. **Configure Service:**
   - **Name:** `bharbike-backend`
   - **Region:** Singapore (or closest to your users)
   - **Branch:** `main`
   - **Root Directory:** Leave blank (or specify if in monorepo)
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (or paid for production)

### Method B: Manual Deploy

1. Go to Render Dashboard
2. Click "New +" → "Web Service"
3. Choose "Deploy an existing image from a registry" or "Public Git repository"
4. Enter repository URL

---

## **Step 3: Configure Environment Variables**

In Render Dashboard → Your Service → Environment:

### **Required Variables:**

```bash
# Server Configuration
PORT=10000
NODE_ENV=production

# Supabase Configuration (CRITICAL)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_KEY=your_service_role_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# JWT Secret (Generate a strong random string)
JWT_SECRET=your_super_secret_jwt_key_min_32_chars

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_admin_password

# CORS Origins (Your frontend URLs)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Razorpay Payment Gateway
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_MODE=test

# Optional: Demo OTP (disable in production)
ENABLE_DEMO_OTP=false
```

### **How to Get Supabase Keys:**

1. Go to Supabase Dashboard
2. Select your project
3. Go to Settings → API
4. Copy:
   - **URL:** Project URL
   - **service_role key:** (⚠️ Keep secret! Server-side only)

### **Generate JWT Secret:**

```bash
# Run this in terminal to generate a secure secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## **Step 4: Configure Health Checks**

In Render Dashboard → Your Service → Settings:

- **Health Check Path:** `/health`
- **Health Check Timeout:** 30 seconds

---

## **Step 5: Update Frontend Configuration**

Update the frontend `.env` file:

```bash
# In: BharBike franted/.env
EXPO_PUBLIC_API_URL=https://bharbike-backend.onrender.com
VITE_API_URL=https://bharbike-backend.onrender.com
REACT_APP_API_URL=https://bharbike-backend.onrender.com
```

---

## **Step 6: Test Deployment**

### 6.1 Check Health Endpoint

```bash
curl https://your-service-name.onrender.com/health
# Expected: "OK"
```

### 6.2 Test API Endpoints

```bash
# Test root
curl https://your-service-name.onrender.com/
# Expected: "Backend running"

# Test admin health (requires auth)
curl https://your-service-name.onrender.com/api/admin/health
```

### 6.3 Check Logs

In Render Dashboard → Your Service → Logs:

Look for:
- ✅ "Server running on port 10000"
- ✅ "Backend Connection Success"
- ❌ No database connection errors

---

## **Step 7: Production Optimizations**

### 7.1 Upgrade Render Plan

Free tier limitations:
- ⚠️ Spins down after 15 minutes of inactivity
- ⚠️ 750 hours/month free
- ⚠️ Slower cold starts

**Recommended for production:** Starter ($7/month) or higher

### 7.2 Add Custom Domain

1. Render Dashboard → Your Service → Settings → Custom Domain
2. Add your domain (e.g., `api.bharbike.com`)
3. Update DNS records as instructed
4. Update CORS_ORIGINS environment variable

### 7.3 Enable Auto-Deploy

Render Dashboard → Your Service → Settings:
- ✅ Enable "Auto-Deploy" for automatic deployments on git push

### 7.4 Set Up Monitoring

Consider adding:
- Render's built-in metrics
- External monitoring (UptimeRobot, Pingdom)
- Error tracking (Sentry)

---

## **Step 8: Security Checklist**

- [ ] Changed default admin password
- [ ] Using strong JWT_SECRET (32+ characters)
- [ ] SUPABASE_KEY is service_role (not anon key)
- [ ] CORS_ORIGINS set to actual frontend domains
- [ ] ENABLE_DEMO_OTP set to false
- [ ] Razorpay in test mode initially, switch to live after testing
- [ ] Environment variables marked as "secret" in Render
- [ ] HTTPS enabled (automatic on Render)

---

## **Step 9: Database Migrations**

Run these migrations in Supabase SQL Editor:

```sql
-- Add ticket_number column if missing
ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS ticket_number TEXT UNIQUE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_partners_user_id ON delivery_partners(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
```

---

## **Troubleshooting**

### Issue: "Server not responding"
- Check Render logs for errors
- Verify PORT is set to 10000
- Check if service is sleeping (free tier)

### Issue: "Database connection failed"
- Verify SUPABASE_URL is correct
- Verify SUPABASE_KEY is service_role key (not anon)
- Check Supabase project is active

### Issue: "CORS errors"
- Add frontend URL to CORS_ORIGINS
- Format: `https://domain.com,https://www.domain.com` (no spaces)

### Issue: "Payment creation failed"
- Verify Razorpay keys are correct
- Check RAZORPAY_MODE (test/live)
- Ensure Razorpay account is active

---

## **Post-Deployment**

1. **Test all features:**
   - User registration/login
   - Bike booking
   - Payment flow
   - KYC upload
   - Support tickets
   - Delivery partner application

2. **Monitor logs** for first 24 hours

3. **Set up alerts** for downtime

4. **Document your deployment URL** for the team

---

## **Support & Maintenance**

- **Render Status:** https://status.render.com
- **Supabase Status:** https://status.supabase.com
- **Logs:** Render Dashboard → Your Service → Logs
- **Restart Service:** Render Dashboard → Your Service → Manual Deploy → "Clear build cache & deploy"

---

## **Quick Reference**

| Service | URL |
|---------|-----|
| Backend API | `https://your-service.onrender.com` |
| Health Check | `https://your-service.onrender.com/health` |
| Admin Panel | `https://your-service.onrender.com/admin` |
| Supabase Dashboard | `https://app.supabase.com` |
| Render Dashboard | `https://dashboard.render.com` |

---

**🎉 Deployment Complete!**

Your BharBike backend is now live and ready for production use.
