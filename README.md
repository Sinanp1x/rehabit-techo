# Rehabit Techo (手帳)

A modern, offline-first Progressive Web App (PWA) for habit tracking with social features, built with React, TypeScript, and Firebase.

> "1% Better Every Day" - Inspired by Atomic Habits

## ✨ Features

### Core Functionality
- 📱 **Progressive Web App** - Install on any device, works offline
- ✅ **Dual Tracking System** - Habits (for stats) vs Reminders (task-only)
- 📅 **Flexible Scheduling** - Daily, weekly, or custom day patterns
- ⏰ **Time-based Tasks** - Set specific times or all-day items
- 📊 **Advanced Statistics** - RPG-style personality metrics (Consistency, Discipline, Responsibility, Devotion, Focus)
- 📈 **Visual Charts** - Radar charts, pie charts, heatmaps
- 📤 **CSV Export** - Export monthly habit data
- 🔄 **Offline Sync** - IndexedDB with Firebase cloud sync
- 👥 **Social Leaderboard** - Compare progress with friends

### Tech Highlights
- **Offline-First Architecture** - Works without internet, syncs when connected
- **Type-Safe** - Full TypeScript implementation
- **Modern UI** - Tailwind CSS with Framer Motion animations
- **Performance Optimized** - React hooks with proper memoization
- **iOS Support** - Safe area handling for notched devices
- **License System** - Built-in activation system

## 🛠 Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Database:** IndexedDB (Dexie.js) + Firebase Firestore
- **Authentication:** Firebase Auth (Google Sign-In)
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Date Handling:** date-fns

## 📋 Prerequisites

- Node.js 18+ and npm
- Firebase project with Firestore and Authentication enabled
- Google Cloud project (for Firebase)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/habit-tracker.git
cd habit-tracker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Configuration

#### Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Google Authentication in Authentication section
4. Create a Firestore database

#### Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

#### Update Firebase Config

Edit `src/firebase.ts` to use environment variables:

```typescript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
```

### 4. Set Up Firestore Security Rules

In Firebase Console, add these security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // User's habits
      match /habits/{habitId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // User's logs
      match /logs/{logId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // License keys
    match /license_keys/{keyId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📊 Database Schema

### IndexedDB (Local - Dexie)

**habits** table:
```typescript
{
  id: number;
  title: string;
  category: string;
  color: string;
  type: 'habit' | 'reminder';
  hasTime: boolean;
  time: string; // "HH:mm"
  endDate: string | null; // "YYYY-MM-DD"
  frequencyDays: number[]; // [0-6] Sunday=0
  archived: boolean;
  syncStatus: 'pending' | 'synced';
}
```

**logs** table:
```typescript
{
  id: number;
  habitId: number;
  date: string; // "YYYY-MM-DD"
  status: 'done';
  syncStatus: 'pending' | 'synced';
}
```

### Firestore (Cloud)

- `users/{uid}/habits/{habitId}` - User habits
- `users/{uid}/logs/{logId}` - Habit completion logs
- `users/{uid}` - User profile with license status
- `license_keys/{keyCode}` - License activation keys

## 🔐 License System

The app includes a built-in license verification system. See [LICENSE_SYSTEM.md](docs/LICENSE_SYSTEM.md) for:
- How to generate license keys
- Key validation process
- Admin setup guide

## 📦 Build for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

## 🌐 Deployment

### Deploy to Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

### Deploy to Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

## 🛠 Development

### Project Structure

```
src/
├── components/      # React components
│   ├── AddHabitModal.tsx
│   ├── HabitCard.tsx
│   ├── Leaderboard.tsx
│   ├── OfflineIndicator.tsx
│   └── ...
├── pages/           # Page components
│   ├── HomePage.tsx
│   ├── StatsPage.tsx
│   ├── SettingsPage.tsx
│   └── LoginPage.tsx
├── hooks/           # Custom React hooks
│   └── useHabits.ts
├── services/        # Business logic
│   ├── sync.ts
│   ├── license.ts
│   └── profile.ts
├── utils/           # Helper functions
│   ├── stats.ts
│   └── user.ts
├── constants/       # App constants
│   └── metrics.ts
├── db.ts            # IndexedDB schema
├── firebase.ts      # Firebase config
└── App.tsx          # Main app component
```

### Code Style

- TypeScript for all files
- ESLint for code linting
- Prettier recommended for formatting
- Component naming: PascalCase
- File naming: PascalCase for components, camelCase for utilities

### Key Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## 🗺 Features Roadmap

- [ ] Dark mode support
- [ ] Push notifications (FCM setup)
- [ ] Habit streaks and achievements
- [ ] Data import/export (JSON)
- [ ] Multiple themes
- [ ] Habit templates
- [ ] Advanced filtering
- [ ] Multi-language support

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🐛 Troubleshooting

### "No authenticated user" error
- Make sure you're logged in with Google
- Check Firebase Auth is enabled
- Verify firestore rules allow authenticated access

### Service Worker not updating
- Unregister old service worker in DevTools
- Hard refresh (Ctrl+Shift+R)
- Clear site data in browser settings

### Sync not working
- Check internet connection
- Verify Firebase credentials
- Check browser console for errors

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Inspired by Atomic Habits by James Clear
- Design influenced by Apple's iOS design language
- Community feedback from r/productivity

---

**Made with ❤️ by the Rehabit Team**
