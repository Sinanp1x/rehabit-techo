import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import type { Habit } from '../db';

interface AddHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (title: string, category: Habit['category'], target: number, unit: string, days: number[]) => void;
}

const CATEGORIES: Habit['category'][] = ['Health', 'Study', 'Spiritual', 'Family', 'Personal'];
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Sunday to Saturday

export const AddHabitModal = ({ isOpen, onClose, onAdd }: AddHabitModalProps) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Habit['category']>('Personal');
  
  // New State
  const [target, setTarget] = useState(1);
  const [unit, setUnit] = useState('times');
  const [selectedDays, setSelectedDays] = useState<number[]>([0,1,2,3,4,5,6]); // Default All Days

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
    onAdd(title, category, target, unit, selectedDays);
    
    // Reset Form
    setTitle('');
    setTarget(1);
    setUnit('times');
    setSelectedDays([0,1,2,3,4,5,6]);
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
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-50 max-w-md mx-auto h-[85vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">New Habit</h2>
              <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Name */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Name</label>
                <input 
                  autoFocus
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Read Book"
                  className="w-full text-lg border-b-2 border-gray-200 py-2 focus:outline-none focus:border-primary bg-transparent"
                />
              </div>

              {/* 2. Goal (Row) */}
              <div className="flex gap-4">
                <div className="w-1/3">
                  <label className="block text-sm font-medium text-gray-500 mb-2">Target</label>
                  <input 
                    type="number" 
                    min="1"
                    value={target}
                    onChange={(e) => setTarget(parseInt(e.target.value) || 1)}
                    className="w-full text-lg border-b-2 border-gray-200 py-2 focus:outline-none focus:border-primary bg-transparent text-center"
                  />
                </div>
                <div className="w-2/3">
                  <label className="block text-sm font-medium text-gray-500 mb-2">Unit</label>
                  <input 
                    type="text" 
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="times, pages, mins..."
                    className="w-full text-lg border-b-2 border-gray-200 py-2 focus:outline-none focus:border-primary bg-transparent"
                  />
                </div>
              </div>

              {/* 3. Category */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-3">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={clsx(
                        "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
                        category === cat ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Schedule */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-3">Schedule</label>
                <div className="flex justify-between bg-gray-50 p-2 rounded-xl">
                  {DAYS.map((day, index) => {
                    const isSelected = selectedDays.includes(index);
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => toggleDay(index)}
                        className={clsx(
                          "w-10 h-10 rounded-lg text-sm font-bold transition-all",
                          isSelected ? "bg-primary text-white shadow-md" : "text-gray-400 hover:bg-gray-200"
                        )}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  {selectedDays.length === 7 ? "Every Day" : 
                   selectedDays.length === 0 ? "Never" : 
                   "Selected Days Only"}
                </p>
              </div>

              <button 
                type="submit"
                className="w-full bg-primary text-white py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Check size={20} /> Save Habit
              </button>
              <div className="h-4" />
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};