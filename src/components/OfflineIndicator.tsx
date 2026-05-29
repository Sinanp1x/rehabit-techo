// src/components/OfflineIndicator.tsx — Online/offline status banner
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';
import { useStore } from '../store/useStore';

export const OfflineIndicator = () => {
  const { isOnline, setOnline } = useStore();

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 backdrop-blur-sm text-black py-2 px-4 flex items-center justify-center gap-2 text-sm font-semibold shadow-lg"
        >
          <WifiOff size={16} />
          <span>Offline — changes saved locally and will sync when reconnected</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
