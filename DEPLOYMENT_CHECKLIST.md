# 🚀 BharBike Backend - Deployment Checklist

## Pre-Deployment Checklist

### 1. Supabase Setup
- [ ] Supabase project created
- [ ] Database tables created (run `setup-database.sql`)
- [ ] Storage buckets created:
  - [ ] `kyc-documents` (public)
  - [ ] `support-tickets` (public)
- [ ] Service role key copied (Settings → API)
- [ ] Project URL copied

### 2. Razorpay Setup
- [ ] Razorpay account created
- [ ] Test API keys obtained
- [ ] Webhook configured (optional)

### 3. Code Preparation
- [ ] Code pushed to GitHub repository
- [ ] `.env.example` reviewed
- [ ] All dependencies in `package.json`

---

## Render Deployment Steps

### Step 1: Create Web Service
- [ ] Logged into Render (https://dashboard.render.com)
- [ ] Clicked "New +" → "Web Service"
- [ ] Connected GitHub repository
- [ ] Selected correct repository

### Step 2: Basic Configuration
- [ ] **Name:** `bharbike-backend` (or your choice)
- [ ] **Region:** Singapore (or closest to users)
- [ ] **Branch:** `main`
- [ ] **Runtime:** Node
- [ ] **Build Command:** `npm install`
- [ ] **Start Command:** `npm start`

### Step 3: Environment Variables

Copy these to Render Environment tab:

```bash
# REQUIRED - Server
PORT=10000
NODE_ENV=production

# REQUIRED - Supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_KEY=your_service_role_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# REQUIRED - Security
JWT_SECRET=generate_32_char_random_string_here

# REQUIRED - Admin Access
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_this_secure_password

# REQUIRED - CORS (Add your frontend URLs)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# REQUIRED - Razorpay
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_MODE=test

# OPTIONAL - Demo (Set to false for production)
ENABLE_DEMO_OTP=false
DEMO_OTP=123456

# OPTIONAL - Loconav GPS Tracking
LOCONAV_USER_AUTH_TOKEN=your_loconav_token_if_using
```

**Environment Variables Checklist:**
- [ ] PORT set to 10000
- [ ] NODE_ENV set to production
- [ ] SUPABASE_URL added
- [ ] SUPABASE_KEY added (service_role key)
- [ ] JWT_SECRET generated and added
- [ ] ADMIN_PASSWORD changed from default
- [ ] CORS_ORIGINS updated with frontend URLs
- [ ] RAZORPAY_KEY_ID added
- [ ] RAZORPAY_KEY_SECRET added
- [ ] ENABLE_DEMO_OTP set to false

### Step 4: Advanced Settings
- [ ] **Health Check Path:** `/health`
- [ ] **Auto-Deploy:** Enabled (optional)

### Step 5: Deploy
- [ ] Clicked "Create Web Service"
- [ ] Waited for build to complete (5-10 minutes)
- [ ] Checked logs for errors

---

## Post-Deployment Verification

### 1. Health Check
```bash
curl https://your-service-name.onrender.com/health
# Expected: "OK"
```
- [ ] Health endpoint returns "OK"

### 2. Root Endpoint
```bash
curl https://your-service-name.onrender.com/
# Expected: "Backend running"
```
- [ ] Root endpoint returns "Backend running"

### 3. Database Connection
Check Render logs for:
- [ ] "Server running on port 10000"
- [ ] "Backend Connection Success"
- [ ] No Supabase connection errors

### 4. Test API Endpoints

#### Test User Creation
```bash
curl -X POST https://your-service-name.onrender.com/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-user-123",
    "full_name": "Test User",
    "email": "test@example.com",
    "phone": "+919876543210",
    "location": "Delhi"
  }'
```
- [ ] User creation works

#### Test Bikes Listing
```bash
curl https://your-service-name.onrender.com/api/bikes
```
- [ ] Bikes endpoint returns data

#### Test Orders Endpoint
```bash
curl https://your-service-name.onrender.com/api/orders
```
- [ ] Orders endpoint returns data

### 5. Frontend Integration
- [ ] Updated frontend `.env` with new backend URL
- [ ] Frontend can connect to backend
- [ ] Login/signup works
- [ ] API calls successful

---

## Frontend Configuration

Update these files in `BharBike franted/`:

### `.env` file:
```bash
EXPO_PUBLIC_API_URL=https://your-service-name.onrender.com
VITE_API_URL=https://your-service-name.onrender.com
REACT_APP_API_URL=https://your-service-name.onrender.com

# Supabase (Frontend - use anon key, NOT service_role)
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your_anon_key_here
```

- [ ] Backend URL updated in frontend
- [ ] Frontend rebuilt/redeployed
- [ ] Tested on mobile app

---

## Feature Testing

### Authentication
- [ ] OTP send works
- [ ] OTP verify works
- [ ] User profile creation works

### Bike Rental
- [ ] Bike listing loads
- [ ] Bike booking works
- [ ] Rental creation successful

### Payments
- [ ] Razorpay order creation works
- [ ] Payment verification works
- [ ] Order status updates

### KYC
- [ ] Document upload works
- [ ] KYC submission successful
- [ ] Status check works

### Support Tickets
- [ ] Ticket creation works
- [ ] Image upload works
- [ ] Ticket listing works

### Delivery Partner
- [ ] Application submission works
- [ ] Status check works
- [ ] Admin approval/rejection works

### Admin Panel
- [ ] Admin login works (`/admin`)
- [ ] Dashboard loads
- [ ] Order management works
- [ ] KYC approval works

---

## Production Readiness

### Security
- [ ] All default passwords changed
- [ ] JWT_SECRET is strong (32+ characters)
- [ ] Service role key kept secret
- [ ] CORS properly configured
- [ ] HTTPS enabled (automatic on Render)
- [ ] Demo OTP disabled

### Performance
- [ ] Database indexes created
- [ ] Health checks configured
- [ ] Logs monitored

### Monitoring
- [ ] Render metrics enabled
- [ ] Error tracking setup (optional: Sentry)
- [ ] Uptime monitoring (optional: UptimeRobot)

### Backup
- [ ] Supabase automatic backups enabled
- [ ] Environment variables documented
- [ ] Database schema backed up

---

## Common Issues & Solutions

### Issue: "Server not responding"
**Solution:**
- Check Render logs for errors
- Verify service is not sleeping (free tier)
- Check if PORT is set to 10000

### Issue: "Database connection failed"
**Solution:**
- Verify SUPABASE_URL is correct
- Ensure using service_role key (not anon key)
- Check Supabase project is active

### Issue: "CORS errors in frontend"
**Solution:**
- Add frontend URL to CORS_ORIGINS
- Format: `https://domain.com,https://www.domain.com`
- No spaces between URLs
- Redeploy backend after change

### Issue: "Payment creation failed"
**Solution:**
- Verify Razorpay keys are correct
- Check RAZORPAY_MODE (test/live)
- Ensure Razorpay account is active

### Issue: "File upload failed"
**Solution:**
- Verify Supabase storage buckets exist
- Check bucket permissions (public)
- Verify service_role key has storage access

---

## Upgrade to Production

### When Ready for Production:

1. **Upgrade Render Plan**
   - [ ] Upgrade to Starter ($7/month) or higher
   - [ ] Eliminates cold starts
   - [ ] Better performance

2. **Switch Razorpay to Live Mode**
   - [ ] Get live API keys from Razorpay
   - [ ] Update RAZORPAY_KEY_ID
   - [ ] Update RAZORPAY_KEY_SECRET
   - [ ] Set RAZORPAY_MODE=live

3. **Add Custom Domain**
   - [ ] Purchase domain
   - [ ] Add to Render
   - [ ] Update DNS records
   - [ ] Update CORS_ORIGINS
   - [ ] Update frontend API URL

4. **Enable Monitoring**
   - [ ] Set up error tracking
   - [ ] Configure uptime monitoring
   - [ ] Set up alerts

---

## Final Checklist

- [ ] Backend deployed and running
- [ ] All environment variables set
- [ ] Database tables created
- [ ] Storage buckets configured
- [ ] Frontend connected to backend
- [ ] All features tested
- [ ] Admin panel accessible
- [ ] Payments working
- [ ] Security measures in place
- [ ] Monitoring configured
- [ ] Documentation updated
- [ ] Team notified of deployment

---

## Deployment URLs

**Record these for your team:**

| Service | URL |
|---------|-----|
| Backend API | `https://your-service-name.onrender.com` |
| Health Check | `https://your-service-name.onrender.com/health` |
| Admin Panel | `https://your-service-name.onrender.com/admin` |
| Supabase Dashboard | `https://app.supabase.com/project/YOUR_PROJECT` |
| Render Dashboard | `https://dashboard.render.com` |
| Razorpay Dashboard | `https://dashboard.razorpay.com` |

---

## Support Contacts

- **Render Support:** https://render.com/docs
- **Supabase Support:** https://supabase.com/docs
- **Razorpay Support:** https://razorpay.com/support

---

**🎉 Deployment Complete!**

Your BharBike backend is now live and production-ready.
