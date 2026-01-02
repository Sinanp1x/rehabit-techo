import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Show "Back online" message briefly
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between ${
            isOnline 
              ? 'bg-green-500 text-white' 
              : 'bg-yellow-500 text-gray-900'
          }`}
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center gap-2 flex-1">
            {isOnline ? (
              <>
                <Wifi size={18} />
                <span className="text-sm font-semibold">Back online</span>
              </>
            ) : (
              <>
                <WifiOff size={18} />
                <span className="text-sm font-semibold">You're offline - Changes will sync when reconnected</span>
              </>
            )}
          </div>
          
          {!isOnline && (
            <button
              onClick={() => setShowBanner(false)}
              className="text-sm font-bold px-3 py-1 bg-black/10 rounded-lg hover:bg-black/20"
            >
              Dismiss
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
