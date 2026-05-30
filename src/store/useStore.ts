import { create } from 'zustand';
import type { User } from 'firebase/auth';

export type Page = 'home' | 'stats' | 'friends' | 'podium' | 'settings' | 'privacy';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface E2EEState {
  enabled: boolean;
  key: CryptoKey | null;  // In-memory only, never persisted
  salt: string | null;
  verifier: { ciphertext: string; iv: string } | null;
  recoveryCode: string | null;
}

interface AppState {
  // Auth
  user: User | null;
  isAuthLoading: boolean;
  setUser: (user: User | null) => void;
  setAuthLoading: (v: boolean) => void;

  // Navigation
  currentPage: Page;
  setPage: (page: Page) => void;

  // E2EE
  e2ee: E2EEState;
  setE2EEEnabled: (enabled: boolean) => void;
  setE2EEKey: (key: CryptoKey | null) => void;
  setE2EESalt: (salt: string | null) => void;
  setE2EEVerifier: (v: { ciphertext: string; iv: string } | null) => void;
  setE2EERecoveryCode: (code: string | null) => void;
  clearE2EE: () => void;

  // Toasts
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;

  // Online status
  isOnline: boolean;
  setOnline: (v: boolean) => void;

  // Battery mode
  batteryMode: boolean;
  setBatteryMode: (v: boolean) => void;

  // Theme support
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;

  // Realtime sync
  realtimeLoading: boolean;
  realtimeReady: boolean;
  realtimeError: string | null;
  lastRealtimeSyncAt: number | null;
  setRealtimeStatus: (status: Partial<Pick<AppState, 'realtimeLoading' | 'realtimeReady' | 'realtimeError' | 'lastRealtimeSyncAt'>>) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Auth
  user: null,
  isAuthLoading: true,
  setUser: (user) => set({ user }),
  setAuthLoading: (v) => set({ isAuthLoading: v }),

  // Navigation
  currentPage: 'home',
  setPage: (page) => set({ currentPage: page }),

  // E2EE
  e2ee: {
    enabled: false,
    key: null,
    salt: null,
    verifier: null,
    recoveryCode: null,
  },
  setE2EEEnabled: (enabled) =>
    set((s) => ({ e2ee: { ...s.e2ee, enabled } })),
  setE2EEKey: (key) =>
    set((s) => ({ e2ee: { ...s.e2ee, key } })),
  setE2EESalt: (salt) =>
    set((s) => ({ e2ee: { ...s.e2ee, salt } })),
  setE2EEVerifier: (verifier) =>
    set((s) => ({ e2ee: { ...s.e2ee, verifier } })),
  setE2EERecoveryCode: (recoveryCode) =>
    set((s) => ({ e2ee: { ...s.e2ee, recoveryCode } })),
  clearE2EE: () =>
    set({ e2ee: { enabled: false, key: null, salt: null, verifier: null, recoveryCode: null } }),

  // Toasts
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => get().removeToast(id), 4000);
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // Online
  isOnline: navigator.onLine,
  setOnline: (v) => set({ isOnline: v }),

  // Battery
  batteryMode: false,
  setBatteryMode: (v) => set({ batteryMode: v }),

  // Theme support
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'dark',
  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    set({ theme: nextTheme });
    localStorage.setItem('theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  },
  setTheme: (theme) => {
    set({ theme });
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  },

  // Realtime sync
  realtimeLoading: true,
  realtimeReady: false,
  realtimeError: null,
  lastRealtimeSyncAt: null,
  setRealtimeStatus: (status) => set((s) => ({
    realtimeLoading: status.realtimeLoading ?? s.realtimeLoading,
    realtimeReady: status.realtimeReady ?? s.realtimeReady,
    realtimeError: status.realtimeError ?? s.realtimeError,
    lastRealtimeSyncAt: status.lastRealtimeSyncAt ?? s.lastRealtimeSyncAt,
  })),
}));
