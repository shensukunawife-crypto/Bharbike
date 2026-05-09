# 🚀 BharBike Backend - Quick Start for Client

## What You Need (5 Minutes Setup)

### 1. Create Supabase Account
1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub/Google
4. Create new project:
   - **Name:** BharBike
   - **Database Password:** (save this!)
   - **Region:** Choose closest to your users
5. Wait 2 minutes for setup

### 2. Setup Database
1. In Supabase Dashboard, click "SQL Editor"
2. Click "New Query"
3. Copy entire content from `setup-database.sql` file
4. Click "Run"
5. Wait for "Success" message

### 3. Create Storage Buckets
1. In Supabase Dashboard, click "Storage"
2. Click "New bucket"
3. Create bucket: `kyc-documents`
   - Make it **Public**
4. Create bucket: `support-tickets`
   - Make it **Public**

### 4. Get Supabase Keys
1. In Supabase Dashboard, click "Settings" → "API"
2. Copy these (you'll need them):
   - **Project URL:** `https://xxx.supabase.co`
   - **service_role key:** (the long secret key)

---

## Deploy to Render (10 Minutes)

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub
3. Authorize Render to access your repositories

### Step 2: Push Code to GitHub
```bash
cd "bike rental system backend"
git init
git add .
git commit -m "Initial deployment"
git branch -M main
# Create repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/bharbike-backend.git
git push -u origin main
```

### Step 3: Create Web Service on Render
1. In Render Dashboard, click "New +" → "Web Service"
2. Click "Connect a repository"
3. Select your `bharbike-backend` repository
4. Click "Connect"

### Step 4: Configure Service
Fill in these fields:

- **Name:** `bharbike-backend`
- **Region:** Singapore (or closest)
- **Branch:** `main`
- **Runtime:** Node
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Plan:** Free (upgrade later)

Click "Advanced" and add these environment variables:

### Step 5: Add Environment Variables

Click "Add Environment Variable" for each:

| Key | Value | Notes |
|-----|-------|-------|
| `PORT` | `10000` | Required by Render |
| `NODE_ENV` | `production` | Production mode |
| `SUPABASE_URL` | `https://xxx.supabase.co` | From Supabase Settings → API |
| `SUPABASE_KEY` | `eyJxxx...` | service_role key from Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJxxx...` | Same as above |
| `JWT_SECRET` | Generate below ⬇️ | 32+ character random string |
| `ADMIN_USERNAME` | `admin` | Admin login username |
| `ADMIN_PASSWORD` | `YourSecurePass123!` | Change this! |
| `RAZORPAY_KEY_ID` | `rzp_test_xxx` | From Razorpay dashboard |
| `RAZORPAY_KEY_SECRET` | `xxx` | From Razorpay dashboard |
| `RAZORPAY_MODE` | `test` | Use 'test' initially |
| `CORS_ORIGINS` | `https://yourdomain.com` | Your frontend URL |
| `ENABLE_DEMO_OTP` | `false` | Disable demo mode |

**Generate JWT_SECRET:**
```bash
# Run this in terminal:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy the output
```

### Step 6: Deploy!
1. Click "Create Web Service"
2. Wait 5-10 minutes for deployment
3. Watch the logs for "Server running on port 10000"

---

## Get Razorpay Keys (5 Minutes)

### If you don't have Razorpay account:
1. Go to https://razorpay.com
2. Sign up
3. Complete KYC (for live mode later)
4. Go to Settings → API Keys
5. Generate Test Keys
6. Copy:
   - **Key ID:** `rzp_test_xxx`
   - **Key Secret:** `xxx`

---

## Verify Deployment (2 Minutes)

### Test 1: Health Check
Open in browser:
```
https://your-service-name.onrender.com/health
```
Should show: `OK`

### Test 2: Backend Running
Open in browser:
```
https://your-service-name.onrender.com/
```
Should show: `Backend running`

### Test 3: Run Verification Script
```bash
chmod +x verify-deployment.sh
./verify-deployment.sh https://your-service-name.onrender.com
```

---

## Update Frontend (3 Minutes)

### In your frontend project:

1. Open `BharBike franted/.env`
2. Update these lines:
```bash
EXPO_PUBLIC_API_URL=https://your-service-name.onrender.com
VITE_API_URL=https://your-service-name.onrender.com
REACT_APP_API_URL=https://your-service-name.onrender.com

# Use anon key for frontend (NOT service_role)
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your_anon_key_here
```

3. Restart your frontend app

---

## Test Everything (5 Minutes)

### From your mobile app, test:
- [ ] User registration/login
- [ ] View bikes
- [ ] Create booking
- [ ] Make payment
- [ ] Upload KYC documents
- [ ] Create support ticket
- [ ] Apply as delivery partner

### Test Admin Panel:
1. Go to: `https://your-service-name.onrender.com/admin`
2. Login with ADMIN_USERNAME and ADMIN_PASSWORD
3. Check dashboard loads

---

## 🎉 You're Done!

Your backend is now:
- ✅ Deployed on Render
- ✅ Connected to Supabase database
- ✅ Integrated with Razorpay
- ✅ Ready for production use

---

## Important URLs to Save

| Service | URL |
|---------|-----|
| **Backend API** | `https://your-service-name.onrender.com` |
| **Admin Panel** | `https://your-service-name.onrender.com/admin` |
| **Render Dashboard** | https://dashboard.render.com |
| **Supabase Dashboard** | https://app.supabase.com |
| **Razorpay Dashboard** | https://dashboard.razorpay.com |

---

## Next Steps

### For Production:
1. **Upgrade Render Plan** ($7/month Starter)
   - No cold starts
   - Better performance
   - 24/7 uptime

2. **Switch Razorpay to Live Mode**
   - Complete KYC on Razorpay
   - Generate live keys
   - Update environment variables

3. **Add Custom Domain**
   - Buy domain (e.g., api.bharbike.com)
   - Add to Render
   - Update CORS_ORIGINS

4. **Enable Monitoring**
   - Set up UptimeRobot
   - Configure error alerts
   - Monitor logs daily

---

## Need Help?

### Check These First:
1. **Logs:** Render Dashboard → Your Service → Logs
2. **Deployment Guide:** Read `DEPLOYMENT_GUIDE.md`
3. **Checklist:** Follow `DEPLOYMENT_CHECKLIST.md`

### Common Issues:

**"Server not responding"**
- Free tier sleeps after 15 min inactivity
- First request takes 30-60 seconds to wake up
- Upgrade to paid plan to fix

**"Database connection failed"**
- Check SUPABASE_URL is correct
- Verify using service_role key (not anon)
- Check Supabase project is active

**"CORS errors"**
- Add your frontend URL to CORS_ORIGINS
- Format: `https://domain.com` (no trailing slash)
- Redeploy after changing

---

## Support

- **Render Docs:** https://render.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Razorpay Docs:** https://razorpay.com/docs

---

**🚀 Your BharBike backend is live and ready!**
