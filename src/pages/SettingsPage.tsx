// src/pages/SettingsPage.tsx — E2EE, backup, notifications, and account settings
import { useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut, RefreshCw, Download, Upload, Bell, BellOff, Shield, ShieldOff,
  ShieldCheck, Eye, EyeOff, Lock, Unlock, Copy, User, Battery, Moon, MoonStar,
  Loader2, ChevronRight, Info, Trash2, Sun,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../store/useStore';
import { syncData, syncProfile } from '../services/sync';
import { exportAllData, importFromFile, getStorageUsageMB } from '../utils/export';
import {
  areNotificationsSupported,
  getNotificationPermission,
  requestNotificationPermission,
  scheduleAllReminders,
  showTestNotification,
} from '../services/notifications';
import {
  generateSalt,
  deriveKey,
  encryptVerifier,
  verifyPassword,
  generateRecoveryCode,
} from '../services/crypto';

export const SettingsPage = () => {
  const { user, e2ee, setE2EEEnabled, setE2EEKey, setE2EESalt, setE2EEVerifier, setE2EERecoveryCode, clearE2EE, batteryMode, setBatteryMode, theme, toggleTheme, setPage, addToast } = useStore();
  const firebaseUser = auth.currentUser;

  const [isSyncing, setIsSyncing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);

  // Notifications
  const [notifSupported, setNotifSupported] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [dndStart, setDndStart] = useState(localStorage.getItem('dndStart') || '22:00');
  const [dndEnd, setDndEnd] = useState(localStorage.getItem('dndEnd') || '07:00');
  const [dndEnabled, setDndEnabled] = useState(localStorage.getItem('dndEnabled') === 'true');

  // E2EE
  const [e2eeSection, setE2eeSection] = useState<'idle' | 'setup' | 'unlock' | 'enabled' | 'recovery'>('idle');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [e2eeLoading, setE2eeLoading] = useState(false);
  const [e2eeError, setE2eeError] = useState('');

  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNotifSupported(areNotificationsSupported());
    const perm = getNotificationPermission();
    setNotifEnabled(perm.granted);
    getStorageUsageMB().then(setStorageUsed);

    // Determine E2EE section
    const storedSalt = localStorage.getItem('e2eeSalt');
    const storedVerifier = localStorage.getItem('e2eeVerifier');
    if (e2ee.enabled && e2ee.key) {
      setE2eeSection('enabled');
    } else if (storedSalt && storedVerifier) {
      setE2eeSection('unlock');
    } else {
      setE2eeSection('idle');
    }
  }, [e2ee.enabled, e2ee.key]);

  const handleSync = async () => {
    setIsSyncing(true);
    await syncData();
    setTimeout(() => { setIsSyncing(false); addToast('Sync complete!', 'success'); }, 1000);
  };

  const handleExport = async () => {
    await exportAllData();
    addToast('Backup downloaded!', 'success');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const result = await importFromFile(file);
      addToast(`Imported ${result.habits} habits, ${result.logs} logs`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Import failed', 'error');
    } finally {
      setIsImporting(false);
      if (importRef.current) importRef.current.value = '';
    }
  };

  const handleEnableNotifs = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotifEnabled(true);
      await scheduleAllReminders(dndEnabled ? dndStart : null, dndEnabled ? dndEnd : null);
      addToast('Notifications enabled!', 'success');
    } else {
      addToast('Permission denied — enable in browser settings', 'error');
    }
  };

  const saveDnD = () => {
    localStorage.setItem('dndStart', dndStart);
    localStorage.setItem('dndEnd', dndEnd);
    localStorage.setItem('dndEnabled', String(dndEnabled));
    addToast('Do Not Disturb settings saved', 'success');
  };

  // ── E2EE Setup ────────────────────────────────

  const handleE2EESetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (masterPassword !== confirmPassword) { setE2eeError('Passwords do not match'); return; }
    if (masterPassword.length < 8) { setE2eeError('Password must be at least 8 characters'); return; }
    setE2eeLoading(true);
    setE2eeError('');
    try {
      const salt = generateSalt();
      const key = await deriveKey(masterPassword, salt);
      const verifier = await encryptVerifier(key);
      const recovery = generateRecoveryCode();

      localStorage.setItem('e2eeSalt', salt);
      localStorage.setItem('e2eeVerifier', JSON.stringify(verifier));

      setE2EEEnabled(true);
      setE2EEKey(key);
      setE2EESalt(salt);
      setE2EEVerifier(verifier);
      setE2EERecoveryCode(recovery);

      await syncProfile({ e2eeEnabled: true });
      setE2eeSection('recovery');
      setMasterPassword('');
      setConfirmPassword('');
      addToast('E2EE enabled! Save your recovery code.', 'success');
    } catch {
      setE2eeError('Setup failed. Please try again.');
    } finally {
      setE2eeLoading(false);
    }
  };

  const handleE2EEUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setE2eeLoading(true);
    setE2eeError('');
    try {
      const salt = localStorage.getItem('e2eeSalt')!;
      const verifier = JSON.parse(localStorage.getItem('e2eeVerifier')!);
      const key = await deriveKey(masterPassword, salt);
      const ok = await verifyPassword(key, verifier);
      if (!ok) { setE2eeError('Wrong password. Try again.'); return; }
      setE2EEEnabled(true);
      setE2EEKey(key);
      setE2EESalt(salt);
      setE2EEVerifier(verifier);
      setE2eeSection('enabled');
      addToast('E2EE unlocked for this session', 'success');
    } catch {
      setE2eeError('Incorrect password');
    } finally {
      setE2eeLoading(false);
      setMasterPassword('');
    }
  };

  const handleDisableE2EE = () => {
    if (!confirm('Disable encryption? Data will be stored in plain text in Firestore.')) return;
    localStorage.removeItem('e2eeSalt');
    localStorage.removeItem('e2eeVerifier');
    clearE2EE();
    setE2eeSection('idle');
    addToast('E2EE disabled', 'info');
  };

  const handleLogout = async () => {
    if (confirm('Sign out?')) await signOut(auth);
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto no-scrollbar pb-28">
      <div className="px-5 pt-10 pb-5 bg-surface border-b border-border">
        <h1 className="text-2xl font-black text-text-main">Settings</h1>
      </div>

      <div className="p-5 space-y-5">
        {/* Profile */}
        <div className="glass rounded-2xl p-5 flex items-center gap-4">
          {firebaseUser?.photoURL ? (
            <img src={firebaseUser.photoURL} alt="Avatar" className="w-14 h-14 rounded-full border-2 border-primary/30" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent-blue flex items-center justify-center text-white font-black text-xl">
              {(firebaseUser?.displayName || 'U')[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <h2 className="font-bold text-lg text-text-main truncate">{firebaseUser?.displayName || 'User'}</h2>
            <p className="text-sm text-text-sub truncate">{firebaseUser?.email}</p>
          </div>
          <button onClick={handleLogout} className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 active:scale-95">
            <LogOut size={18} />
          </button>
        </div>

        {/* E2EE */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            {e2ee.enabled ? <ShieldCheck size={18} className="text-green-400" /> : <Shield size={18} className="text-text-sub" />}
            <h3 className="font-bold text-text-main">End-to-End Encryption</h3>
            {e2ee.enabled && (
              <span className="ml-auto text-xs font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                ACTIVE
              </span>
            )}
          </div>

          {e2eeSection === 'idle' && (
            <div>
              <p className="text-sm text-text-sub mb-4">
                Encrypt all your habit data before it reaches Firestore. Only you can decrypt it with your master password.
              </p>
              <button
                onClick={() => setE2eeSection('setup')}
                className="w-full py-3 bg-primary text-white rounded-xl font-bold active:scale-98"
              >
                🔒 Enable E2EE
              </button>
            </div>
          )}

          {e2eeSection === 'setup' && (
            <form onSubmit={handleE2EESetup} className="space-y-4">
              <p className="text-sm text-yellow-400 bg-yellow-500/10 rounded-xl p-3 border border-yellow-500/20">
                ⚠️ If you forget your master password and lose the recovery code, your encrypted data CANNOT be recovered.
              </p>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={masterPassword} onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="Master password (min 8 chars)"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary pr-12"
                  minLength={8} required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm master password"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary"
                required
              />
              {e2eeError && <p className="text-red-400 text-sm">{e2eeError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setE2eeSection('idle')}
                  className="flex-1 py-3 rounded-xl border border-border text-text-sub font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={e2eeLoading}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                  {e2eeLoading && <Loader2 size={16} className="animate-spin" />}
                  Enable
                </button>
              </div>
            </form>
          )}

          {e2eeSection === 'unlock' && (
            <form onSubmit={handleE2EEUnlock} className="space-y-4">
              <p className="text-sm text-text-sub">Your data is encrypted. Enter your master password to decrypt this session.</p>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={masterPassword} onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="Master password"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary pr-12"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {e2eeError && <p className="text-red-400 text-sm">{e2eeError}</p>}
              <button type="submit" disabled={e2eeLoading}
                className="w-full py-3 bg-primary text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {e2eeLoading && <Loader2 size={16} className="animate-spin" />}
                Unlock for this session
              </button>
              <button type="button" onClick={handleDisableE2EE}
                className="w-full py-2 text-red-400 text-sm underline">
                Forgot password? Disable E2EE (data will be unencrypted)
              </button>
            </form>
          )}

          {e2eeSection === 'enabled' && (
            <div className="space-y-3">
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-2">
                <Lock size={16} className="text-green-400 shrink-0" />
                <p className="text-sm text-green-400">All data encrypted on device before sync</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setE2eeSection('recovery'); }}
                  className="flex-1 py-3 rounded-xl border border-border text-text-sub text-sm font-semibold hover:bg-surface"
                >
                  📋 View Recovery Code
                </button>
                <button onClick={handleDisableE2EE}
                  className="flex-1 py-3 rounded-xl border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/10">
                  <Unlock size={14} className="inline mr-1" /> Disable
                </button>
              </div>
            </div>
          )}

          {e2eeSection === 'recovery' && e2ee.recoveryCode && (
            <div className="space-y-4">
              <p className="text-sm text-yellow-400 bg-yellow-500/10 rounded-xl p-3 border border-yellow-500/20">
                ⚠️ Save this code somewhere safe. It can restore access if you forget your master password.
              </p>
              <div className="bg-background rounded-xl p-4 border border-border">
                <p className="font-mono text-text-main text-sm break-all tracking-wider">{e2ee.recoveryCode}</p>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(e2ee.recoveryCode!); addToast('Recovery code copied!', 'success'); }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-surface border border-border rounded-xl text-text-sub text-sm font-semibold"
              >
                <Copy size={16} /> Copy Recovery Code
              </button>
              <button onClick={() => setE2eeSection('enabled')}
                className="w-full py-3 bg-primary text-white rounded-xl font-bold">
                Done — I've saved it
              </button>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} className="text-blue-400" />
            <h3 className="font-bold text-text-main">Notifications</h3>
          </div>

          {!notifSupported ? (
            <p className="text-text-muted text-sm">Not supported in this browser.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-border">
                <div>
                  <p className="text-sm font-semibold text-text-main">
                    {notifEnabled ? 'Notifications On' : 'Notifications Off'}
                  </p>
                  <p className="text-xs text-text-sub mt-0.5">Based on per-habit reminder times</p>
                </div>
                {notifEnabled ? (
                  <button className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg text-xs font-bold" onClick={() => addToast('To disable, change browser notification settings', 'info')}>
                    On
                  </button>
                ) : (
                  <button onClick={handleEnableNotifs} className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold">
                    Enable
                  </button>
                )}
              </div>

              {notifEnabled && (
                <button onClick={showTestNotification}
                  className="w-full py-3 border-2 border-dashed border-border rounded-xl text-sm text-text-sub font-medium hover:border-primary hover:text-primary transition-colors">
                  🔔 Send Test Notification
                </button>
              )}

              {/* DnD */}
              <div className="p-4 bg-background rounded-xl border border-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MoonStar size={16} className="text-indigo-400" />
                    <p className="text-sm font-semibold text-text-main">Do Not Disturb</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={dndEnabled} onChange={(e) => setDndEnabled(e.target.checked)} className="sr-only peer" />
                    <div className="w-9 h-5 bg-border rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                  </label>
                </div>
                {dndEnabled && (
                  <div className="flex gap-2 items-center">
                    <input type="time" value={dndStart} onChange={(e) => setDndStart(e.target.value)}
                      className="flex-1 bg-surface border border-border rounded-lg p-2 text-text-main text-sm focus:outline-none focus:border-primary" />
                    <span className="text-text-muted text-sm">to</span>
                    <input type="time" value={dndEnd} onChange={(e) => setDndEnd(e.target.value)}
                      className="flex-1 bg-surface border border-border rounded-lg p-2 text-text-main text-sm focus:outline-none focus:border-primary" />
                    <button onClick={saveDnD} className="px-3 py-2 bg-primary text-white rounded-lg text-xs font-bold">Save</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Battery Mode */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Battery size={18} className="text-green-400" />
              <div>
                <p className="font-semibold text-text-main text-sm">Battery Saving Mode</p>
                <p className="text-xs text-text-sub mt-0.5">Reduces sync frequency on low battery</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={batteryMode} onChange={(e) => setBatteryMode(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500" />
            </label>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {theme === 'dark' ? <Moon size={18} className="text-indigo-400" /> : <Sun size={18} className="text-amber-500" />}
              <div>
                <p className="font-semibold text-text-main text-sm">Theme Settings</p>
                <p className="text-xs text-text-sub mt-0.5">Toggle light or dark interface</p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="px-4 py-2 bg-background border border-border rounded-xl text-xs font-bold text-text-main flex items-center gap-1.5 active:scale-95 transition-all"
            >
              {theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </button>
          </div>
        </div>

        {/* Data */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold text-text-main mb-4">Data & Backup</h3>

          <div className="space-y-3">
            <button onClick={handleSync} disabled={isSyncing}
              className="w-full flex items-center justify-between p-4 bg-background rounded-xl border border-border active:scale-98">
              <div className="flex items-center gap-3">
                <RefreshCw size={16} className={clsx('text-primary', isSyncing && 'animate-spin')} />
                <span className="text-sm font-medium text-text-main">Force Cloud Sync</span>
              </div>
              <ChevronRight size={16} className="text-text-muted" />
            </button>

            <button onClick={handleExport}
              className="w-full flex items-center justify-between p-4 bg-background rounded-xl border border-border active:scale-98">
              <div className="flex items-center gap-3">
                <Download size={16} className="text-accent-teal" />
                <span className="text-sm font-medium text-text-main">Export Backup (JSON)</span>
              </div>
              <ChevronRight size={16} className="text-text-muted" />
            </button>

            <button onClick={() => importRef.current?.click()} disabled={isImporting}
              className="w-full flex items-center justify-between p-4 bg-background rounded-xl border border-border active:scale-98 disabled:opacity-50">
              <div className="flex items-center gap-3">
                {isImporting ? <Loader2 size={16} className="animate-spin text-text-muted" /> : <Upload size={16} className="text-yellow-400" />}
                <span className="text-sm font-medium text-text-main">Import Backup (JSON)</span>
              </div>
              <ChevronRight size={16} className="text-text-muted" />
            </button>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

            {storageUsed > 0 && (
              <div className={clsx(
                'flex items-center gap-3 p-3 rounded-xl border text-xs font-medium',
                storageUsed > 50 ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-background border-border text-text-muted',
              )}>
                <Info size={14} />
                Storage used: {storageUsed} MB {storageUsed > 50 && '⚠️ Over limit — export and clear data'}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 text-center pb-8 pt-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage('privacy')}
              className="text-xs text-primary hover:underline font-semibold"
            >
              Privacy Policy
            </button>
            <span className="text-text-muted text-xs">•</span>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer"
              className="text-xs text-primary hover:underline font-semibold">
              View on GitHub
            </a>
          </div>

          <div className="flex flex-col items-center gap-1.5 pt-4 border-t border-border w-2/3">
            <p className="text-[9px] uppercase tracking-widest text-text-muted font-bold">Powered by</p>
            <div className="flex items-center gap-1.5">
              <img src="/p1xion.svg" alt="P1XION Logo" className="h-5 w-auto dark:invert transition-all select-none" />
              <span className="text-sm font-black tracking-tight text-text-main">P1XION</span>
            </div>
          </div>

          <p className="text-[10px] text-text-muted mt-2">Rehabit Techo v2.0 · MIT License · Open Source</p>
        </div>
      </div>
    </div>
  );
};