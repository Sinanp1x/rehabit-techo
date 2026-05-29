// src/components/ToastContainer.tsx — Toast notification system
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../store/useStore';

const icons = {
  success: <CheckCircle2 size={18} className="text-green-400" />,
  error: <XCircle size={18} className="text-red-400" />,
  warning: <AlertCircle size={18} className="text-yellow-400" />,
  info: <Info size={18} className="text-blue-400" />,
};

export const ToastContainer = () => {
  const { toasts, removeToast } = useStore();

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={clsx(
              'glass-strong rounded-2xl px-4 py-3 flex items-center gap-3 shadow-card pointer-events-auto',
              'border',
              toast.type === 'success' ? 'border-green-500/30' :
              toast.type === 'error' ? 'border-red-500/30' :
              toast.type === 'warning' ? 'border-yellow-500/30' :
              'border-blue-500/30',
            )}
          >
            {icons[toast.type]}
            <p className="flex-1 text-sm font-medium text-text-main">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-text-muted hover:text-text-sub pointer-events-auto"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
