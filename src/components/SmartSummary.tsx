import { useHabits } from "../hooks/useHabits";
import { getDay } from "date-fns";
import { Sparkles, TrendingUp } from "lucide-react";

export const SmartSummary = () => {
  const { habits, allLogs } = useHabits();

  if (!allLogs || allLogs.length === 0) return null;

  // 1. Find Most Productive Day of Week
  const dayCounts = [0,0,0,0,0,0,0]; // Sun to Sat
  allLogs.forEach(log => {
    const dayIndex = getDay(new Date(log.date));
    dayCounts[dayIndex]++;
  });
  const maxDayIndex = dayCounts.indexOf(Math.max(...dayCounts));
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const bestDay = days[maxDayIndex];

  // 2. Find Best Category
  const catCounts: Record<string, number> = {};
  habits.forEach(h => {
    const count = allLogs.filter(l => l.habitId === h.id).length;
    catCounts[h.category] = (catCounts[h.category] || 0) + count;
  });
  const bestCat = Object.keys(catCounts).reduce((a, b) => catCounts[a] > catCounts[b] ? a : b, "");
  
  return (
    <div className="grid grid-cols-1 gap-4 mb-6">
      
      {/* Insight Card */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
        <Sparkles className="absolute top-2 right-2 text-white/20" size={40} />
        <h3 className="font-bold text-sm text-indigo-100 uppercase mb-2 flex items-center gap-2">
           <TrendingUp size={16} /> Personal Growth
        </h3>
        <p className="text-lg font-medium leading-snug">
          You are absolutely crushing it on <span className="font-bold text-yellow-300">{bestDay}s</span>. 
          Your main focus this month is <span className="font-bold text-yellow-300">{bestCat}</span>.
        </p>
      </div>

    </div>
  );
};