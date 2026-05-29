# Rehabit Techo (手帳)

> **Privacy-first, open-source habit tracker** with End-to-End Encryption, social leaderboards, and PWA support.

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange.svg)](https://firebase.google.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-green.svg)](#pwa)

---

## ✨ Features

### Core
- **Daily habit tracking** — Done, Partial (% completion), Skip (with reason — doesn't break streak!)
- **Smart streaks** — Current streak & longest streak. Sick/Vacation skips preserve your streak.
- **Multi-tag system** — Health, Study, Spiritual, Family, Personal, Work, Fitness + custom tags
- **Quantity goals** — Track "30 min", "8 glasses", etc.
- **Multiple reminders per habit** — Set as many reminder times as you want
- **Offline-first** — IndexedDB (Dexie) stores everything locally; Firestore syncs in background

### Privacy & Security (E2EE)
- **End-to-End Encryption** — AES-256-GCM + PBKDF2 (100k iterations)
- **Zero-knowledge** — Master password never leaves your device
- **Recovery codes** — Printable/copyable backup in case you forget your password
- **Encrypted Firestore** — Only encrypted blobs stored server-side when enabled

### Social
- **Friends via text code** — Share your 7-char code (e.g. `ABC-1234`) to connect
- **Opt-in leaderboard** — Share only weekly completion % (no habit details)
- **Public Podium** — Generate a shareable achievement image card (PNG)
  - Web Share API (Instagram Story, WhatsApp, etc.) or download
  - Trust statement: *"This data is E2E encrypted and verified — I cannot cheat"*

### PWA
- **Installable** on mobile home screen
- **Offline support** via Workbox caching
- **Do Not Disturb** window for notifications
- **Battery saving mode** — reduces sync on low battery

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A Firebase project (free tier is enough)

### 1. Clone & Install
```bash
git clone https://github.com/your-repo/rehabit-echo.git
cd rehabit-echo
npm install
```

### 2. Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/) → Create/open your project
2. Enable **Authentication** → Sign-in methods: Google + Email/Password
3. Enable **Firestore Database** (production mode)
4. Deploy the security rules:
   ```bash
   npx firebase-tools deploy --only firestore:rules,firestore:indexes
   ```

### 3. Configure Environment Variables
```bash
cp .env.example .env
# Edit .env with your Firebase config values
```

Your Firebase config is at: **Project Settings → General → Your apps → Web app → SDK setup**

### 4. Run Locally
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🚢 Deployment

### Cloudflare Pages (Recommended)
1. Push to GitHub
2. Cloudflare Pages → Create project → Connect GitHub repo
3. Build settings:
   - **Build command**: `npm run build`
   - **Build output**: `dist`
4. Add environment variables (same as `.env`)

### Vercel
```bash
npx vercel --prod
```
Add env vars in the Vercel dashboard.

---

## 🔐 End-to-End Encryption

E2EE is opt-in. When enabled:
1. A random salt is generated and stored locally
2. Your master password is run through **PBKDF2** (100,000 iterations, SHA-256)
3. The derived **AES-256-GCM** key encrypts all data **before** it touches Firestore
4. Firestore stores only: `{ _encrypted: true, ciphertext: "...", iv: "..." }`

**Recovery**: A backup code is generated at setup time. Store it safely — if you lose it and forget your password, encrypted data cannot be recovered.

---

## 📦 Data Migration

If you're migrating from the old version (Dexie v4):
- Migration runs **automatically** on first login
- Old `category` field → new `tags: [category]` array
- Old `status: 'done'` logs → kept as-is
- Export your data first as a safety backup: **Settings → Export Backup (JSON)**

---

## 🏗️ Architecture

```
src/
├── components/     # Reusable UI components
├── constants/      # Colors, tags, metrics
├── hooks/          # useHabits (Dexie live queries + CRUD)
├── pages/          # HomePage, StatsPage, FriendsPage, PublicPodiumPage, SettingsPage
├── services/       # crypto.ts (E2EE), sync.ts, notifications.ts, profile.ts
├── store/          # Zustand global state
└── utils/          # stats.ts, export.ts, migration.ts
```

**State management**: Zustand  
**Local DB**: Dexie (IndexedDB)  
**Cloud sync**: Firestore (via subcollections per user)  
**Encryption**: Web Crypto API only — no external crypto libs  
**PWA**: vite-plugin-pwa + Workbox  

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit: `git commit -m 'feat: add my feature'`
4. Push & open a Pull Request

Please keep the open-source spirit — no license gating, no paywalls.

---

## 📄 License

MIT © Rehabit Echo Contributors — see [LICENSE](LICENSE)
