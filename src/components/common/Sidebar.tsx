import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Layers,
  Users,
  Clock,
  FileBarChart2,
  HardDriveDownload,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onSelectView }) => {
  const { settings } = useAttendance();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Mark Attendance', icon: CheckSquare, badge: 'Daily' },
    { id: 'calendar', label: 'Calendar View', icon: Calendar },
    { id: 'activities', label: 'Activities', icon: Layers },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'shifts', label: 'Shifts', icon: Clock },
    { id: 'reports', label: 'Reports & Export', icon: FileBarChart2 },
    { id: 'backup', label: 'Backup & Restore', icon: HardDriveDownload },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-tr from-indigo-600 to-cyan-500 text-white shadow-md shadow-indigo-500/20">
          <CheckSquare className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white truncate">
            {settings.appName || 'AttendPulse'}
          </h1>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
            Digital Register
          </p>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 space-y-1.5 p-4 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition group ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && !isActive && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Offline Storage Notice Box */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>100% Offline & Private</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Data is stored strictly on your local device with IndexedDB.
          </p>
        </div>
      </div>
    </aside>
  );
};
