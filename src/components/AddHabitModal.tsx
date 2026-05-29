// src/components/AddHabitModal.tsx — Full habit creation with tags, quantity, multi-reminder
import { useState } from 'react';
import { X, Clock, Repeat, Plus, Trash2, Tag, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { DEFAULT_HABIT_COLORS, DAYS_OF_WEEK, DEFAULT_TAGS, TAG_COLORS } from '../constants/metrics';
import type { Habit } from '../db';

type HabitInput = Omit<Habit, 'id' | 'userId' | 'archived' | 'syncStatus'>;

interface AddHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: HabitInput) => void;
  initialData?: Partial<HabitInput>;
  editMode?: boolean;
}

export const AddHabitModal = ({ isOpen, onClose, onAdd, initialData, editMode }: AddHabitModalProps) => {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [selectedTags, setSelectedTags] = useState<string[]>(initialData?.tags ?? []);
  const [customTag, setCustomTag] = useState('');
  const [color, setColor] = useState(initialData?.color ?? DEFAULT_HABIT_COLORS[0]);
  const [selectedDays, setSelectedDays] = useState<number[]>(initialData?.frequencyDays ?? [0,1,2,3,4,5,6]);
  const [type, setType] = useState<'habit' | 'reminder'>(initialData?.type ?? 'habit');
  const [hasTime, setHasTime] = useState(initialData?.hasTime ?? true);
  const [time, setTime] = useState(initialData?.time ?? '09:00');
  const [reminders, setReminders] = useState<string[]>(initialData?.reminders ?? []);
  const [notificationsEnabled, setNotificationsEnabled] = useState(initialData?.notificationsEnabled ?? false);
  const [hasEndDate, setHasEndDate] = useState(!!initialData?.endDate);
  const [endDate, setEndDate] = useState(initialData?.endDate ?? '');
  const [quantity, setQuantity] = useState(initialData?.quantity ?? '');

  const toggleDay = (i: number) =>
    setSelectedDays((d) => d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort());

  const toggleTag = (tag: string) =>
    setSelectedTags((t) => t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]);

  const addCustomTag = () => {
    const t = customTag.trim();
    if (t && !selectedTags.includes(t)) setSelectedTags((prev) => [...prev, t]);
    setCustomTag('');
  };

  const addReminder = () => setReminders((r) => [...r, '08:00']);
  const updateReminder = (i: number, val: string) =>
    setReminders((r) => r.map((x, idx) => (idx === i ? val : x)));
  const removeReminder = (i: number) =>
    setReminders((r) => r.filter((_, idx) => idx !== i));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedDays.length === 0) return;
    onAdd({
      title: title.trim(),
      tags: selectedTags.length > 0 ? selectedTags : ['General'],
      color,
      type,
      hasTime,
      time: hasTime ? time : '00:00',
      reminders,
      notificationsEnabled,
      endDate: hasEndDate && endDate ? endDate : null,
      frequencyDays: selectedDays,
      quantity: quantity.trim() || null,
      createdAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 glass-strong rounded-t-3xl p-6 z-50 max-h-[92vh] overflow-y-auto no-scrollbar"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-text-main">
                {editMode ? 'Edit Habit' : 'New Habit'}
              </h2>
              <button onClick={onClose} className="p-2 bg-border rounded-full text-text-sub hover:bg-surface">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Type Selector */}
              <div className="bg-background p-1 rounded-xl flex gap-1">
                {(['habit', 'reminder'] as const).map((t) => (
                  <button
                    key={t} type="button" onClick={() => setType(t)}
                    className={clsx(
                      'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all',
                      type === t ? 'bg-primary text-white shadow-glow-sm' : 'text-text-sub hover:text-text-main',
                    )}
                  >
                    {t === 'habit' ? '📊 Habit (Track Stats)' : '🔔 Reminder (Task)'}
                  </button>
                ))}
              </div>

              {/* Title */}
              <input
                autoFocus type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent text-2xl font-bold text-text-main border-b-2 border-border py-2 focus:outline-none focus:border-primary placeholder:text-text-muted transition-colors"
                placeholder={type === 'habit' ? 'e.g. Morning Run' : 'e.g. Call Mom'}
                required
              />

              {/* Quantity Goal */}
              {type === 'habit' && (
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-text-sub uppercase tracking-wide mb-2">
                    <Target size={14} /> Quantity Goal (optional)
                  </label>
                  <input
                    type="text" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-background rounded-xl p-3 text-text-main text-sm outline-none border border-border focus:border-primary"
                    placeholder='e.g. "30 min" or "8 glasses"'
                  />
                </div>
              )}

              {/* Tags */}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-text-sub uppercase tracking-wide mb-3">
                  <Tag size={14} /> Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {DEFAULT_TAGS.map((tag) => (
                    <button
                      key={tag} type="button" onClick={() => toggleTag(tag)}
                      className={clsx(
                        'px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                        selectedTags.includes(tag)
                          ? 'text-white border-transparent'
                          : 'bg-background text-text-sub border-border hover:border-primary',
                      )}
                      style={selectedTags.includes(tag) ? { backgroundColor: TAG_COLORS[tag] || color } : {}}
                    >
                      {tag}
                    </button>
                  ))}
                  {selectedTags
                    .filter((t) => !DEFAULT_TAGS.includes(t))
                    .map((tag) => (
                      <button
                        key={tag} type="button" onClick={() => toggleTag(tag)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-white border border-transparent"
                      >
                        {tag} ×
                      </button>
                    ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text" value={customTag} onChange={(e) => setCustomTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                    className="flex-1 bg-background rounded-xl px-3 py-2 text-sm text-text-main border border-border focus:border-primary outline-none"
                    placeholder="Custom tag…"
                  />
                  <button type="button" onClick={addCustomTag}
                    className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold">
                    Add
                  </button>
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-bold text-text-sub uppercase tracking-wide mb-3">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {DEFAULT_HABIT_COLORS.map((c) => (
                    <button
                      key={c} type="button" onClick={() => setColor(c)}
                      className={clsx(
                        'w-9 h-9 rounded-full shrink-0 transition-all border-2',
                        color === c ? 'scale-125 border-white shadow-glow-sm' : 'border-transparent opacity-60 hover:opacity-100',
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div>
                <label className="block text-xs font-bold text-text-sub uppercase tracking-wide mb-3">Schedule</label>
                <div className="flex justify-between bg-background p-2 rounded-xl">
                  {DAYS_OF_WEEK.map((day, i) => (
                    <button
                      key={i} type="button" onClick={() => toggleDay(i)}
                      className={clsx(
                        'w-10 h-10 rounded-lg text-sm font-bold transition-all',
                        selectedDays.includes(i)
                          ? 'bg-primary text-white shadow-glow-sm'
                          : 'text-text-muted hover:text-text-sub',
                      )}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Time */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-text-sub uppercase tracking-wide">
                    <Clock size={14} /> Reminder Time
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={hasTime} onChange={(e) => setHasTime(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                  </label>
                </div>
                {hasTime && (
                  <input
                    type="time" value={time} onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-background rounded-xl p-3 text-text-main font-medium outline-none border border-border focus:border-primary text-lg"
                  />
                )}
              </div>

              {/* Additional Reminders */}
              {hasTime && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-text-sub uppercase tracking-wide">Additional Reminders</label>
                    <button type="button" onClick={addReminder}
                      className="flex items-center gap-1 text-xs text-primary font-semibold">
                      <Plus size={14} /> Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {reminders.map((r, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          type="time" value={r} onChange={(e) => updateReminder(i, e.target.value)}
                          className="flex-1 bg-background rounded-xl p-3 text-text-main font-medium outline-none border border-border focus:border-primary"
                        />
                        <button type="button" onClick={() => removeReminder(i)}
                          className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notifications Toggle */}
              {hasTime && (
                <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-border">
                  <div>
                    <p className="text-sm font-semibold text-text-main">Enable Notifications</p>
                    <p className="text-xs text-text-sub mt-0.5">Get reminded at scheduled times</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={notificationsEnabled} onChange={(e) => setNotificationsEnabled(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                  </label>
                </div>
              )}

              {/* End Date */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-text-sub uppercase tracking-wide">
                    <Repeat size={14} /> Duration
                  </label>
                  <button type="button" onClick={() => setHasEndDate(!hasEndDate)}
                    className="text-xs font-semibold text-primary">
                    {hasEndDate ? 'Set End Date ✓' : 'Repeat Forever'}
                  </button>
                </div>
                {hasEndDate && (
                  <input
                    type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-background rounded-xl p-3 text-text-main font-medium outline-none border border-border focus:border-primary"
                  />
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg active:scale-95 transition-transform shadow-glow mt-2"
              >
                {editMode ? 'Save Changes' : `Create ${type === 'habit' ? 'Habit' : 'Reminder'}`}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};