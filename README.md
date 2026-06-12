# GATE 2027 Preparation Tracker

A production-ready full-stack study tracker for GATE 2027. Track your focus sessions, manage your syllabus, and compete with peers on the leaderboard.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Auth**: NextAuth.js v5 (Email/Password + Google OAuth)
- **Database**: PostgreSQL via Prisma ORM (Neon.tech)
- **Real-time**: Pusher (Study Group leaderboard)
- **Charts**: Recharts
- **State**: Zustand / SWR
- **Deployment**: Vercel

## Features

| Feature | Description |
|---------|------------|
| ⏳ Countdown Timer | Live countdown to GATE 2027 (Feb 1, 09:30 IST) |
| 🎯 Focus Timer | Pomodoro-style session recorder with subject tracking |
| 📋 Daily Todo | Subject goals with daily reset at IST midnight |
| 📊 Stats & Calendar | Heatmap + streak tracker + Recharts analytics |
| 📚 Syllabus Tracker | 17 subjects with weighted completion gauge |
| 🏆 Study Group | Real-time leaderboard via Pusher |
| 🔌 Chrome Extension | Popup with countdown + today's data |

## Quick Start (Local)

### 1. Clone & Install
```bash
git clone <your-repo>
cd gate-app
npm install
```

### 2. Set Up Environment Variables
```bash
cp .env.example .env.local
```

Fill in the values (see below for where to get each):

| Variable | Where to Get |
|----------|-------------|
| `DATABASE_URL` | [Neon.tech](https://neon.tech) → New Project → Connection String |
| `NEXTAUTH_SECRET` | Run: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` for dev |
| `GOOGLE_CLIENT_ID` | [Google Cloud Console](https://console.cloud.google.com) → OAuth 2.0 |
| `GOOGLE_CLIENT_SECRET` | Same as above |
| `PUSHER_APP_ID` | [Pusher](https://pusher.com) → Create App → App Keys |
| `PUSHER_KEY` | Same as above |
| `PUSHER_SECRET` | Same as above |
| `PUSHER_CLUSTER` | Same (e.g. `ap2`) |
| `NEXT_PUBLIC_PUSHER_KEY` | Same as `PUSHER_KEY` |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Same as `PUSHER_CLUSTER` |

### 3. Push Database Schema
```bash
npx prisma db push
```

### 4. Run Dev Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

### 1. Push to GitHub
```bash
git add .
git commit -m "Initial commit"
git push
```

### 2. Import to Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Add all environment variables from `.env.example` in the Vercel dashboard
4. Set `NEXTAUTH_URL` to your Vercel URL (e.g. `https://your-app.vercel.app`)
5. Deploy!

> The `vercel.json` build command (`prisma generate && next build`) handles schema generation automatically.

### 3. Set Up Database on Neon.tech
1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string to `DATABASE_URL`
4. After first deploy, run: `npx prisma db push` with the production `DATABASE_URL`

## Chrome Extension

See [`/extension/README.md`](./extension/README.md) for full installation instructions.

**Quick steps:**
1. Go to `chrome://extensions`
2. Enable Developer Mode
3. Click "Load Unpacked" → select the `/extension` folder
4. Update `extension/config.js` with your Vercel URL

## Project Structure

```
gate-app/
├── app/
│   ├── (auth)/          # Login & Register pages
│   ├── (app)/           # Protected app pages
│   │   ├── dashboard/   # Focus timer + Todo
│   │   ├── stats/       # Calendar heatmap + charts
│   │   ├── syllabus/    # Syllabus tracker
│   │   └── study-group/ # Real-time leaderboard
│   └── api/             # All API routes
├── components/          # Reusable UI components
├── lib/                 # Auth, Prisma, utils, config
├── prisma/             # Database schema
├── extension/          # Chrome Extension (Manifest V3)
└── public/             # Static assets
```

## Database Schema

- `User` — Auth users (supports email/password + Google)
- `StudySession` — Focus timer records (indexed by userId + date)
- `TodoItem` — Daily todo items (indexed by userId + date)  
- `SyllabusItem` — Syllabus checklist items
- `FocusTimerState` — Timer persistence across page refreshes

## Environment Variables Reference

See [`.env.example`](.env.example) for the full list with descriptions.

## Performance Notes

- All DB queries use composite indexes on `(userId, date)`
- Pusher handles real-time instead of polling (scales to 100+ users on free tier)
- Stats API aggregates all data in one query
- Next.js App Router with server components for initial data loads
- Client-side SWR for live data

## License

MIT
