// src/pages/LoginPage.tsx — Premium dark login
import { useState } from 'react';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../store/useStore';

export const LoginPage = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogle = async () => {
    setIsLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      setError(e.message || 'Google sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) await updateProfile(cred.user, { displayName });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e: any) {
      const msg = e.code === 'auth/wrong-password' ? 'Wrong password' :
                  e.code === 'auth/user-not-found' ? 'No account with this email' :
                  e.code === 'auth/email-already-in-use' ? 'Email already in use' :
                  e.code === 'auth/weak-password' ? 'Password must be at least 6 characters' :
                  e.message || 'Authentication failed';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background p-6 overflow-auto">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <div className="w-20 h-20 bg-surface flex items-center justify-center mx-auto mb-4 shadow-glow overflow-hidden select-none">
          <img src="/logo.svg" alt="Rehabi Techo Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-4xl font-black gradient-text">Rehabi Techo</h1>
        <p className="text-text-sub text-sm mt-2">Privacy-first habit tracker</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm"
      >
        {/* Mode Toggle */}
        <div className="bg-surface p-1 rounded-xl flex gap-1 mb-6 border border-border">
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m} onClick={() => { setMode(m); setError(''); }}
              className={clsx(
                'flex-1 py-2.5 rounded-lg text-sm font-bold transition-all',
                mode === m ? 'bg-primary text-white shadow-glow-sm' : 'text-text-sub hover:text-text-main',
              )}
            >
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Google Sign-In */}
        <button
          onClick={handleGoogle}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 p-4 bg-surface border border-border rounded-2xl font-semibold text-text-main hover:border-primary/50 hover:bg-card transition-all mb-4 active:scale-98 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-text-muted text-xs font-medium">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          {mode === 'signup' && (
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                className="w-full bg-surface border border-border rounded-2xl pl-11 pr-4 py-4 text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          )}

          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address" required
              className="w-full bg-surface border border-border rounded-2xl pl-11 pr-4 py-4 text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password" required minLength={6}
              className="w-full bg-surface border border-border rounded-2xl pl-11 pr-12 py-4 text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
            />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-sub">
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base shadow-glow hover:bg-primary-dark transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : null}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="text-center mt-6 space-y-1.5">
          <p className="text-text-muted text-xs">
            Free & open source · MIT License · Your data stays yours
          </p>
          <p className="text-xs">
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); useStore.getState().setPage('privacy'); }}
              className="text-primary hover:underline font-semibold"
            >
              Privacy Policy
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
};