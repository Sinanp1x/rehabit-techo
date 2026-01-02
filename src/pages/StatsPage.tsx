import { useState, useEffect } from "react";
import { useHabits } from "../hooks/useHabits";
import { getFriendID } from "../utils/user";
import { getFriendScore } from "../services/sync";
import { Leaderboard } from "../components/Leaderboard";
import { SmartSummary } from "../components/SmartSummary";
import { SocialPodium } from "../components/SocialPodium";
import { Flame, Trophy, Calendar, Download, Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { format, subDays, eachDayOfInterval, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay } from "date-fns";
import { type HabitLog } from "../db";
import { 
  COMPLETIONS_PER_LEVEL, 
  STATS_LOOKBACK_DAYS, 
  MAX_SCORE, 
  DISCIPLINE_TARGET, 
  RESPONSIBILITY_TARGET, 
  DEVOTION_TARGET, 
  FOCUS_TARGET 
} from "../constants/metrics";

export const StatsPage = () => {
  const { habits = [], allLogs = [] } = useHabits();
  const [friendScore, setFriendScore] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  // --- CRITICAL FILTER ---
  // Only use habits that are type 'habit'. Ignore 'reminders'.
  const trackableHabits = habits.filter(h => h.type === 'habit'); 
  // -----------------------

  // Now replace 'habits' with 'trackableHabits' in all logic below:
  
  // 1. Hero Stats
  // We should also filter logs to only count logs for habits, not reminders
  const habitIds = trackableHabits.map(h => h.id);
  const habitLogs = allLogs.filter(l => habitIds.includes(l.habitId));

  const totalCompletions = habitLogs.length; 
  const level = Math.floor(totalCompletions / COMPLETIONS_PER_LEVEL) + 1;

  // 2. Last 7 Days (Use habitLogs and trackableHabits)
  const today = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(today, 6 - i);
    const dateStr = format(d, "yyyy-MM-dd");
    const doneCount = habitLogs.filter(l => l.date === dateStr).length;
    const score = Math.min(100, (doneCount / Math.max(1, trackableHabits.length)) * 100);
    return { dayName: format(d, "EEE"), isToday: isSameDay(d, today), score: score };
  });

  // 3. Pie Chart (Use trackableHabits and habitLogs)
  const categoryData = trackableHabits.reduce((acc: any[], habit) => {
    const count = habitLogs.filter(l => l.habitId === habit.id).length;
    const existing = acc.find((c:any) => c.name === habit.category);
    if (existing) existing.value += count;
    else acc.push({ name: habit.category, value: count, color: habit.color });
    return acc;
  }, []).filter((item:any) => item.value > 0);

  // ---------------------------------------------------------  
  // 1. DATA PREP FOR PERSONALITY GRAPH (RPG STATS)  
  // ---------------------------------------------------------  
    
  // A. Filter Data (Last 30 Days)  
  const recentLogs: HabitLog[] = allLogs.filter((l) => l.date >= format(subDays(today, STATS_LOOKBACK_DAYS), "yyyy-MM-dd"));  
    
  // B. Calculate Metrics  
    
  // Metric 1: CONSISTENCY (Active Days / 30)  
  // How many unique days did you log at least one thing?  
  const activeDays = new Set(recentLogs.map((l) => l.date)).size;  
  const scoreConsistency = Math.min(MAX_SCORE, (activeDays / STATS_LOOKBACK_DAYS) * 100);  
    
  // Metric 2: DISCIPLINE (Habit Completion %)  
  const habitItems = habits.filter(h => h.type === 'habit');  
  const habitLogCount = recentLogs.filter((l) => {  
    const parent = habits.find(h => h.id === l.habitId);  
    return parent?.type === 'habit';  
  }).length;  
  // We assume a 'perfect' score is doing every habit roughly every other day (x15)  
  const scoreDiscipline = habitItems.length ? Math.min(MAX_SCORE, (habitLogCount / (habitItems.length * DISCIPLINE_TARGET)) * 100) : 0;   
    
  // Metric 3: RESPONSIBILITY (Reminder Completion %)  
  const reminderItems = habits.filter(h => h.type === 'reminder');  
  const reminderLogCount = recentLogs.filter((l) => {  
    const parent = habits.find(h => h.id === l.habitId);  
    return parent?.type === 'reminder';  
  }).length;  
  // We assume a 'perfect' score is clearing reminders regularly  
  const scoreResponsibility = reminderItems.length ? Math.min(MAX_SCORE, (reminderLogCount / (reminderItems.length * RESPONSIBILITY_TARGET)) * 100) : 0;  
    
  // Metric 4: DEVOTION (Total Volume)  
  // Pure volume: Did you log 60 items this month? (2 per day avg)  
  const scoreDevotion = Math.min(MAX_SCORE, (recentLogs.length / DEVOTION_TARGET) * 100);  
    
  // Metric 5: FOCUS (Timed Task Completion)  
  // Do you complete tasks that have specific times set?  
  const timedItems = habits.filter(h => h.hasTime);  
  const timedLogCount = recentLogs.filter((l) => {  
    const parent = habits.find(h => h.id === l.habitId);  
    return parent?.hasTime;  
  }).length;  
  const scoreFocus = timedItems.length ? Math.min(MAX_SCORE, (timedLogCount / (timedItems.length * FOCUS_TARGET)) * 100) : 0;  
    
  // Final Data Structure for the Graph  
  const personalityData = [  
    { subject: 'Consistency', A: Math.round(scoreConsistency), fullMark: MAX_SCORE },  
    { subject: 'Discipline', A: Math.round(scoreDiscipline), fullMark: MAX_SCORE },  
    { subject: 'Responsibility', A: Math.round(scoreResponsibility), fullMark: MAX_SCORE },  
    { subject: 'Devotion', A: Math.round(scoreDevotion), fullMark: MAX_SCORE },  
    { subject: 'Focus', A: Math.round(scoreFocus), fullMark: MAX_SCORE },  
  ];

  // Fetch Friend Data on Load
  useEffect(() => {
    const fetchFriend = async () => {
      const friendId = getFriendID();
      if (friendId) {
        const score = await getFriendScore(friendId);
        setFriendScore(score);
      }
    };
    fetchFriend();
  }, []);

  // 4. Month Navigation
  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

  // 5. Generate Dates for the Selected Month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // --- 1. EXPORT FUNCTION (Fixed: Added missing 'link' declaration) ---
  const handleExport = () => {
    // A. Define Header Row: "Date, Habit 1, Habit 2..."
    const headers = ["Date", ...trackableHabits.map((h: any) => h.title)];
    
    // B. Define Rows: One per day of the current month
    const rows = daysInMonth.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      
      // Get status for each habit on this day
      const rowData = trackableHabits.map((h: any) => {
        // @ts-ignore
        const isDone = habitLogs.some(l => l.habitId === h.id && l.date === dateStr);
        return isDone ? "Done" : "-";
      });

      return [dateStr, ...rowData];
    });

    // C. Convert to CSV String
    const csvContent = [
      headers.join(","), // Header Row
      ...rows.map(r => r.join(",")) // Data Rows
    ].join("\n");

    // D. Trigger Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");  // <-- FIXED: Added this declaration
    link.setAttribute("href", url);
    link.setAttribute("download", `Habit_Report_${format(currentDate, "MMM_yyyy")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-background p-6 pt-12 overflow-y-auto no-scrollbar">
      
      {/* HEADER WITH EXPORT BUTTON */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text-main">Reports</h1>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-xs font-bold active:scale-95 shadow-md transition-all hover:bg-gray-800"
        >
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </div>

      <SmartSummary />

      {/* 0. LEADERBOARD (Only shows if linked) */}
      {friendScore !== null && (
        <Leaderboard myScore={totalCompletions} friendScore={friendScore} />
      )}

      {friendScore !== null && (
        <SocialPodium myScore={totalCompletions} />
      )}

      {/* 1. Hero Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-6">
          <div className="bg-orange-100 p-3 rounded-full text-orange-500 mb-2">
            <Flame size={24} fill="currentColor" />
          </div>
          <span className="text-3xl font-bold text-gray-900">{totalCompletions}</span>
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Total Done</span>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-6">
          <div className="bg-yellow-100 p-3 rounded-full text-yellow-600 mb-2">
            <Trophy size={24} />
          </div>
          <span className="text-3xl font-bold text-gray-900">
            {level}
          </span>
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Level</span>
        </div>
      </div>

      {/* 2. Weekly Consistency */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} className="text-primary" />
          <h3 className="font-semibold text-gray-900">Last 7 Days</h3>
        </div>
        
        <div className="flex justify-between items-end">
          {last7Days.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div 
                className={clsx(
                  "w-2 rounded-full transition-all duration-500",
                  day.score >= 80 ? "bg-green-500 h-16" : 
                  day.score >= 40 ? "bg-green-300 h-10" : 
                  day.score > 0 ? "bg-green-200 h-4" : "bg-gray-100 h-2"
                )} 
              />
              <div className="text-center">
                <span className={clsx("text-xs font-bold block", day.isToday ? "text-primary" : "text-gray-400")}>
                  {day.dayName}
                </span>
                <span className="text-[10px] text-gray-300 font-medium">{format(subDays(today, 6 - i), "MM/dd")}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Category Breakdown */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-20">
        <h3 className="font-semibold text-gray-900 mb-4">Focus Areas</h3>
        <div className="space-y-4">
          {trackableHabits.length === 0 ? (
            <p className="text-sm text-gray-400">Complete habits to see stats.</p>
          ) : (
            trackableHabits.reduce((acc: any[], habit) => {
              const count = habitLogs.filter(l => l.habitId === habit.id).length;
              const existing = acc.find(c => c.name === habit.category);
              if (existing) {
                existing.count += count;
              } else {
                acc.push({ name: habit.category, count });
              }
              return acc;
            }, []).map((cat) => (
              <div key={cat.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{cat.name}</span>
                  <span className="text-gray-400">{cat.count} times</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary opacity-80 rounded-full"
                    style={{ width: `${(cat.count / totalCompletions) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- CHART SECTION (Fixed: Added aspect prop to ResponsiveContainer) --- */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 min-h-[300px]">
        <h3 className="font-semibold text-gray-900 mb-2">Category Balance</h3>
        
        {categoryData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} aspect={1}>  {/* <-- FIXED: Added aspect={1} */}
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            Complete some habits to see the chart!
          </div>
        )}
      </div>

      {/* --- NEW: PERSONALITY GRAPH --- */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col items-center relative">
        {/* Header Icon */}
        <div className="absolute top-4 left-6 flex items-center gap-2 z-10">
           <Activity size={18} className="text-purple-500" />
           <h3 className="font-semibold text-gray-900">Your User Graph</h3>
        </div>
        
        {/* The Graph */}
        <div className="h-[250px] w-full -ml-4 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={personalityData}>
              <PolarGrid />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 'bold' }} 
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]} 
                tick={false} 
                axisLine={false} 
              />
              <Radar
                name="You"
                dataKey="A"
                stroke="#8B5CF6"
                strokeWidth={3}
                fill="#8B5CF6"
                fillOpacity={0.3}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Footer Text */}
        <div className="w-full px-6 pb-4">
           <p className="text-xs text-center text-gray-400">
             Based on your last 30 days of activity across all habits & reminders.
           </p>
        </div>
      </div>

      {/* --- HABIT TABLE (ATTENDANCE STYLE) --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-20 flex flex-col">
        
        {/* Month Navigator Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-white rounded-lg transition-colors">
            <ChevronLeft size={20} className="text-gray-500" />
          </button>
          <h3 className="font-bold text-gray-900">
            {format(currentDate, "MMMM yyyy")}
          </h3>
          <button onClick={handleNextMonth} className="p-2 hover:bg-white rounded-lg transition-colors">
            <ChevronRight size={20} className="text-gray-500" />
          </button>
        </div>
        
        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="w-full border-collapse min-w-max">
            
            {/* Table Header: Dates */}
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="p-2 text-left text-xs font-bold text-gray-400 uppercase tracking-wide sticky left-0 bg-gray-50 z-20 border-r border-gray-200 min-w-[100px]">
                  Habit
                </th>
                {daysInMonth.map(day => {
                   const isToday = isSameDay(day, new Date());
                   return (
                    <th key={day.toString()} className={clsx("p-2 min-w-[36px] text-center text-xs font-bold", isToday ? "text-primary bg-blue-50" : "text-gray-400")}>
                      <div className={clsx(
                        "text-[10px] font-bold uppercase mb-1",
                        isToday ? "text-primary" : "text-gray-400"
                      )}>
                        {format(day, "EEEEE")} {/* S, M, T... */}
                      </div>
                      <div className={clsx(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mx-auto",
                        isToday ? "bg-primary text-white" : "text-gray-600"
                      )}>
                        {format(day, "d")}
                      </div>
                    </th>
                   );
                })}
              </tr>
            </thead>

            {/* Table Body: Habits & Heatmap */}
            <tbody>
              {trackableHabits.map(habit => (
                <tr key={habit.id} className="border-b border-gray-50">
                  
                  {/* Habit Name Column (Sticky Left) */}
                  <td className="p-2 text-xs font-medium sticky left-0 z-10 border-r border-gray-100 bg-white min-w-[100px]">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: habit.color }} />
                      <span className="truncate">{habit.title}</span>
                    </div>
                  </td>

                  {/* Date Columns */}
                  {daysInMonth.map(day => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const isDone = allLogs?.some(l => l.habitId === habit.id && l.date === dateStr);
                    
                    return (
                      <td key={`${habit.id}-${dateStr}`} className="p-1 text-center">
                        <div 
                          className={clsx(
                            "w-6 h-6 rounded-md mx-auto transition-all duration-200",
                            isDone ? "opacity-100 shadow-sm scale-90" : "bg-gray-100 opacity-0"
                          )}
                          style={{ backgroundColor: isDone ? habit.color : undefined }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};