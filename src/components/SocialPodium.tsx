import { useState, useEffect } from "react";
import { getFriendID } from "../utils/user";
import { getFriendScore } from "../services/sync";
import { auth } from "../firebase";
import { Crown } from "lucide-react";

interface SocialPodiumProps {
  myScore: number;
}

export const SocialPodium = ({ myScore }: SocialPodiumProps) => {
  const [friendScore, setFriendScore] = useState<number | null>(null);
  const friendId = getFriendID();
  const myPhoto = auth.currentUser?.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=Me";
  
  // You need a way to get friend's photo, but for now we use a generic seed
  const friendPhoto = `https://api.dicebear.com/7.x/avataaars/svg?seed=${friendId || "Friend"}`;

  useEffect(() => {
    if (friendId) {
      getFriendScore(friendId).then(setFriendScore);
    }
  }, [friendId]);

  if (!friendId || friendScore === null) return null;

  const IAmWinning = myScore >= friendScore;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
      <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <Crown size={18} className="text-yellow-500" fill="currentColor"/> Head-to-Head
      </h3>

      <div className="flex items-end justify-center gap-4 h-32">
        
        {/* Loser Pillar (Shorter) */}
        <div className="flex flex-col items-center gap-2 w-1/3">
          <div className="relative">
            <img 
              src={IAmWinning ? friendPhoto : myPhoto} 
              className="w-10 h-10 rounded-full border-2 border-gray-200 grayscale opacity-70"
            />
          </div>
          <div className="w-full bg-gray-100 rounded-t-lg h-16 flex items-start justify-center pt-2">
            <span className="font-bold text-gray-400">2</span>
          </div>
          <span className="text-xs font-bold text-gray-400">
            {IAmWinning ? friendScore : myScore}
          </span>
        </div>

        {/* Winner Pillar (Taller) */}
        <div className="flex flex-col items-center gap-2 w-1/3 -mt-4">
          <div className="relative">
            <Crown size={20} className="absolute -top-6 left-0 right-0 mx-auto text-yellow-400 animate-bounce" fill="currentColor" />
            <img 
              src={IAmWinning ? myPhoto : friendPhoto} 
              className="w-14 h-14 rounded-full border-4 border-yellow-400 shadow-md"
            />
          </div>
          <div className="w-full bg-yellow-400 rounded-t-lg h-24 flex items-start justify-center pt-2 shadow-lg shadow-yellow-200">
            <span className="font-bold text-white text-xl">1</span>
          </div>
          <span className="text-lg font-bold text-gray-900">
            {IAmWinning ? myScore : friendScore}
          </span>
        </div>

      </div>
    </div>
  );
};