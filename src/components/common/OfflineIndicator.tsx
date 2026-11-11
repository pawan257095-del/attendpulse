import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-2 rounded-full bg-amber-500/95 text-white px-3 py-1 text-xs font-semibold shadow-lg backdrop-blur-xs animate-bounce">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline Mode — All changes saved locally</span>
    </div>
  );
};
