import { useState, useEffect } from "react";
import { useHabits } from "../hooks/useHabits";
import { calculateStats } from "../utils/stats";
import { getFriendID } from "../utils/user";
import { getFriendScore } from "../services/sync";
import { Leaderboard } from "../components/Leaderboard";
import { Flame, Trophy, Calendar } from "lucide-react";
import { clsx } from "clsx";

export const StatsPage = () => {
  const { habits, allLogs } = useHabits();
  const [friendScore, setFriendScore] = useState<number | null>(null);
  
  // Calculate local stats
  const stats = calculateStats(habits ?? [], allLogs ?? []);

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

  return (
    <div className="flex flex-col h-full bg-background p-6 pt-12 overflow-y-auto no-scrollbar">
      <h1 className="text-2xl font-bold text-text-main mb-6">Insights</h1>
      
      {/* 0. LEADERBOARD (Only shows if linked) */}
      {friendScore !== null && (
        <Leaderboard myScore={stats.totalCompletions} friendScore={friendScore} />
      )}

      {/* 1. Hero Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-6">
          <div className="bg-orange-100 p-3 rounded-full text-orange-500 mb-2">
            <Flame size={24} fill="currentColor" />
          </div>
          <span className="text-3xl font-bold text-gray-900">{stats.totalCompletions}</span>
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Total Done</span>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-6">
          <div className="bg-yellow-100 p-3 rounded-full text-yellow-600 mb-2">
            <Trophy size={24} />
          </div>
          <span className="text-3xl font-bold text-gray-900">
            {Math.floor(stats.totalCompletions / 10) + 1}
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
          {stats.last7Days.map((day, i) => (
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
                <span className="text-[10px] text-gray-300 font-medium">{day.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Category Breakdown */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-20">
        <h3 className="font-semibold text-gray-900 mb-4">Focus Areas</h3>
        <div className="space-y-4">
          {stats.categories.length === 0 ? (
            <p className="text-sm text-gray-400">Complete habits to see stats.</p>
          ) : (
            stats.categories.map((cat) => (
              <div key={cat.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{cat.name}</span>
                  <span className="text-gray-400">{cat.count} times</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary opacity-80 rounded-full"
                    style={{ width: `${(cat.count / stats.totalCompletions) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};