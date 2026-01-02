import { useState } from 'react';
import { AddHabitModal } from '../components/AddHabitModal';
import { HabitDetailModal } from '../components/HabitDetailModal';
import { LicenseModal } from '../components/LicenseModal';
import { useHabits, type HabitWithStatus } from '../hooks/useHabits';
import { Plus, Clock, Smile, Bell, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { auth } from '../firebase';

interface HomePageProps {
  hasLicense: boolean;
  onLicenseVerified: () => void;
}

export const HomePage = ({ hasLicense, onLicenseVerified }: HomePageProps) => {
  const { habits, addHabit, toggleHabit, updateHabit, deleteHabit } = useHabits();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<HabitWithStatus | null>(null);

  // Get user info
  const user = auth.currentUser;
  const userName = user?.displayName || 'User';
  const avatar = user?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Default';

  // Determine greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night';

  // Filter for Today
  const todayHabits = habits.filter(h => h.isScheduledToday);
  
  // Sort by Time
  const sortedHabits = todayHabits.sort((a, b) => a.time.localeCompare(b.time));

  // Split into "Upcoming" and "Done"
  const todoHabits = sortedHabits.filter(h => !h.isDoneToday);
  const doneHabits = sortedHabits.filter(h => h.isDoneToday);

  const handleFabClick = () => {
    if (hasLicense) {
      // User is verified -> Open Add Habit Modal
      setIsAddModalOpen(true);
    } else {
      // User is NOT verified -> Open License Modal
      setIsLicenseModalOpen(true);
    }
  };

  const handleLicenseSuccess = () => {
    onLicenseVerified(); // Tell App.tsx we are good
    setIsLicenseModalOpen(false); // Close License Modal
    setTimeout(() => setIsAddModalOpen(true), 300); // Open the Add Modal immediately after!
  };

  return (
    <div className="flex flex-col h-full relative bg-gray-50">
      
      {/* Header */}
      <header className="px-6 pt-6 pb-6 bg-white rounded-b-3xl shadow-sm z-10">
        
        {/* Greeting */}
        <div className="flex items-center gap-2 mb-4">
          <Smile size={20} className="text-yellow-500" />
          <p className="text-sm text-gray-500">{greeting}, {userName}!</p>
        </div>

        {/* Today and Date with Avatar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Today</h1>
            <p className="text-gray-500">{format(new Date(), "EEEE, MMMM d")}</p>
          </div>
          <img src={avatar} alt="Avatar" className="w-10 h-10 rounded-full" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pt-6 pb-24 no-scrollbar">
        
        {/* 1. TO DO LIST */}
        <div className="space-y-4">
          {todoHabits.length === 0 && doneHabits.length === 0 && (
             <div className="text-center mt-10 text-gray-400">No habits today. Relax!</div>
          )}
          
          {todoHabits.map(habit => (
            <div 
              key={habit.id}
              // CLICK ON CARD BODY -> Open Edit Modal
              onClick={() => setSelectedHabit(habit)} 
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-98 transition-transform cursor-pointer"
            >
              <div className="flex items-center gap-4">
                 {/* COPY YOUR VISUAL LOGIC FROM PREVIOUS STEP HERE, IT'S THE SAME */}
                 {habit.type === 'habit' ? (
                   <div className="w-3 h-12 rounded-full" style={{ backgroundColor: habit.color }} />
                 ) : (
                   <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"><Bell size={18} /></div>
                 )}
                 <div>
                    <h3 className="font-bold text-gray-900 text-lg">{habit.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                        {habit.hasTime ? (<><Clock size={12} /><span>{habit.time}</span></>) : (<span className="text-gray-400 italic">All Day</span>)}
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-500 uppercase">{habit.category}</span>
                    </div>
                 </div>
              </div>
              
              {/* CHECK CIRCLE -> Toggle Status (Stop Propagation!) */}
              <button 
                onClick={(e) => {
                  e.stopPropagation(); // <--- CRITICAL: Don't open modal
                  toggleHabit(habit.id!);
                }}
                className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center hover:bg-gray-50"
              >
                {/* Empty circle */}
              </button>
            </div>
          ))}
        </div>

        {/* 2. COMPLETED LIST */}
        {doneHabits.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 tracking-wider">Completed</h3>
            <div className="space-y-2 opacity-60">
               {doneHabits.map(habit => (
                <div 
                  key={habit.id}
                  onClick={() => setSelectedHabit(habit)} // Can also edit completed habits
                  className="bg-gray-100 p-3 rounded-xl flex items-center justify-between"
                >
                  <span className="text-gray-500 line-through font-medium ml-2">{habit.title}</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleHabit(habit.id!); }}
                    className="text-green-500 p-2"
                  >
                    <CheckCircle2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* FAB - The Trigger */}
      <div className="absolute bottom-24 right-6 z-10">
        <button 
          onClick={handleFabClick}
          className="bg-black text-white p-4 rounded-full shadow-lg hover:scale-105 transition-transform active:scale-95"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* 1. Add Habit Modal (Only opens if licensed) */}
      <AddHabitModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        onAdd={addHabit}
      />
      
      {/* 2. Edit Modal (Maybe restrict editing too? Up to you. Currently allowed.) */}
      <HabitDetailModal 
        habit={selectedHabit}
        onClose={() => setSelectedHabit(null)}
        onUpdate={updateHabit}
        onDelete={deleteHabit}
      />

      {/* 3. NEW: License Modal (Opens if NOT licensed) */}
      <LicenseModal 
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
        onSuccess={handleLicenseSuccess}
      />

    </div>
  );
};