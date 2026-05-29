// src/components/HabitLogModal.tsx — Done / Partial / Skip logging modal
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, MinusCircle, SkipForward, Flame } from 'lucide-react';
import { clsx } from 'clsx';
import type { HabitWithStatus } from '../hooks/useHabits';
import type { LogStatus } from '../db';

interface HabitLogModalProps {
  habit: HabitWithStatus | null;
  onClose: () => void;
  onLog: (status: LogStatus, options?: { skipReason?: string; partialValue?: number }) => void;
  onEdit: () => void;
  onDelete: () => void;
}

const SKIP_REASONS = [
  { value: 'sick', label: '🤒 Sick' },
  { value: 'vacation', label: '✈️ Vacation' },
  { value: 'emergency', label: '🚨 Emergency' },
  { value: 'rest_day', label: '😴 Rest Day' },
  { value: 'other', label: '💬 Other' },
];

export const HabitLogModal = ({ habit, onClose, onLog, onEdit, onDelete }: HabitLogModalProps) => {
  const [view, setView] = useState<'main' | 'partial' | 'skip'>('main');
  const [partialValue, setPartialValue] = useState(50);
  const [skipReason, setSkipReason] = useState('');

  if (!habit) return null;

  const handleDone = () => {
    onLog('done');
    onClose();
  };

  const handlePartial = () => {
    onLog('partial', { partialValue });
    onClose();
  };

  const handleSkip = () => {
    if (!skipReason) return;
    onLog('skip', { skipReason });
    onClose();
  };

  const handleDelete = () => {
    if (confirm(`Delete "${habit.title}"? This cannot be undone.`)) {
      onDelete();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {habit && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 glass-strong rounded-t-3xl p-6 z-50"
          >
            {/* Drag Handle */}
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

            {/* Habit Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-4 h-12 rounded-full" style={{ backgroundColor: habit.color }} />
                <div>
                  <h3 className="font-bold text-text-main text-xl">{habit.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1 text-orange-400">
                      <Flame size={14} className="flame-anim" />
                      <span className="text-xs font-bold">{habit.currentStreak} day streak</span>
                    </div>
                    {habit.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 bg-primary/20 text-primary-light rounded-full font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-2 bg-border rounded-full text-text-sub">
                <X size={18} />
              </button>
            </div>

            {/* Quantity goal display */}
            {habit.quantity && (
              <div className="bg-background rounded-xl p-3 mb-4 text-center text-sm text-text-sub">
                🎯 Goal: <span className="font-bold text-text-main">{habit.quantity}</span>
              </div>
            )}

            {/* Current status badge */}
            {habit.logStatusToday && (
              <div className={clsx(
                'rounded-xl p-3 mb-4 text-center text-sm font-semibold',
                habit.logStatusToday === 'done' ? 'bg-green-500/20 text-green-400' :
                habit.logStatusToday === 'partial' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400',
              )}>
                {habit.logStatusToday === 'done' ? '✅ Logged as Done today — tap again to undo' :
                 habit.logStatusToday === 'partial' ? '🔶 Logged as Partial today' :
                 '⏭️ Skipped today — streak preserved'}
              </div>
            )}

            {/* Main View */}
            {view === 'main' && (
              <div className="space-y-3">
                <button
                  onClick={handleDone}
                  className={clsx(
                    'w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-98',
                    habit.logStatusToday === 'done'
                      ? 'bg-green-500/20 border-2 border-green-500'
                      : 'bg-green-500/10 border border-green-500/30 hover:bg-green-500/20',
                  )}
                >
                  <CheckCircle2 size={28} className="text-green-400 shrink-0" />
                  <div className="text-left">
                    <p className="font-bold text-text-main">Done</p>
                    <p className="text-xs text-text-sub">Fully completed today</p>
                  </div>
                </button>

                <button
                  onClick={() => setView('partial')}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20 transition-all active:scale-98"
                >
                  <MinusCircle size={28} className="text-yellow-400 shrink-0" />
                  <div className="text-left">
                    <p className="font-bold text-text-main">Partial</p>
                    <p className="text-xs text-text-sub">Partially completed — still counts!</p>
                  </div>
                </button>

                <button
                  onClick={() => setView('skip')}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-all active:scale-98"
                >
                  <SkipForward size={28} className="text-blue-400 shrink-0" />
                  <div className="text-left">
                    <p className="font-bold text-text-main">Skip (Excused)</p>
                    <p className="text-xs text-text-sub">Sick/vacation — streak not broken</p>
                  </div>
                </button>

                <div className="flex gap-3 pt-2">
                  <button onClick={onEdit}
                    className="flex-1 py-3 rounded-xl border border-border text-text-sub text-sm font-semibold hover:bg-surface">
                    ✏️ Edit
                  </button>
                  <button onClick={handleDelete}
                    className="flex-1 py-3 rounded-xl border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/10">
                    🗑️ Delete
                  </button>
                </div>
              </div>
            )}

            {/* Partial View */}
            {view === 'partial' && (
              <div className="space-y-6">
                <button onClick={() => setView('main')} className="text-text-sub text-sm hover:text-text-main">
                  ← Back
                </button>
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <p className="font-semibold text-text-main">How much did you complete?</p>
                    <span className="text-2xl font-black text-primary">{partialValue}%</span>
                  </div>
                  <input
                    type="range" min="10" max="90" step="10"
                    value={partialValue} onChange={(e) => setPartialValue(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-text-muted mt-1">
                    <span>10%</span><span>50%</span><span>90%</span>
                  </div>
                </div>
                {habit.quantity && (
                  <p className="text-center text-sm text-text-sub">
                    Goal: <span className="text-text-main font-semibold">{habit.quantity}</span> →{' '}
                    ~{Math.round(parseFloat(habit.quantity) * partialValue / 100) || `${partialValue}%`}
                  </p>
                )}
                <button onClick={handlePartial}
                  className="w-full bg-yellow-500 text-black py-4 rounded-xl font-bold text-lg active:scale-95 transition-transform">
                  Log {partialValue}% Completion
                </button>
              </div>
            )}

            {/* Skip View */}
            {view === 'skip' && (
              <div className="space-y-4">
                <button onClick={() => setView('main')} className="text-text-sub text-sm hover:text-text-main">
                  ← Back
                </button>
                <p className="font-semibold text-text-main">Why are you skipping?</p>
                <div className="grid grid-cols-2 gap-2">
                  {SKIP_REASONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setSkipReason(r.value)}
                      className={clsx(
                        'p-3 rounded-xl text-sm font-semibold transition-all border',
                        skipReason === r.value
                          ? 'bg-primary text-white border-primary'
                          : 'bg-background text-text-sub border-border hover:border-primary',
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleSkip}
                  disabled={!skipReason}
                  className="w-full bg-blue-500 text-white py-4 rounded-xl font-bold text-lg active:scale-95 transition-transform disabled:opacity-40"
                >
                  Skip — Preserve Streak 🛡️
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
