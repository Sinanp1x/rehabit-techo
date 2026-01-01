import { Users, Crown } from "lucide-react";

interface LeaderboardProps {
  myScore: number;
  friendScore: number;
  friendName?: string; // Optional, defaults to "Friend"
}

export const Leaderboard = ({ myScore, friendScore, friendName = "Friend" }: LeaderboardProps) => {
  const total = myScore + friendScore;
  // Prevent divide by zero
  const myPercent = total === 0 ? 50 : Math.round((myScore / total) * 100);
  
  const amIWinning = myScore >= friendScore;

  return (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg mb-6 relative overflow-hidden">
      {/* Decorative Background Circles */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-10 -mb-10" />

      <div className="flex items-center gap-2 mb-6 relative z-10">
        <Users size={20} className="text-white/80" />
        <h3 className="font-bold text-lg">Weekly Rivalry</h3>
      </div>

      <div className="flex justify-between items-end mb-2 relative z-10">
        {/* Me */}
        <div className="text-left">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-indigo-100">You</span>
            {amIWinning && <Crown size={16} className="text-yellow-300" fill="currentColor" />}
          </div>
          <span className="text-4xl font-bold">{myScore}</span>
        </div>

        {/* VS Badge */}
        <div className="mb-2 bg-white/20 px-2 py-1 rounded text-xs font-bold">VS</div>

        {/* Friend */}
        <div className="text-right">
          <div className="flex items-center gap-2 justify-end mb-1">
            {!amIWinning && <Crown size={16} className="text-yellow-300" fill="currentColor" />}
            <span className="font-medium text-indigo-100">{friendName}</span>
          </div>
          <span className="text-4xl font-bold">{friendScore}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-3 bg-black/20 rounded-full overflow-hidden relative z-10 flex">
        <div 
          className="h-full bg-yellow-400 transition-all duration-1000" 
          style={{ width: `${myPercent}%` }} 
        />
        {/* The remaining space is implicitly the friend's bar (transparent/black bg) */}
      </div>
      
      <p className="text-xs text-center mt-3 text-indigo-200">
        {amIWinning 
          ? "Keep it up! You're in the lead! 🔥" 
          : "Catch up! You're close! 🏃‍♂️"}
      </p>
    </div>
  );
};