import { useState } from 'react';
import { X, Clock, Repeat } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { DEFAULT_HABIT_COLORS, DAYS_OF_WEEK } from '../constants/metrics';

interface AddHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Updated Signature
  onAdd: (title: string, category: string, color: string, type: 'habit' | 'reminder', hasTime: boolean, time: string, endDate: string | null, days: number[]) => void;
}

export const AddHabitModal = ({ isOpen, onClose, onAdd }: AddHabitModalProps) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState(DEFAULT_HABIT_COLORS[1]);
  const [selectedDays, setSelectedDays] = useState<number[]>([0,1,2,3,4,5,6]);

  // NEW CONTROLS
  const [type, setType] = useState<'habit' | 'reminder'>('habit'); // Toggle 1
  const [hasTime, setHasTime] = useState(true);                    // Toggle 2
  const [time, setTime] = useState('09:00');
  const [hasEndDate, setHasEndDate] = useState(false);             // Toggle 3
  const [endDate, setEndDate] = useState('');

  const toggleDay = (index: number) => {
    if (selectedDays.includes(index)) {
      setSelectedDays(selectedDays.filter(d => d !== index));
    } else {
      setSelectedDays([...selectedDays, index].sort());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    onAdd(
      title, 
      category || (type === 'habit' ? "General" : "Tasks"), 
      color, 
      type,
      hasTime,
      hasTime ? time : "00:00",
      hasEndDate && endDate ? endDate : null,
      selectedDays
    );
    
    // Reset
    setTitle('');
    setCategory('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
          
          <motion.div 
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-50 h-[85vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">New Item</h2>
              <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* 1. TYPE SELECTOR (Habit vs Reminder) */}
              <div className="bg-gray-100 p-1 rounded-xl flex">
                <button
                  type="button"
                  onClick={() => setType('habit')}
                  className={clsx("flex-1 py-2 rounded-lg text-sm font-bold transition-all", type === 'habit' ? "bg-white shadow-sm text-black" : "text-gray-500")}
                >
                  Habit (Track Stats)
                </button>
                <button
                  type="button"
                  onClick={() => setType('reminder')}
                  className={clsx("flex-1 py-2 rounded-lg text-sm font-bold transition-all", type === 'reminder' ? "bg-white shadow-sm text-black" : "text-gray-500")}
                >
                  Reminder (Task Only)
                </button>
              </div>

              {/* Name */}
              <div>
                <input 
                  autoFocus type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-2xl font-bold border-b-2 border-gray-200 py-2 focus:outline-none focus:border-black"
                  placeholder={type === 'habit' ? "e.g. Read Book" : "e.g. Call Mom"}
                />
              </div>

              {/* 2. TIME CONTROL */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-wide">
                    <Clock size={14} /> Time
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={hasTime} onChange={(e) => setHasTime(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>
                
                {hasTime && (
                  <input 
                    type="time" value={time} onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-gray-50 rounded-xl p-3 font-medium outline-none text-lg"
                  />
                )}
              </div>

              {/* 3. END DATE CONTROL */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-wide">
                    <Repeat size={14} /> Duration
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setHasEndDate(!hasEndDate)}
                    className="text-xs font-bold text-primary underline"
                  >
                    {hasEndDate ? "Set End Date" : "Repeat Forever"}
                  </button>
                </div>
                
                {hasEndDate && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Stop repeating after:</label>
                    <input 
                      type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-gray-50 rounded-xl p-3 font-medium outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Category & Color */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Category</label>
                  <input 
                    type="text" value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-gray-50 rounded-xl p-3 font-medium outline-none"
                    placeholder="e.g. Work"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Color</label>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                     {DEFAULT_HABIT_COLORS.map(c => (
                      <button
                        key={c} type="button" onClick={() => setColor(c)}
                        className={clsx("w-8 h-8 rounded-full shrink-0 transition-transform border-2", color === c ? "scale-110 border-gray-400" : "border-transparent")}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Days */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Schedule</label>
                <div className="flex justify-between bg-gray-50 p-2 rounded-xl">
                  {DAYS_OF_WEEK.map((day, index) => (
                    <button
                      key={index} type="button" onClick={() => toggleDay(index)}
                      className={clsx(
                        "w-10 h-10 rounded-lg text-sm font-bold transition-all",
                        selectedDays.includes(index) ? "bg-black text-white" : "text-gray-400"
                      )}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg active:scale-95 transition-transform mt-4">
                Create {type === 'habit' ? 'Habit' : 'Reminder'}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};