import { useState } from 'react';
import { Key, ArrowRight, Lock, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { redeemLicense } from '../services/license';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const LicenseModal = ({ isOpen, onClose, onSuccess }: LicenseModalProps) => {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await redeemLicense(key);
    
    if (result.success) {
      setLoading(false);
      onSuccess(); // Tell App/Home that license is valid
    } else {
      setError(result.message);
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-2xl relative">
              
              {/* Close Button */}
              <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200">
                <X size={20} />
              </button>

              <div className="flex flex-col items-center mb-6">
                <div className="w-14 h-14 bg-[#2B3A55] rounded-2xl flex items-center justify-center mb-4 shadow-lg text-white">
                  <Key size={28} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Unlock Rehabit Techo</h2>
                <p className="text-sm text-gray-500 text-center mt-2">
                  Creation is restricted to invited members only. Enter your key to start building habits.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 text-gray-300" size={18} />
                  <input 
                    type="text" 
                    value={key}
                    onChange={(e) => setKey(e.target.value.toUpperCase())}
                    placeholder="TECHO-XXXX-XXXX"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-12 pr-4 font-mono text-lg uppercase focus:outline-none focus:border-[#2B3A55] focus:ring-1 focus:ring-[#2B3A55]"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-500 text-xs font-bold rounded-lg text-center animate-shake">
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading || !key}
                  className="w-full bg-[#2B3A55] text-white p-4 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <>Activate <ArrowRight size={18} /></>}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};