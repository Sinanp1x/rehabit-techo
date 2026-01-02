import { useState, useEffect } from 'react';
import { X, Clock, Repeat, Trash2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { type Habit } from '../db'; // Ensure you import the Habit type

interface HabitDetailModalProps {
  habit: Habit | null;
  onClose: () => void;
  onUpdate: (id: number, updates: Partial<Habit>) => void;
  onDelete: (id: number) => void;
}

const COLORS = ['#FF5252', '#448AFF', '#69F0AE', '#FFD740', '#E040FB', '#607D8B', '#FF9800', '#9C27B0'];
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const HabitDetailModal = ({ habit, onClose, onUpdate, onDelete }: HabitDetailModalProps) => {
  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [type, setType] = useState<'habit' | 'reminder'>('habit');
  const [hasTime, setHasTime] = useState(true);
  const [time, setTime] = useState('09:00');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  // Load habit data when modal opens
  useEffect(() => {
    if (habit) {
      setTitle(habit.title);
      setCategory(habit.category);
      setColor(habit.color);
      setType(habit.type);
      setHasTime(habit.hasTime);
      setTime(habit.time);
      setHasEndDate(!!habit.endDate);
      setEndDate(habit.endDate || '');
      setSelectedDays(habit.frequencyDays);
    }
  }, [habit]);

  if (!habit) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habit.id) return;

    onUpdate(habit.id, {
      title,
      category,
      color,
      type,
      hasTime,
      time: hasTime ? time : "00:00",
      endDate: hasEndDate ? endDate : null,
      frequencyDays: selectedDays
    });
    onClose();
  };

  const handleDelete = () => {
    if (confirm("Delete this item forever?")) {
      if (habit.id) onDelete(habit.id);
      onClose();
    }
  };

  const toggleDay = (index: number) => {
    if (selectedDays.includes(index)) {
      setSelectedDays(selectedDays.filter(d => d !== index));
    } else {
      setSelectedDays([...selectedDays, index].sort());
    }
  };

  return (
    <AnimatePresence>
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
          <h2 className="text-xl font-bold text-gray-900">Edit Details</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Type Selector */}
          <div className="bg-gray-100 p-1 rounded-xl flex">
            <button type="button" onClick={() => setType('habit')} className={clsx("flex-1 py-2 rounded-lg text-sm font-bold transition-all", type === 'habit' ? "bg-white shadow-sm text-black" : "text-gray-500")}>Habit</button>
            <button type="button" onClick={() => setType('reminder')} className={clsx("flex-1 py-2 rounded-lg text-sm font-bold transition-all", type === 'reminder' ? "bg-white shadow-sm text-black" : "text-gray-500")}>Reminder</button>
          </div>

          {/* Title */}
          <input 
            type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full text-2xl font-bold border-b-2 border-gray-200 py-2 focus:outline-none focus:border-black"
          />

          {/* Time & End Date */}
          <div className="space-y-4">
             {/* Time Toggle */}
             <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-wide"><Clock size={14} /> Time</div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={hasTime} onChange={(e) => setHasTime(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-black peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>
                {hasTime && <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-gray-50 rounded-xl p-3 font-medium outline-none text-lg" />}
             </div>

             {/* End Date Toggle */}
             <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-wide"><Repeat size={14} /> Duration</div>
                  <button type="button" onClick={() => setHasEndDate(!hasEndDate)} className="text-xs font-bold text-primary underline">{hasEndDate ? "Set End Date" : "Repeat Forever"}</button>
                </div>
                {hasEndDate && <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-gray-50 rounded-xl p-3 font-medium outline-none" />}
             </div>
          </div>

          {/* Category & Color */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Category</label>
              <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-gray-50 rounded-xl p-3 font-medium outline-none" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Color</label>
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                  {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)} className={clsx("w-8 h-8 rounded-full shrink-0 transition-transform border-2", color === c ? "scale-110 border-gray-400" : "border-transparent")} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>

          {/* Days */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Schedule</label>
            <div className="flex justify-between bg-gray-50 p-2 rounded-xl">
              {DAYS.map((day, index) => (
                <button key={index} type="button" onClick={() => toggleDay(index)} className={clsx("w-10 h-10 rounded-lg text-sm font-bold transition-all", selectedDays.includes(index) ? "bg-black text-white" : "text-gray-400")}>{day}</button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-4">
             <button type="button" onClick={handleDelete} className="flex items-center justify-center gap-2 text-red-500 bg-red-50 py-4 rounded-xl font-bold active:scale-95">
                <Trash2 size={20} /> Delete
             </button>
             <button type="submit" className="flex items-center justify-center gap-2 bg-black text-white py-4 rounded-xl font-bold active:scale-95 shadow-lg">
                <Save size={20} /> Save Changes
             </button>
          </div>

        </form>
      </motion.div>
    </AnimatePresence>
  );
};