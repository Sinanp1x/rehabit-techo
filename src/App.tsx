// src/App.tsx — Main app with 5-tab navigation, auth, PWA setup
import { useEffect, lazy, Suspense } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { useStore, type Page } from './store/useStore';
import { LoginPage } from './pages/LoginPage';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ToastContainer } from './components/ToastContainer';
import { migrateExistingData } from './utils/migration';
import { syncData } from './services/sync';
import { startRealtimeSync, stopRealtimeSync } from './services/realtimeSync';
import { scheduleAllReminders } from './services/notifications';
import { Home, BarChart2, Users, Image, Settings, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

// Lazy-loaded pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const StatsPage = lazy(() => import('./pages/StatsPage').then((m) => ({ default: m.StatsPage })));
const FriendsPage = lazy(() => import('./pages/FriendsPage').then((m) => ({ default: m.FriendsPage })));
const PublicPodiumPage = lazy(() => import('./pages/PublicPodiumPage').then((m) => ({ default: m.PublicPodiumPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));

const NAV_ITEMS: { page: Page; icon: React.ReactNode; label: string }[] = [
  { page: 'home', icon: <Home size={22} />, label: 'Today' },
  { page: 'stats', icon: <BarChart2 size={22} />, label: 'Stats' },
  { page: 'friends', icon: <Users size={22} />, label: 'Friends' },
  { page: 'podium', icon: <Image size={22} />, label: 'Podium' },
  { page: 'settings', icon: <Settings size={22} />, label: 'Settings' },
];

const PageFallback = () => (
  <div className="h-full flex items-center justify-center bg-background">
    <Loader2 size={28} className="animate-spin text-primary" />
  </div>
);

function App() {
  const { user, isAuthLoading, setUser, setAuthLoading, currentPage, setPage } = useStore();

  // ── Auth listener ────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await migrateExistingData();
        await startRealtimeSync();
        syncData();
        const dndStart = localStorage.getItem('dndEnabled') === 'true'
          ? localStorage.getItem('dndStart') ?? null : null;
        const dndEnd = localStorage.getItem('dndEnabled') === 'true'
          ? localStorage.getItem('dndEnd') ?? null : null;
        scheduleAllReminders(dndStart, dndEnd);
      } else {
        stopRealtimeSync();
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, [setUser, setAuthLoading]);

  // ── Battery API ──────────────────────────────
  useEffect(() => {
    const { setBatteryMode } = useStore.getState();
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryMode(battery.level < 0.2 && !battery.charging);
        battery.addEventListener('levelchange', () => {
          setBatteryMode(battery.level < 0.2 && !battery.charging);
        });
      });
    }
  }, []);

  // ── Theme Initialization ──────────────────────
  useEffect(() => {
    const { theme, setTheme } = useStore.getState();
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  // ── Loading ──────────────────────────────────
  if (isAuthLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-4">
        <div className="w-16 h-16 bg-surface flex items-center justify-center shadow-glow overflow-hidden rounded-3xl select-none">
          <img src="/logo.svg" alt="Rehabi Techo Logo" className="w-full h-full object-contain" />
        </div>
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  // ── Auth gate ────────────────────────────────
  if (!user && currentPage !== 'privacy') return <LoginPage />;

  return (
    <div className="h-screen flex flex-col bg-background font-sans text-text-main overflow-hidden">
      <OfflineIndicator />
      <ToastContainer />

      {/* Page content */}
      <div className="flex-1 overflow-hidden relative">
        <Suspense fallback={<PageFallback />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0"
            >
              {currentPage === 'home' && <HomePage />}
              {currentPage === 'stats' && <StatsPage />}
              {currentPage === 'friends' && <FriendsPage />}
              {currentPage === 'podium' && <PublicPodiumPage />}
              {currentPage === 'settings' && <SettingsPage />}
              {currentPage === 'privacy' && <PrivacyPage />}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </div>

      {/* Bottom Navigation */}
      {user && (
        <nav className="shrink-0 bg-surface border-t border-border pb-safe pt-2 px-2 z-20">
          <div className="flex justify-around items-center h-16">
            {NAV_ITEMS.map(({ page, icon, label }) => {
              const isActive = currentPage === page;
              return (
                <button
                  key={page}
                  onClick={() => setPage(page)}
                  className={clsx(
                    'flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-200',
                    isActive ? 'text-primary' : 'text-text-muted hover:text-text-sub',
                  )}
                >
                  <div className={clsx(
                    'p-2 rounded-xl transition-all duration-200',
                    isActive ? 'bg-primary/15 shadow-glow-sm' : '',
                  )}>
                    {icon}
                  </div>
                  <span className={clsx(
                    'text-[10px] font-bold transition-all',
                    isActive ? 'text-primary' : 'text-text-muted',
                  )}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

export default App;