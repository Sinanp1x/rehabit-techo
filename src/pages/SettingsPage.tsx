import { useState, useEffect } from 'react';
import { getFriendID, setFriendID } from '../utils/user';
import { getMyShortCode, findUserByShortCode } from '../services/profile';
import { syncData } from '../services/sync';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { Copy, Save, UserPlus, LogOut, RefreshCw, Trash2, User, Loader2, Bell, BellOff } from 'lucide-react';
import { 
  areNotificationsSupported, 
  getNotificationPermission, 
  requestNotificationPermission, 
  getFCMToken, 
  disableNotifications,
  showTestNotification 
} from '../services/notifications';

export const SettingsPage = () => {
  const user = auth.currentUser;
  
  const [myCode, setMyCode] = useState("Loading...");
  const [friendInput, setFriendInput] = useState('');
  const [savedFriend, setSavedFriend] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Notification states
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationsSupported, setNotificationsSupported] = useState(false);

  // Load Data on Mount
  useEffect(() => {
    // 1. Get My Short Code
    getMyShortCode().then(code => setMyCode(code));
    
    // 2. Check if I already have a friend linked
    const currentFriend = getFriendID();
    if (currentFriend) setSavedFriend("Linked");
    
    // 3. Check notification support and status
    setNotificationsSupported(areNotificationsSupported());
    const permission = getNotificationPermission();
    setNotificationsEnabled(permission.granted);
  }, []);

  const handleSaveFriend = async () => {
    if (!friendInput) return;
    setIsSearching(true);

    try {
      // SEARCH for the friend using the Short Code
      const longID = await findUserByShortCode(friendInput.trim());

      if (longID) {
        setFriendID(longID); // Save the LONG ID to local storage (for logic)
        setSavedFriend("Linked");
        alert(`Success! Friend linked. ID: ${longID}`);
      } else {
        alert("User not found! Check the code.");
      }
    } catch (e) {
      alert("Error searching for user.");
    } finally {
      setIsSearching(false);
    }
  };

  const copyMyCode = () => {
    navigator.clipboard.writeText(myCode);
    alert("Code Copied!");
  };

  const handleLogout = async () => {
    if (confirm("Sign out?")) await signOut(auth);
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    await syncData();
    setTimeout(() => { setIsSyncing(false); alert("Sync Complete!"); }, 1000);
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotificationsEnabled(true);
      await getFCMToken();
      alert('Notifications enabled! You will receive reminders for your habits.');
    } else {
      alert('Notification permission denied. Enable it in your browser settings.');
    }
  };

  const handleDisableNotifications = async () => {
    await disableNotifications();
    setNotificationsEnabled(false);
    alert('Notifications disabled.');
  };

  const handleTestNotification = () => {
    showTestNotification();
  };

  return (
    <div className="p-6 pt-12 bg-background h-full overflow-y-auto no-scrollbar">
      <h1 className="text-2xl font-bold text-text-main mb-6">Settings</h1>

      {/* 1. PROFILE */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-100">
           {user?.photoURL ? (
             <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
           ) : (
             <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400"><User size={32} /></div>
           )}
        </div>
        <div className="flex-1 overflow-hidden">
          <h2 className="font-bold text-lg text-gray-900 truncate">{user?.displayName || "User"}</h2>
          <p className="text-sm text-gray-500 truncate">{user?.email}</p>
        </div>
        <button onClick={handleLogout} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 active:scale-95"><LogOut size={20} /></button>
      </div>

      {/* 2. SOCIAL CONNECT */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus size={20} className="text-purple-500" />
          <h3 className="font-semibold text-gray-900">Add Friend</h3>
        </div>

        {/* My Short Code */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Your Friend Code</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-black text-white p-3 rounded-xl text-center font-mono font-bold text-xl tracking-widest shadow-md">
              {myCode}
            </div>
            <button onClick={copyMyCode} className="p-4 bg-gray-100 text-gray-700 rounded-xl active:scale-95 hover:bg-gray-200">
              <Copy size={20} />
            </button>
          </div>
        </div>

        {/* Friend Input */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Enter Friend's Code</p>
          {savedFriend ? (
            <div className="bg-green-50 text-green-700 p-3 rounded-xl flex justify-between items-center text-sm border border-green-100">
              <span className="font-medium flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Friend Connected
              </span>
              <button onClick={() => { setFriendID(''); setSavedFriend(null); }} className="text-xs underline font-bold">Unlink</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="e.g. A7B-9X2"
                value={friendInput}
                onChange={(e) => setFriendInput(e.target.value.toUpperCase())}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono text-lg uppercase focus:outline-primary placeholder:normal-case placeholder:font-sans placeholder:text-sm"
              />
              <button 
                onClick={handleSaveFriend}
                disabled={isSearching}
                className="bg-primary text-white p-3 rounded-xl active:scale-95 disabled:opacity-50"
              >
                {isSearching ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. NOTIFICATIONS */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={20} className="text-blue-500" />
          <h3 className="font-semibold text-gray-900">Notifications</h3>
        </div>

        {!notificationsSupported ? (
          <div className="bg-gray-50 text-gray-600 p-4 rounded-xl text-sm">
            Notifications are not supported in this browser.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                {notificationsEnabled ? (
                  <Bell size={18} className="text-green-500" />
                ) : (
                  <BellOff size={18} className="text-gray-400" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {notificationsEnabled ? 'Notifications Enabled' : 'Notifications Disabled'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {notificationsEnabled 
                      ? 'You will receive reminders for your habits' 
                      : 'Enable to get habit reminders'}
                  </p>
                </div>
              </div>
              
              {notificationsEnabled ? (
                <button 
                  onClick={handleDisableNotifications}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold active:scale-95"
                >
                  Disable
                </button>
              ) : (
                <button 
                  onClick={handleEnableNotifications}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold active:scale-95"
                >
                  Enable
                </button>
              )}
            </div>

            {/* Test Notification */}
            {notificationsEnabled && (
              <button 
                onClick={handleTestNotification}
                className="w-full p-4 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-600 font-medium active:scale-98 hover:border-primary hover:text-primary"
              >
                🔔 Send Test Notification
              </button>
            )}

            {/* Info Text */}
            <p className="text-xs text-gray-400 px-1">
              💡 Notifications are sent based on habit times you set. All-day habits won't trigger notifications.
            </p>
          </div>
        )}
      </div>

      {/* 4. DATA */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Data</h3>
        <button onClick={handleForceSync} disabled={isSyncing} className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-3 active:scale-98">
          <span className="text-sm font-medium text-gray-700">Force Cloud Sync</span>
          <RefreshCw size={18} className={isSyncing ? "animate-spin text-primary" : "text-gray-400"} />
        </button>
        <button onClick={() => alert("Clears local storage only.")} className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl active:scale-98">
          <span className="text-sm font-medium text-gray-700">Clear Cache</span>
          <Trash2 size={18} className="text-gray-400" />
        </button>
      </div>

      <div className="text-center pb-8"><p className="text-xs text-gray-300">Habit Tracker v2.1</p></div>
    </div>
  );
};