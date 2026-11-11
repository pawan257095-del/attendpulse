import React from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Briefcase,
  Layers,
} from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';
import { PWAInstallButton } from './PWAInstallButton';
import { formatDateSafe, shiftDateByDays, getTodayDateString } from '../../utils/dateUtils';

interface NavbarProps {
  onToggleSidebar?: () => void;
  currentView: string;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView }) => {
  const {
    activities,
    selectedActivityId,
    setSelectedActivityId,
    selectedDate,
    setSelectedDate,
    lastSaved,
    storageStatus,
  } = useAttendance();

  const activeActivity = activities.find(a => a.id === selectedActivityId);
  const today = getTodayDateString();
  const isToday = selectedDate === today;

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 px-3 sm:px-6 backdrop-blur-md">
      {/* Left side: Activity Switcher */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
            style={{ backgroundColor: activeActivity?.color || '#4f46e5' }}
          >
            <Briefcase className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <label htmlFor="activity-select" className="sr-only">Select Activity</label>
            <div className="relative">
              {activities.length > 0 ? (
                <>
                  <select
                    id="activity-select"
                    value={selectedActivityId}
                    onChange={(e) => setSelectedActivityId(e.target.value)}
                    className="appearance-none font-bold text-sm sm:text-base text-slate-900 dark:text-white bg-transparent pr-6 pl-1 py-0.5 rounded-lg border-0 focus:ring-2 focus:ring-indigo-500 cursor-pointer truncate max-w-[140px] sm:max-w-[220px]"
                  >
                    {activities.map(act => (
                      <option key={act.id} value={act.id} className="dark:bg-slate-800 dark:text-white">
                        {act.name}
                      </option>
                    ))}
                  </select>
                  <Layers className="w-3.5 h-3.5 text-slate-400 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                </>
              ) : (
                <span className="font-bold text-sm text-slate-500 italic pl-1">No Activity Selected</span>
              )}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium pl-1 flex items-center gap-1.5">
              <span>{activeActivity ? `${activeActivity.workingDays.length} working days/wk` : 'Local Offline Mode'}</span>
              <span className="hidden sm:inline-flex items-center gap-1">
                •
                {storageStatus === 'saving' && (
                  <span className="text-amber-500 flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Saving...
                  </span>
                )}
                {storageStatus === 'saved' && (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                    <CheckCircle className="w-2.5 h-2.5" /> Saved
                  </span>
                )}
                {storageStatus === 'error' && (
                  <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600" /> Error
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Center: Date Navigation (visible on attendance or calendar view) */}
      {(currentView === 'attendance' || currentView === 'dashboard') && (
        <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          <button
            onClick={() => setSelectedDate(shiftDateByDays(selectedDate, -1))}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition"
            aria-label="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 px-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
            <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
            <span>{formatDateSafe(selectedDate, 'EEE, dd MMM yyyy')}</span>
            {isToday && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                Today
              </span>
            )}
          </div>

          <button
            onClick={() => setSelectedDate(shiftDateByDays(selectedDate, 1))}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition"
            aria-label="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isToday && (
            <button
              onClick={() => setSelectedDate(today)}
              className="ml-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline px-1.5 py-0.5"
            >
              Reset to Today
            </button>
          )}
        </div>
      )}

      {/* Right side: Actions */}
      <div className="flex items-center gap-2">
        <PWAInstallButton compact />

      </div>
    </header>
  );
};
