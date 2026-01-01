import { useState } from 'react';
import { HomePage } from './pages/HomePage';
import { StatsPage } from './pages/StatsPage';
import { Home, BarChart2, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'stats' | 'settings'>('home');

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-background overflow-hidden relative">
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'home' && <HomePage />}
        {activeTab === 'stats' && <StatsPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </div>

      {/* Fixed Bottom Navigation */}
      <nav className="bg-surface/90 backdrop-blur-md border-t border-gray-200 pb-6 pt-2 px-6 z-20">
        <div className="flex justify-between items-center">
          <NavButton 
            icon={Home} 
            isActive={activeTab === 'home'} 
            onClick={() => setActiveTab('home')} 
          />
          <NavButton 
            icon={BarChart2} 
            isActive={activeTab === 'stats'} 
            onClick={() => setActiveTab('stats')} 
          />
          <NavButton 
            icon={Settings} 
            isActive={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
          />
        </div>
      </nav>
    </div>
  );
}

// Reusable Nav Component
const NavButton = ({ icon: Icon, isActive, onClick }: { icon: any, isActive: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={clsx(
      "p-3 rounded-xl transition-all duration-300", 
      isActive ? "bg-primary/10 text-primary scale-110" : "text-gray-400 hover:text-gray-600"
    )}
  >
    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
  </button>
);

export default App;