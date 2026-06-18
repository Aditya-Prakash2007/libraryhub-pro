# LibraryHub Pro — Complete Setup Guide

## Step 1: MongoDB Atlas Free Database Setup

### 1.1 Create Account
Go to: https://cloud.mongodb.com
→ Sign up free

### 1.2 Create Cluster
- Click "Build a Database"
- Choose **FREE (M0 Sandbox)**
- Provider: AWS, Region: closest to you
- Cluster name: `Cluster0`
- Click "Create"

### 1.3 Create Database User
- Go to **Security → Database Access**
- Click "Add New Database User"
- Username: `libraryadmin`
- Password: Create a strong password (save it!)
- Role: **Atlas Admin**
- Click "Add User"

### 1.4 Allow Network Access
- Go to **Security → Network Access**
- Click "Add IP Address"
- Click "Allow Access from Anywhere" (0.0.0.0/0)
- Click "Confirm"

### 1.5 Get Connection String
- Go to **Database → Connect**
- Click "Connect your application"
- Driver: Node.js, Version: 5.5+
- Copy the connection string — looks like:
  `mongodb+srv://libraryadmin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`

### 1.6 Update .env
Replace the DATABASE_URL in `.env`:
```
DATABASE_URL="mongodb+srv://libraryadmin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/libraryhub-pro?retryWrites=true&w=majority"
```
⚠️ Replace `YOUR_PASSWORD` with your actual password
⚠️ Replace `cluster0.xxxxx` with your actual cluster address
⚠️ Make sure `/libraryhub-pro` is in the URL (database name)

---

## Step 2: Run Setup Commands

```bash
cd libraryhub-pro

# 1. Generate Prisma client
npm run db:generate

# 2. Push schema to MongoDB (creates collections)
npm run db:push

# 3. Seed demo data (creates test users)
npm run db:seed

# 4. Start dev server
npm run dev
```

---

## Step 3: Login Credentials

After seeding, use these at http://localhost:3000/login:

| Role | Email | Password | Select Role |
|------|-------|----------|-------------|
| Super Admin | superadmin@libraryhub.com | SuperAdmin@123 | Library Owner |
| Library Admin | admin@demolibrary.com | Admin@123 | Library Owner |
| Student | student@demolibrary.com | Student@123 | Student |

**Note:** For Super Admin, click "Library Owner" on role select screen — they bypass role check automatically.

---

## Step 4: Verify Database Connection

Run this to test:
```bash
npx tsx scripts/test-db.ts
```

---

## Common Issues

### "Invalid URL" error
→ Make sure DATABASE_URL has your actual cluster address, not `cluster.mongodb.net`

### "Authentication failed" 
→ Wrong password in DATABASE_URL. Re-check MongoDB Atlas user password.

### "Network timeout"
→ IP not whitelisted. Go to Atlas → Network Access → Add 0.0.0.0/0

### Login says "Invalid credentials"
→ Run `npm run db:seed` first to create users

### Login says "WRONG_ROLE"  
→ Super Admin: select "Library Owner" card, then login
→ If still failing, re-run seed script

---

## Environment Variables Explained

| Variable | Purpose |
|----------|---------|
| DATABASE_URL | MongoDB connection string |
| AUTH_SECRET | NextAuth session encryption (any 32+ char string) |
| BREVO_API_KEY | Email sending (get from brevo.com — free tier available) |
| RAZORPAY_KEY_ID | Payment gateway (get from razorpay.com) |
| UPLOADTHING_APP_ID | File uploads (get from uploadthing.com) |
