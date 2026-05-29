// src/pages/HomePage.tsx — Premium daily habits view
import { useState } from 'react';
import { useHabits, type HabitWithStatus } from '../hooks/useHabits';
import { AddHabitModal } from '../components/AddHabitModal';
import { HabitCard } from '../components/HabitCard';
import { HabitLogModal } from '../components/HabitLogModal';
import { Plus, Smile, Flame, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { auth } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import type { LogStatus } from '../db';

export const HomePage = () => {
  const { habits, allLogs, addHabit, logHabit, updateHabit, deleteHabit } = useHabits();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<HabitWithStatus | null>(null);

  const user = auth.currentUser;
  const userName = user?.displayName?.split(' ')[0] || 'there';
  const avatar = user?.photoURL;

  const hour = new Date().getHours();
  const greeting =
    hour < 5 ? 'Good night' :
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' :
    hour < 21 ? 'Good evening' : 'Good night';

  const todayHabits = habits.filter((h) => h.isScheduledToday);
  const doneHabits = todayHabits.filter((h) => h.isDoneToday || h.logStatusToday === 'skip');
  const todoHabits = todayHabits.filter((h) => !h.isDoneToday && h.logStatusToday !== 'skip');

  const completionPct = todayHabits.length === 0 ? 0 :
    Math.round((doneHabits.length / todayHabits.length) * 100);

  const handleCardClick = (habit: HabitWithStatus) => {
    setSelectedHabit(habit);
    setIsEditOpen(false);
  };

  const handleLog = async (status: LogStatus, opts?: { skipReason?: string; partialValue?: number }) => {
    if (!selectedHabit) return;
    await logHabit(selectedHabit.id!, status, opts);
  };

  const handleEdit = () => {
    setIsEditOpen(true);
  };

  const handleDelete = async () => {
    if (selectedHabit) {
      await deleteHabit(selectedHabit.id!);
      setSelectedHabit(null);
    }
  };

  return (
    <div className="flex flex-col h-full relative bg-background">
      {/* Header */}
      <header className="px-6 pt-8 pb-6 bg-surface border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Smile size={18} className="text-yellow-400" />
            <p className="text-sm text-text-sub font-medium">
              {greeting}, <span className="text-text-main font-bold">{userName}</span>!
            </p>
          </div>
          {avatar ? (
            <img src={avatar} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-primary/30" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent-blue flex items-center justify-center text-white font-bold">
              {userName[0].toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-black text-text-main">Today</h1>
            <p className="text-text-sub text-sm mt-0.5">{format(new Date(), 'EEEE, MMMM d')}</p>
          </div>

          {/* Completion ring */}
          {todayHabits.length > 0 && (
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#2A2A4A" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke={completionPct === 100 ? '#22C55E' : '#7C3AED'}
                  strokeWidth="3"
                  strokeDasharray={`${completionPct} ${100 - completionPct}`}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-black text-text-main">{completionPct}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {todayHabits.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-text-muted mb-1.5">
              <span>{doneHabits.length} / {todayHabits.length} completed</span>
              {completionPct === 100 && <span className="text-green-400 font-bold">🎉 Perfect day!</span>}
            </div>
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: completionPct === 100 ? '#22C55E' : 'linear-gradient(90deg, #7C3AED, #3B82F6)' }}
                initial={{ width: 0 }}
                animate={{ width: `${completionPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-5 pt-5 pb-28 no-scrollbar">
        {/* Empty state */}
        {todayHabits.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-60 text-center"
          >
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
              <Zap size={36} className="text-primary" />
            </div>
            <h3 className="text-text-main font-bold text-lg mb-2">No habits today!</h3>
            <p className="text-text-sub text-sm mb-6">Start building your routine by adding your first habit.</p>
            <button
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-semibold shadow-glow"
            >
              <Plus size={18} /> Add First Habit
            </button>
          </motion.div>
        )}

        {/* Todo habits */}
        {todoHabits.length > 0 && (
          <div className="space-y-3 mb-6">
            <AnimatePresence>
              {todoHabits.map((habit, i) => (
                <motion.div
                  key={habit.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <HabitCard habit={habit} onClick={() => handleCardClick(habit)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Completed section */}
        {doneHabits.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Flame size={14} className="text-orange-400" />
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Completed ({doneHabits.length})
              </h3>
            </div>
            <div className="space-y-2 opacity-60">
              <AnimatePresence>
                {doneHabits.map((habit) => (
                  <motion.div
                    key={habit.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <HabitCard habit={habit} onClick={() => handleCardClick(habit)} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsAddOpen(true)}
        className="absolute bottom-24 right-6 w-14 h-14 bg-primary text-white rounded-2xl shadow-glow flex items-center justify-center z-10"
      >
        <Plus size={26} />
      </motion.button>

      {/* Modals */}
      <AddHabitModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={(data) => addHabit(data)}
      />

      {selectedHabit && (
        <AddHabitModal
          isOpen={isEditOpen}
          onClose={() => { setIsEditOpen(false); setSelectedHabit(null); }}
          onAdd={(data) => {
            if (selectedHabit) updateHabit(selectedHabit.id!, data);
            setIsEditOpen(false);
            setSelectedHabit(null);
          }}
          initialData={selectedHabit}
          editMode
        />
      )}

      <HabitLogModal
        habit={selectedHabit && !isEditOpen ? selectedHabit : null}
        onClose={() => setSelectedHabit(null)}
        onLog={handleLog}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
};