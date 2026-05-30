// src/components/HabitCard.tsx — Premium dark habit card with streak display
import { clsx } from 'clsx';
import { Flame, Clock, Bell, BellOff, CheckCircle2, MinusCircle, SkipForward, Sparkles, Dumbbell, BookOpen, Notebook, Droplet, Brain } from 'lucide-react';
import type { HabitWithStatus } from '../hooks/useHabits';

const getHabitIcon = (iconName?: string) => {
  switch (iconName) {
    case 'spiritual': return <Sparkles size={18} className="text-white" />;
    case 'exercise': return <Dumbbell size={18} className="text-white" />;
    case 'book': return <BookOpen size={18} className="text-white" />;
    case 'journal': return <Notebook size={18} className="text-white" />;
    case 'hydration': return <Droplet size={18} className="text-white" />;
    case 'deepwork': return <Clock size={18} className="text-white" />;
    case 'meditation': return <Brain size={18} className="text-white" />;
    default: return null;
  }
};

interface HabitCardProps {
  habit: HabitWithStatus;
  onClick: () => void;
}

export const HabitCard = ({ habit, onClick }: HabitCardProps) => {
  const isDone = habit.logStatusToday === 'done';
  const isPartial = habit.logStatusToday === 'partial';
  const isSkip = habit.logStatusToday === 'skip';
  const isLogged = isDone || isPartial || isSkip;

  return (
    <div
      onClick={onClick}
      className={clsx(
        'relative flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 cursor-pointer active:scale-98 border',
        isDone ? 'bg-green-500/10 border-green-500/20' :
        isPartial ? 'bg-yellow-500/10 border-yellow-500/20' :
        isSkip ? 'bg-blue-500/10 border-blue-500/20' :
        'bg-card border-border hover:border-primary/30 hover:bg-surface',
      )}
    >
      {/* Color accent bar or Icon */}
      {habit.type === 'habit' ? (
        getHabitIcon(habit.icon) ? (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ backgroundColor: habit.color }}
          >
            {getHabitIcon(habit.icon)}
          </div>
        ) : (
          <div
            className="w-1 h-12 rounded-full shrink-0"
            style={{ backgroundColor: habit.color }}
          />
        )
      ) : (
        <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center shrink-0 border border-border">
          <Bell size={16} className="text-text-sub" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className={clsx(
          'font-bold text-base truncate transition-colors',
          isLogged ? 'text-text-sub line-through' : 'text-text-main',
        )}>
          {habit.title}
        </h3>

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {/* Time */}
          {habit.hasTime && (
            <div className="flex items-center gap-1 text-text-muted text-xs">
              <Clock size={11} />
              <span>{habit.time}</span>
            </div>
          )}

          {/* Notifications */}
          {habit.notificationsEnabled ? (
            <Bell size={11} className="text-primary opacity-60" />
          ) : (
            <BellOff size={11} className="text-text-muted opacity-40" />
          )}

          {/* Tags */}
          {habit.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 bg-primary/10 text-primary-light rounded-full font-medium"
            >
              {tag}
            </span>
          ))}
          {habit.tags.length > 2 && (
            <span className="text-xs text-text-muted">+{habit.tags.length - 2}</span>
          )}
        </div>
      </div>

      {/* Right side: streak + status */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        {/* Streak badge */}
        {habit.currentStreak > 0 && habit.type === 'habit' && (
          <div className="flex items-center gap-1 bg-orange-500/10 px-2 py-1 rounded-full border border-orange-500/20">
            <Flame size={12} className="text-orange-400 flame-anim" />
            <span className="text-xs font-bold text-orange-400">{habit.currentStreak}</span>
          </div>
        )}

        {/* Status icon */}
        <div className={clsx(
          'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
          isDone ? 'bg-green-500 border-green-500 shadow-glow-sm' :
          isPartial ? 'bg-yellow-500 border-yellow-500' :
          isSkip ? 'bg-blue-500/20 border-blue-500/50' :
          'border-border bg-transparent',
        )}>
          {isDone && <CheckCircle2 size={20} className="text-white" />}
          {isPartial && <MinusCircle size={20} className="text-black" />}
          {isSkip && <SkipForward size={16} className="text-blue-400" />}
        </div>
      </div>
    </div>
  );
};