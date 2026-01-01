import { useState } from 'react';
import { HabitCard } from '../components/HabitCard';
import { AddHabitModal } from '../components/AddHabitModal';
import { HabitDetailModal } from '../components/HabitDetailModal'; // <--- Import
import { useHabits } from '../hooks/useHabits';
import { syncData } from '../services/sync';
import { Plus, CloudUpload } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { type Habit } from '../db';

export const HomePage = () => {
  const { habits, addHabit, toggleHabit, deleteHabit, updateProgress } = useHabits(); // <--- Get delete & update
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<any>(null); // <--- State for selected habit
  const [isSyncing, setIsSyncing] = useState(false); // UI State for animation

  // Calculate Progress
  const total = habits.length;
  const completedCount = habits.filter(h => h.completed).length;
  const progress = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  // Manual Sync Handler
  const handleSync = async () => {
    setIsSyncing(true);
    await syncData();
    setTimeout(() => setIsSyncing(false), 1000); // Keep spinner for 1s so user sees it
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-background overflow-hidden relative">
      
      {/* Header */}
      <header className="px-6 pt-12 pb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-text-main">Today</h1>
            <p className="text-text-sub text-sm">
              {format(new Date(), "EEE, MMM d")} • {progress}% Done
            </p>
          </div>
          
          <div className="flex gap-3 items-center">
            {/* Sync Button */}
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className={clsx(
                "p-2 rounded-full bg-white shadow-sm border border-gray-100 text-primary transition-all active:scale-95",
                isSyncing && "animate-spin opacity-50"
              )}
            >
              <CloudUpload size={20} />
            </button>

            {/* Avatar */}
            <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden border-2 border-white shadow-sm">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" />
            </div>
          </div>
        </div>
      </header>

      {/* Habit List */}
      <main className="flex-1 overflow-y-auto px-6 pb-24 no-scrollbar">
        {habits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center opacity-50">
            <p className="text-lg font-medium">No habits yet</p>
            <p className="text-sm">Tap the + button to start</p>
          </div>
        ) : (
          habits.map((habit) => (
            <HabitCard 
              key={habit.id}
              title={habit.title}
              category={habit.category}
              completed={habit.completed}
              // Toggle Button Click
              onToggle={() => toggleHabit(
                habit.id!, 
                // @ts-ignore
                habit.currentValue, 
                habit.targetValue, 
                habit.completedId
              )}
              // Text Body Click -> Open Detail Modal
              onBodyClick={() => setSelectedHabit(habit)}
            />
          ))
        )}
      </main>

      {/* FAB */}
      <div className="absolute bottom-24 right-6 z-10">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-black text-white p-4 rounded-full shadow-lg hover:scale-105 transition-transform active:scale-95"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Modal */}
      <AddHabitModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onAdd={addHabit}
      />

      {/* NEW: Detail Modal */}
      <HabitDetailModal
        habit={selectedHabit}
        currentValue={selectedHabit?.currentValue || 0}
        onClose={() => setSelectedHabit(null)}
        onDelete={deleteHabit}
        onUpdateProgress={updateProgress}
      />
    </div>
  );
}