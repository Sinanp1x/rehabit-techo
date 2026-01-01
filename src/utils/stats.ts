import { type Habit, type HabitLog } from "../db";
import { format, subDays, isSameDay } from "date-fns";

export const calculateStats = (habits: Habit[], logs: HabitLog[]) => {
  const today = new Date();
  
  // 1. Calculate Total Completions
  const totalCompletions = logs.length;

  // 2. Calculate Weekly Progress (Last 7 Days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(today, 6 - i);
    const dateStr = format(d, "yyyy-MM-dd");
    
    // Find logs for this specific day
    const dayLogs = logs.filter(l => l.date === dateStr);
    
    // Calculate Score: (Done / Total Active Habits) * 100
    // Note: This is a simplified view. Real apps track history of habit creation.
    const score = habits.length > 0 
      ? Math.round((dayLogs.length / habits.length) * 100) 
      : 0;

    return {
      dayName: format(d, "EEE"), // Mon, Tue...
      date: d.getDate(),         // 1, 2...
      score: score,              // 0 to 100
      isToday: isSameDay(d, today)
    };
  });

  // 3. Calculate Category Breakdown
  const categoryCounts: Record<string, number> = {};
  logs.forEach(log => {
    const habit = habits.find(h => h.id === log.habitId);
    if (habit) {
      categoryCounts[habit.category] = (categoryCounts[habit.category] || 0) + 1;
    }
  });

  // Convert to array for charts
  const categories = Object.entries(categoryCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count); // Highest first

  return { totalCompletions, last7Days, categories };
};