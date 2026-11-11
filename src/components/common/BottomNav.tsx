import React, { useState } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Users,
  MoreHorizontal,
  Layers,
  Clock,
  FileBarChart2,
  HardDriveDownload,
  Settings,
  X,
} from 'lucide-react';

interface BottomNavProps {
  currentView: string;
  onSelectView: (view: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onSelectView }) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const primaryItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'attendance', label: 'Register', icon: CheckSquare, isPrimary: true },
    { id: 'members', label: 'Members', icon: Users },
  ];

  const moreItems = [
    { id: 'activities', label: 'Manage Activities', icon: Layers, desc: 'Add or configure activities' },
    { id: 'shifts', label: 'Shift Timings', icon: Clock, desc: 'General, morning, custom shifts' },
    { id: 'reports', label: 'Reports & Export', icon: FileBarChart2, desc: 'PDF, CSV, and summary sharing' },
    { id: 'backup', label: 'Backup & Restore', icon: HardDriveDownload, desc: 'JSON export/import & storage' },
    { id: 'settings', label: 'App Settings', icon: Settings, desc: 'Preferences, theme, date formats' },
  ];

  const handleSelect = (viewId: string) => {
    onSelectView(viewId);
    setShowMoreMenu(false);
  };

  return (
    <>
      {/* Mobile Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-lg px-2 pb-safe">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            if (item.isPrimary) {
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className="flex flex-col items-center justify-center -mt-5"
                >
                  <div
                    className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition active:scale-95 ${
                      isActive
                        ? 'bg-indigo-600 ring-4 ring-indigo-100 dark:ring-indigo-950/70 shadow-indigo-600/40'
                        : 'bg-indigo-600 shadow-indigo-600/30'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className={`text-[10px] mt-1 font-bold ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800'
                }`}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span className="text-[10px]">{item.label}</span>
              </button>
            );
          })}

          <button
            onClick={() => setShowMoreMenu(true)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
              ['activities', 'shifts', 'reports', 'backup', 'settings'].includes(currentView)
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 font-medium'
            }`}
          >
            <MoreHorizontal className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">More</span>
          </button>
        </div>
      </div>

      {/* More Options Bottom Sheet */}
      {showMoreMenu && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 shadow-2xl border-t border-slate-200 dark:border-slate-800 max-h-[80vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">More Management Tools</h3>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="rounded-full p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`flex items-center gap-3 w-full p-3 rounded-2xl text-left transition ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{item.label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
