import { useState, useEffect } from 'react';
import { getUserID, setFriendID, getFriendID } from '../utils/user';
import { Copy, Save, UserPlus } from 'lucide-react';

export const SettingsPage = () => {
  const myID = getUserID();
  const [friendInput, setFriendInput] = useState('');
  const [savedFriend, setSavedFriend] = useState<string | null>(null);

  useEffect(() => {
    setSavedFriend(getFriendID());
  }, []);

  const handleSaveFriend = () => {
    if (!friendInput) return;
    setFriendID(friendInput);
    setSavedFriend(friendInput);
    alert("Friend Linked! Restart app to refresh leaderboard.");
  };

  const copyMyID = () => {
    navigator.clipboard.writeText(myID);
    alert("ID Copied!");
  };

  return (
    <div className="p-6 pt-12 bg-background h-full overflow-y-auto">
      <h1 className="text-2xl font-bold text-text-main mb-6">Settings</h1>

      {/* Card 1: My Identity */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">My User ID</h3>
        <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
          <code className="flex-1 text-primary font-mono font-bold text-lg overflow-hidden text-ellipsis">
            {myID}
          </code>
          <button onClick={copyMyID} className="p-2 bg-white rounded-lg shadow-sm text-gray-500 hover:text-primary">
            <Copy size={20} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Share this code with your friend.</p>
      </div>

      {/* Card 2: Connect Friend */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus size={20} className="text-purple-500" />
          <h3 className="font-semibold text-gray-900">Connect Friend</h3>
        </div>

        {savedFriend ? (
          <div className="bg-green-50 text-green-700 p-4 rounded-xl flex justify-between items-center">
            <span className="font-medium">Linked: {savedFriend}</span>
            <button onClick={() => { setFriendID(''); setSavedFriend(null); }} className="text-xs underline">
              Unlink
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Paste Friend's ID here"
              value={friendInput}
              onChange={(e) => setFriendInput(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-primary"
            />
            <button 
              onClick={handleSaveFriend}
              className="bg-black text-white p-3 rounded-xl active:scale-95 transition-transform"
            >
              <Save size={20} />
            </button>
          </div>
        )}
      </div>

      <div className="text-center mt-12">
        <p className="text-xs text-gray-300">Habit Tracker v1.0 • Local First</p>
      </div>
    </div>
  );
};