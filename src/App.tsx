import { useState, useEffect } from 'react';
import { HomePage } from './pages/HomePage';
import { StatsPage } from './pages/StatsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { OfflineIndicator } from './components/OfflineIndicator';
import { checkUserLicense } from './services/license'; 
import { initializeNotifications } from './services/notifications';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './firebase';
import { Home, BarChart2, Settings, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [hasLicense, setHasLicense] = useState<boolean>(false); 
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const licensed = await checkUserLicense();
        setHasLicense(licensed);
        
        // Initialize notifications for logged-in users
        initializeNotifications((payload) => {
          console.log('Notification received:', payload);
          // You can show a toast or update UI here
        });
      } else {
        setHasLicense(false);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F4F4F0]">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={() => {}} />;
  }

  return (
    <div className="h-screen flex flex-col bg-background font-sans text-text-main">
      <OfflineIndicator />
      
      <div className="flex-1 overflow-hidden relative">
        {currentPage === 'home' && (
          <HomePage 
            hasLicense={hasLicense} 
            onLicenseVerified={() => setHasLicense(true)} 
          />
        )}
        
        {/* Stats and Settings are viewable by everyone, or you can restrict them too if you want */}
        {currentPage === 'stats' && <StatsPage />}
        {currentPage === 'settings' && <SettingsPage />}
      </div>

      <nav className="bg-white border-t border-gray-100 pb-safe pt-2 px-6 shadow-lg z-20">
        <div className="flex justify-around items-center h-16">
          <button onClick={() => setCurrentPage('home')} className={clsx("p-2 rounded-xl transition-all duration-300", currentPage === 'home' ? "bg-black text-white shadow-md scale-110" : "text-gray-400 hover:bg-gray-50")}>
            <Home size={24} />
          </button>
          <button onClick={() => setCurrentPage('stats')} className={clsx("p-2 rounded-xl transition-all duration-300", currentPage === 'stats' ? "bg-black text-white shadow-md scale-110" : "text-gray-400 hover:bg-gray-50")}>
            <BarChart2 size={24} />
          </button>
          <button onClick={() => setCurrentPage('settings')} className={clsx("p-2 rounded-xl transition-all duration-300", currentPage === 'settings' ? "bg-black text-white shadow-md scale-110" : "text-gray-400 hover:bg-gray-50")}>
            <Settings size={24} />
          </button>
        </div>
      </nav>
    </div>
  );
}

export default App;