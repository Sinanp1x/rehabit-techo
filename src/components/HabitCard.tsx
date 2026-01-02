import { Check, Circle, Activity, Book, Heart, Users, User, SkipForward } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

const CATEGORY_STYLES = {
  Health: { icon: Activity, color: 'text-rose-500', bg: 'bg-rose-100' },
  Study: { icon: Book, color: 'text-blue-500', bg: 'bg-blue-100' },
  Spiritual: { icon: Heart, color: 'text-purple-500', bg: 'bg-purple-100' },
  Family: { icon: Users, color: 'text-orange-500', bg: 'bg-orange-100' },
  Personal: { icon: User, color: 'text-teal-500', bg: 'bg-teal-100' },
};

interface HabitCardProps {
  title: string;
  category: keyof typeof CATEGORY_STYLES;
  completed: boolean;
  onToggle: () => void;
  onBodyClick?: () => void;
  status?: 'done' | 'partial' | 'skipped';
}

export const HabitCard = ({ 
  title, 
  category, 
  completed, 
  onToggle, 
  onBodyClick, 
  status 
}: HabitCardProps) => {
  const Style = CATEGORY_STYLES[category] || CATEGORY_STYLES.Personal;
  const Icon = Style.icon;

  // Determine Border Color based on Status
  const isSkipped = status === 'skipped';
  
  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      className={clsx(
        "relative w-full p-4 mb-3 rounded-2xl shadow-sm transition-all duration-300 border-l-4", // added border-l-4
        completed ? "bg-white border-green-500 opacity-60" : 
        isSkipped ? "bg-yellow-50 border-yellow-400" :     // Yellow for skipped
        "bg-white border-transparent"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1" onClick={onBodyClick}> {/* Added flex-1 and click */}
          <div className={clsx("p-3 rounded-xl", Style.bg)}>
            <Icon size={20} className={Style.color} />
          </div>
          
          <div>
            <h3 className={clsx("font-semibold text-lg", completed && "line-through text-text-sub")}>
              {title}
            </h3>
            {/* Show Goal Progress if not simple boolean */}
            <p className="text-xs text-text-sub font-medium">
              {/* If you pass currentValue prop here later, you can show "5/20 pages" */}
              Tap to view details
            </p>
          </div>
        </div>

        {/* Update the checkbox button to show Skip Icon if skipped */}
        <button 
          onClick={onToggle}
          className={clsx(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
            completed ? "bg-success text-white" : 
            isSkipped ? "bg-yellow-400 text-white" : // Yellow Button
            "bg-background text-text-sub hover:bg-gray-200"
          )}
        >
          {completed ? <Check size={24} strokeWidth={3} /> : 
           isSkipped ? <SkipForward size={24} strokeWidth={3} /> : // Show Skip Icon
           <Circle size={24} />}
        </button>
      </div>
    </motion.div>
  );
};