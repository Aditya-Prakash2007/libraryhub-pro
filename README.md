# LibraryHub Pro 📚

> Modern Library Seat Management SaaS Platform

A complete multi-tenant SaaS application for managing library seats, students, attendance, fees, and payments.

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd libraryhub-pro
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Fill in `.env`:

```env
DATABASE_URL="mongodb+srv://user:pass@cluster.mongodb.net/libraryhub-pro"
AUTH_SECRET="your-32-char-secret"
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="your_secret"
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_..."
UPLOADTHING_SECRET="sk_live_..."
UPLOADTHING_APP_ID="your_app_id"
RESEND_API_KEY="re_..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Generate Prisma Client

```bash
npm run db:generate
```

### 4. Push Schema to MongoDB

```bash
npm run db:push
```

### 5. Seed Database (creates demo accounts)

```bash
npm run db:seed
```

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔑 Demo Login Credentials

| Role | Email | Password | Dashboard |
|------|-------|----------|-----------|
| 🔴 Super Admin | superadmin@libraryhub.com | SuperAdmin@123 | /superadmin/dashboard |
| 🟡 Library Admin | admin@demolibrary.com | Admin@123 | /admin/dashboard |
| 🟢 Student | student@demolibrary.com | Student@123 | /student/dashboard |

---

## 🏗️ Architecture

### Multi-Tenant Design
```
Super Admin (platform)
    └── Library 1 (Admin A) → own students, seats, payments
    └── Library 2 (Admin B) → own students, seats, payments
    └── Library N ...
```

### Role-Based Access
- **SUPER_ADMIN** → Platform management, all libraries view
- **LIBRARY_ADMIN** → Own library only (full CRUD)
- **STUDENT** → Own profile, attendance, fees (read-only)

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 App Router |
| Language | TypeScript (strict) |
| Database | MongoDB Atlas |
| ORM | Prisma 5 |
| Auth | NextAuth.js v5 |
| Payments | Razorpay |
| Uploads | UploadThing |
| Email | Resend |
| Styling | Tailwind CSS + ShadCN UI |
| Animations | Framer Motion |
| Charts | Recharts |
| State | Zustand |
| Forms | React Hook Form + Zod |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, Signup, Reset Password
│   ├── (dashboard)/
│   │   ├── admin/        # Library Admin pages
│   │   ├── student/      # Student pages
│   │   └── superadmin/   # Platform admin pages
│   └── api/              # API routes + webhooks
├── actions/              # Server Actions (DB operations)
├── components/
│   ├── ui/               # ShadCN UI components
│   ├── shared/           # Sidebar, TopNav, DataTable
│   ├── dashboard/        # Dashboard components
│   ├── students/         # Student management
│   ├── seats/            # Seat map + management
│   ├── payments/         # Payment components
│   ├── attendance/       # Attendance + QR
│   ├── analytics/        # Reports + charts
│   └── notifications/    # Notification center
├── hooks/                # Custom React hooks
├── lib/                  # Prisma, Auth, Utils
├── schemas/              # Zod validation schemas
├── services/             # Email, Razorpay services
├── store/                # Zustand global state
├── types/                # TypeScript types
└── utils/                # Export, PDF, Validators
```

---

## 🌐 Deployment on Vercel

### 1. MongoDB Atlas Setup
1. Create cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create database `libraryhub-pro`
3. Add IP `0.0.0.0/0` to network access (or Vercel IP ranges)
4. Copy connection string to `DATABASE_URL`

### 2. UploadThing Setup
1. Create app at [uploadthing.com](https://uploadthing.com)
2. Copy `UPLOADTHING_SECRET` and `UPLOADTHING_APP_ID`

### 3. Razorpay Setup
1. Create account at [razorpay.com](https://razorpay.com)
2. Get API keys from Dashboard → Settings → API Keys
3. Add webhook: `https://yourdomain.com/api/webhooks/razorpay`
4. Webhook secret = `RAZORPAY_KEY_SECRET`

### 4. Resend Setup (Email)
1. Create account at [resend.com](https://resend.com)
2. Add and verify your domain
3. Copy API key to `RESEND_API_KEY`

### 5. Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Then redeploy
vercel --prod
```

---

## 🧩 Key Features

| Feature | Status |
|---------|--------|
| Multi-tenant architecture | ✅ |
| Role-based access control | ✅ |
| Visual seat map (cinema-style) | ✅ |
| QR attendance system | ✅ |
| Razorpay payment integration | ✅ |
| PDF receipt generation | ✅ |
| Excel export | ✅ |
| Revenue analytics charts | ✅ |
| Dark/Light mode | ✅ |
| PWA support | ✅ |
| Mobile responsive | ✅ |
| Fee reminders | ✅ |
| Notification center | ✅ |
| Activity & Audit logs | ✅ |
| Student QR ID cards | ✅ |
| Bulk seat creation | ✅ |
| Student detail page | ✅ |
| Document management | ✅ |
| Waitlist system | ✅ (DB ready) |
| Email notifications | ✅ (Resend) |

---

## 🔧 Common Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run db:generate  # Regenerate Prisma client
npm run db:push      # Push schema to MongoDB
npm run db:seed      # Create demo data
npm run db:studio    # Open Prisma Studio (DB GUI)
```

---

## 📞 Support

For issues, create a GitHub issue or contact support.

Built with ❤️ for Indian Libraries — **LibraryHub Pro**
