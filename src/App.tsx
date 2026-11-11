/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AttendanceProvider, useAttendance } from './context/AttendanceContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { BottomNav } from './components/common/BottomNav';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { UndoToast } from './components/common/UndoToast';

import { DashboardView } from './components/dashboard/DashboardView';
import { AttendanceRegisterView } from './components/attendance/AttendanceRegisterView';
import { AttendanceCalendarView } from './components/calendar/AttendanceCalendarView';
import { ActivitiesView } from './components/activities/ActivitiesView';
import { MembersView } from './components/members/MembersView';
import { ShiftsView } from './components/shifts/ShiftsView';
import { ReportsView } from './components/reports/ReportsView';
import { BackupRestoreView } from './components/backup/BackupRestoreView';
import { SettingsView } from './components/settings/SettingsView';
import { Lock, KeyRound, AlertCircle } from 'lucide-react';

function MainApp() {
  const { isLoading, settings, setSelectedDate } = useAttendance();
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [pinEntry, setPinEntry] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);

  const handleNavigateToDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setCurrentView('attendance');
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (settings.appLockPin && pinEntry === settings.appLockPin) {
      setIsUnlocked(true);
      setPinError(false);
      setPinEntry('');
    } else {
      setPinError(true);
      setPinEntry('');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Initializing offline database...
          </p>
        </div>
      </div>
    );
  }

  // App Lock PIN Screen
  if (settings.enableAppLock && settings.appLockPin && !isUnlocked) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-100 dark:bg-slate-950 p-4">
        <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-8 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-6 animate-scale-up">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {settings.appName || 'AttendPulse'} Locked
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enter your 4-digit security PIN to access the register.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <input
                type="password"
                maxLength={6}
                autoFocus
                placeholder="• • • •"
                value={pinEntry}
                onChange={(e) => setPinEntry(e.target.value)}
                className="w-full text-center text-2xl tracking-[0.5em] font-black py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {pinError && (
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-rose-600">
                <AlertCircle className="w-4 h-4" />
                <span>Incorrect PIN. Please try again.</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 active:scale-95 transition"
            >
              Unlock Register
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased">
      {/* Desktop Sidebar */}
      <Sidebar currentView={currentView} onSelectView={setCurrentView} />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        <Navbar currentView={currentView} />

        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 pb-24 md:pb-12">
          {currentView === 'dashboard' && <DashboardView onNavigate={setCurrentView} />}
          {currentView === 'attendance' && <AttendanceRegisterView />}
          {currentView === 'calendar' && <AttendanceCalendarView onNavigateToDate={handleNavigateToDate} />}
          {currentView === 'activities' && <ActivitiesView />}
          {currentView === 'members' && <MembersView onNavigate={setCurrentView} />}
          {currentView === 'shifts' && <ShiftsView />}
          {currentView === 'reports' && <ReportsView />}
          {currentView === 'backup' && <BackupRestoreView />}
          {currentView === 'settings' && <SettingsView />}
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav currentView={currentView} onSelectView={setCurrentView} />
      </div>

      {/* Floating System Components */}
      <OfflineIndicator />
      <UndoToast />
    </div>
  );
}

export default function App() {
  return (
    <AttendanceProvider>
      <MainApp />
    </AttendanceProvider>
  );
}
