import { useState, useEffect } from 'react';
import { X, Trash2, Save, Minus, Plus, MessageSquare, History, SkipForward } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type Habit, type HabitLog } from '../db';
import { db } from '../db'; // Direct access for quick history fetch

interface HabitDetailModalProps {
  habit: Habit | null;
  onClose: () => void;
  onDelete: (id: number) => void;
  onUpdateProgress: (id: number, value: number, note: string, status?: 'skipped') => void; // <--- Updated
  currentValue: number;
}

export const HabitDetailModal = ({ 
  habit, onClose, onDelete, onUpdateProgress, currentValue 
}: HabitDetailModalProps) => {
  const [val, setVal] = useState(currentValue);
  const [note, setNote] = useState('');
  const [history, setHistory] = useState<HabitLog[]>([]);

  // Load Data when modal opens
  useEffect(() => {
    if (habit && habit.id) {
      setVal(currentValue);
      // Fetch Note for Today
      db.logs.where({ habitId: habit.id, date: new Date().toISOString().split('T')[0] })
        .first()
        .then(log => setNote(log?.note || ''));
        
      // Fetch History
      db.logs.where("habitId").equals(habit.id)
        .reverse()
        .limit(5)
        .toArray()
        .then(setHistory);
    }
  }, [habit, currentValue]);

  if (!habit) return null;

  const handleSave = () => {
    if (habit.id) {
      onUpdateProgress(habit.id, val, note);
      onClose();
    }
  };

  const handleSkip = () => {
    if (habit.id) {
      onUpdateProgress(habit.id, 0, note, 'skipped'); 
      onClose();
    }
  };

  const handleDelete = () => {
    if (confirm(`Delete "${habit.title}" forever?`)) {
      if (habit.id) onDelete(habit.id);
      onClose();
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
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{habit.category}</span>
            <h2 className="text-2xl font-bold text-gray-900 mt-1">{habit.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full text-gray-400">
            <X size={20} />
          </button>
        </div>

        {/* 1. Progress Control */}
        <div className="bg-gray-50 rounded-2xl p-6 mb-6 flex flex-col items-center">
          <div className="flex items-center gap-6 mb-4">
            <button onClick={() => setVal(Math.max(0, val - 1))} className="w-12 h-12 rounded-full bg-white shadow border border-gray-200 flex items-center justify-center text-gray-600 active:scale-95"><Minus size={24} /></button>
            <div className="text-center">
              <span className="text-4xl font-bold text-primary block">{val}</span>
              <span className="text-xs text-gray-400 font-medium">/ {habit.targetValue} {habit.unit}</span>
            </div>
            <button onClick={() => setVal(val + 1)} className="w-12 h-12 rounded-full bg-white shadow border border-gray-200 flex items-center justify-center text-gray-600 active:scale-95"><Plus size={24} /></button>
          </div>
          
          {/* Note Input */}
          <div className="w-full flex gap-2 items-center bg-white px-3 py-2 rounded-xl border border-gray-200">
            <MessageSquare size={18} className="text-gray-400" />
            <input 
              type="text" 
              placeholder="Add a note (e.g. 'Felt tired')" 
              value={note} 
              onChange={(e) => setNote(e.target.value)}
              className="flex-1 outline-none text-sm text-gray-700"
            />
          </div>
        </div>

        {/* 2. History List */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <History size={18} className="text-gray-400" />
            <h3 className="font-semibold text-gray-900">Recent History</h3>
          </div>
          <div className="space-y-2">
            {history.length === 0 ? (
              <p className="text-sm text-gray-400 italic ml-6">No history yet.</p>
            ) : (
              history.map(log => (
                <div key={log.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <span className="text-sm font-medium text-gray-800 block">{log.date}</span>
                    {log.note && <span className="text-xs text-gray-500">"{log.note}"</span>}
                  </div>
                  <span className="text-sm font-bold text-primary">{log.value} {habit.unit}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          
          {/* Row 1: Main Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleDelete} className="py-4 rounded-xl border border-red-100 text-red-500 font-bold flex items-center justify-center gap-2 hover:bg-red-50">
              <Trash2 size={18} /> Delete
            </button>
            
            {/* NEW: Skip Button */}
            <button onClick={handleSkip} className="py-4 rounded-xl bg-yellow-100 text-yellow-700 font-bold flex items-center justify-center gap-2 hover:bg-yellow-200">
              <SkipForward size={18} /> Skip
            </button>
          </div>

          {/* Row 2: Save Button (Full Width) */}
          <button onClick={handleSave} className="w-full py-4 rounded-xl bg-black text-white font-bold flex items-center justify-center gap-2 active:scale-95 shadow-lg">
            <Save size={18} /> Save Entry
          </button>

        </div>
      </motion.div>
    </AnimatePresence>
  );
};