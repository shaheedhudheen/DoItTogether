# 💑 Do It Together (DIT)

> **A modern, mobile-first shared productivity web app designed specifically for couples and close partners to build habits, accomplish goals, and stop procrastinating together.**

---

## 💡 What is Do It Together?

Most productivity apps (Todoist, Notion, Apple Reminders) are designed for solo individuals or corporate teams. They often feel either too sterile or overly complex for two people who want to share their lives, habits, and daily responsibilities.

**Do It Together (DIT)** is built from the ground up around a **two-person partnership model**. It gives couples and accountability partners a single shared space to:
- Stay synced on day-to-day household chores and errands.
- Build healthy recurring daily routines together (fitness, reading, mindfulness).
- Track spiritual habits (optional 5 daily prayers) with simple visual feedback.
- Collect non-urgent shared goals and bucket-list items (movie nights, weekend trips, recipes to cook).
- Review historical progress day-by-day on an interactive calendar.

Everything updates **live in real time** via WebSockets, so when your partner checks something off, your screen updates instantly with smooth animations and haptic-feel visual cues.

---

## ✨ Key Features & Experience

### 📱 1. Mobile-First Design Philosophy
- Designed for mobile screens (375px+) first, with large, comfortable touch targets, smooth swipe behaviors, and thumb-friendly ergonomics.
- **Fixed Bottom Tab Bar** for effortless one-handed switching between **Today**, **Calendar**, and **Profile**.
- **Responsive Adaptive Sidebar** that expands naturally when opened on tablets or desktops without sacrificing simplicity.

### 🤝 2. Effortless 2-Person Onboarding & Partnership
- **6-Letter Invite Codes**: User 1 signs up and generates a unique 6-character code (e.g. `ABC123`).
- **Zero-Block Dashboard Mode**: User 1 can proceed directly to their dashboard and start setting up routines immediately while waiting for their partner. A helpful top banner displays the invite code with one-tap clipboard copying.
- **Instant Pair Sync**: As soon as User 2 registers and enters the code, both accounts link instantly via WebSockets—no refreshing required.

### 🔝 3. Common Tasks & Shared Bucket List (Top Section)
- Horizontal snapping card carousel for ongoing activities and reminders that have no strict deadline (e.g., *“Watch Dune 2”*, *“Cook homemade pasta”*, *“Plan anniversary weekend”*).
- Customizable emoji picker for each card.
- Both partners can add, edit, or mark tasks completed with rewarding completion badges.

### ☀️ 4. Daily Routines (Middle Section)
- Recurring habits tracked each day to build consistency as a team.
- Streamlined interface without cluttered, repetitive category tags.
- **Intuitive Duo Color Accent System**:
  - 🔴 **Red Accent**: Neither partner has completed the routine today.
  - 🟡 **Yellow Accent**: 1 of 2 partners has completed it today.
  - 🟢 **Green Accent**: Both partners have accomplished it together today!
- Completions automatically reset each day at midnight (UTC) while preserving historical logs.

### 🕌 5. Unified 5-Daily Prayer Tracker (Opt-In)
- Designed for couples tracking their 5 daily prayers (**Fajr**, **Dhuhr**, **Asr**, **Maghrib**, **Isha**).
- Can be enabled during onboarding or toggled anytime in Profile preferences.
- **Unified Single-Row View**: Instead of split cluttered tables, each prayer is a single tactile pill button using the same dynamic duo status colors:
  - 🔴 **Red**: Neither person has prayed yet.
  - 🟡 **Yellow**: One partner has prayed (gentle accountability).
  - 🟢 **Green**: Both partners have completed the prayer.

### 📋 6. Todos with Smart Ownership & Role Permissions (Bottom Section)
- Non-recurring tasks with optional due dates and assignment rules.
- **Smart Privacy & Ownership**:
  - **Assigned to Me**: Only the creator can check off, edit, or delete the item, but the partner can still view it in read-only mode so both know what is on each other's plate.
  - **Assign to Both of Us**: Interactive for both partners; requires both to complete, displaying red (0 done), yellow (1 done), or green (all done).

### 📅 7. Calendar Activity Timeline
- Monthly calendar grid highlighting past performance with colored status badges.
- **Day Snapshot Sheet**: Tap any date to inspect:
  - Daily routine completions for that specific day.
  - Common tasks created on that day.
  - Common tasks completed on that day.
  - Todos and prayers accomplished on that date.

### 👤 8. Profile & Partnership Management
- View connected partner status with live status badges.
- Quick copy button for your invite code if your partner is still joining.
- Preference toggle for Daily Prayer tracking.
- Secure token refresh, logout, and partnership dissolution safety controls.

---

## 🏗️ Technical Architecture & Monorepo

The project is structured as an npm workspaces monorepo:

```
DoItTogether/
├── packages/
│   └── shared/          # Shared TypeScript interfaces, enums, & Zod validation schemas
├── server/              # Node.js + Express + Prisma ORM + Socket.io + JWT Auth
└── web/                 # React 18 + Vite + Tailwind CSS + Zustand + TanStack Query
```

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Zustand (persisted auth & socket state), TanStack Query (React Query v5), Lucide Icons, date-fns, react-hot-toast.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Socket.io, JWT (Access & Refresh tokens), bcryptjs, Zod.
- **Shared**: Centralized types and validation schemas used across both backend controllers and frontend forms.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher, Node v20/22+ recommended)
- **PostgreSQL** database (Local instance or Cloud provider like Supabase / Neon / Railway)
- **Git**

### 2. Installation
Clone the repository and install all dependencies across the monorepo:

```bash
git clone https://github.com/your-username/DoItTogether.git
cd DoItTogether
npm install
```

### 3. Environment Configuration
Create a `.env` file in the `server` directory (you can copy `server/.env.example`):

```bash
cp server/.env.example server/.env
```

Configure your `server/.env` parameters:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/dit_db?schema=public"
JWT_ACCESS_SECRET="your_secure_jwt_access_secret_here"
JWT_REFRESH_SECRET="your_secure_jwt_refresh_secret_here"
PORT=3001
CORS_ORIGIN="http://localhost:5173"
```

### 4. Database Setup & Seed
Push the Prisma schema to create the tables and seed sample data:

```bash
# Push schema to PostgreSQL
npm run db:push --prefix server

# Seed database with sample couple data
npm run db:seed --prefix server
```

#### Demo Accounts (Pre-configured via Seed)
| User | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Partner 1 (Ali)** | `user1@example.com` | `password123` | Active Partner |
| **Partner 2 (Sara)** | `user2@example.com` | `password123` | Active Partner |

*(Invite Code: `DIT123`)*

### 5. Running the Application
Run both backend and frontend development servers concurrently:

```bash
# Terminal 1: Start Backend API (runs on port 3001)
npm run dev --prefix server

# Terminal 2: Start Web Client (runs on port 5173)
npm run dev --prefix web
```

Open [http://localhost:5173](http://localhost:5173) in your mobile browser or device emulator.

---

## 🧪 Building for Production

To test production builds locally:

```bash
# Build backend
npm run build --prefix server

# Build frontend
npm run build --prefix web
```

---

## 🗺️ Roadmap & Future Enhancements
- [ ] Push Notifications for partner task completions and prayer reminders.
- [ ] Photo attachment on completed Common Tasks (digital scrapbook/memories).
- [ ] Native Mobile App using React Native / Expo (reusing `@dit/shared`).
- [ ] Offline support via Service Workers & PWA installation.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
