import React, { useState } from 'react';
import {
  Check,
  Save,
  Lock,
  Bell,
  ShieldCheck,
  KeyRound,
  Share2,
  Copy,
} from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';
import { AppSettings } from '../../types';
import { PWAInstallButton } from '../common/PWAInstallButton';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, activities, shifts } = useAttendance();

  const [appName, setAppName] = useState(settings.appName || 'AttendPulse');
  const [orgName, setOrgName] = useState(settings.organizationName || 'Daily Attendance Register');
  const [dateFormat, setDateFormat] = useState(settings.dateFormat);
  const [timeFormat, setTimeFormat] = useState(settings.timeFormat || '12h');
  const [firstDayOfWeek, setFirstDayOfWeek] = useState<0 | 1>(settings.firstDayOfWeek);
  const [defaultActivityId, setDefaultActivityId] = useState(settings.defaultActivityId || '');
  const [defaultShiftId, setDefaultShiftId] = useState(settings.defaultShiftId || '');
  const [defaultWorkingHours, setDefaultWorkingHours] = useState(String(settings.defaultWorkingHours || 8));

  // Security & App Lock
  const [enableAppLock, setEnableAppLock] = useState(!!settings.enableAppLock);
  const [pinInput, setPinInput] = useState(settings.appLockPin || '');
  const [confirmPinInput, setConfirmPinInput] = useState(settings.appLockPin || '');

  // Reminders
  const [enableAttendanceReminders, setEnableAttendanceReminders] = useState(!!settings.enableAttendanceReminders);
  const [reminderTime, setReminderTime] = useState(settings.reminderTime || '18:00');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [referralMessage, setReferralMessage] = useState('');

  const getReferralCode = () => {
    const key = 'attendpulse_referral_code';
    let code = window.localStorage.getItem(key);
    if (!code) {
      code = `PULSE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      window.localStorage.setItem(key, code);
    }
    return code;
  };
  const shareReferral = async () => {
    const code = getReferralCode();
    const link = `${window.location.origin}/?ref=${encodeURIComponent(code)}`;
    const message = `Try AttendPulse, a simple offline attendance register. Join with my referral code ${code}: ${link}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Try AttendPulse', text: message, url: link });
      else {
        await navigator.clipboard.writeText(message);
        setReferralMessage('Invite copied. Share it with your team.');
      }
    } catch {
      setReferralMessage('Could not open sharing. Copy this invite: ' + message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (enableAppLock) {
      if (pinInput.length < 4) {
        setErrorMsg('App Lock PIN must be at least 4 digits.');
        return;
      }
      if (pinInput !== confirmPinInput) {
        setErrorMsg('PIN codes do not match.');
        return;
      }
    }

    const updated: AppSettings = {
      ...settings,
      appName: appName.trim() || 'AttendPulse',
      organizationName: orgName.trim() || 'Daily Attendance Register',
      theme: 'light',
      dateFormat,
      timeFormat,
      firstDayOfWeek,
      defaultActivityId: defaultActivityId || undefined,
      defaultShiftId: defaultShiftId || undefined,
      defaultWorkingHours: parseFloat(defaultWorkingHours) || 8,
      enableAppLock,
      appLockPin: enableAppLock ? pinInput : undefined,
      enableAttendanceReminders,
      reminderTime: enableAttendanceReminders ? reminderTime : undefined,
    };

    await updateSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Application Preferences
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Customize branding, security app lock, notifications, and defaults.
          </p>
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white shadow-lg shadow-indigo-900/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold flex items-center gap-2"><Share2 className="w-4 h-4" /> Invite your team</h3>
            <p className="text-sm text-indigo-100 mt-1">Share AttendPulse with another team and help them simplify attendance.</p>
            {referralMessage && <p className="text-xs text-white mt-2 break-all">{referralMessage}</p>}
          </div>
          <button type="button" onClick={() => void shareReferral()} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50 flex items-center justify-center gap-2"><Copy className="w-4 h-4" /> Share invite</button>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold animate-slide-up">
            <Check className="w-4 h-4" />
            <span>Preferences Saved</span>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 2: Security & App Lock */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">App Lock (PIN Protection)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Require a PIN code to access the register</p>
              </div>
            </div>
            <input
              type="checkbox"
              id="enable-lock"
              checked={enableAppLock}
              onChange={(e) => setEnableAppLock(e.target.checked)}
              className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
            />
          </div>

          {enableAppLock && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Enter 4-Digit PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="e.g. 1234"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 text-sm font-bold tracking-widest"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Confirm PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="Repeat PIN..."
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 text-sm font-bold tracking-widest"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Attendance Reminders */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Daily Attendance Reminders</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Prompt to mark attendance before the day ends</p>
              </div>
            </div>
            <input
              type="checkbox"
              id="enable-reminders"
              checked={enableAttendanceReminders}
              onChange={(e) => setEnableAttendanceReminders(e.target.checked)}
              className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
            />
          </div>

          {enableAttendanceReminders && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60">
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Reminder Time
              </label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 text-sm font-bold"
              />
            </div>
          )}
        </div>

        {/* Section 4: Branding & Organization */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Branding & Report Heading
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Application Title
              </label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
              />
              <p className="mt-1 text-[11px] text-slate-400">Displayed in sidebar and top navbar</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Organization / Department
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
              />
              <p className="mt-1 text-[11px] text-slate-400">Printed on PDF headers and report summaries</p>
            </div>
          </div>
        </div>

        {/* Section 5: Date, Time & Calendar */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Date & Time Format
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Date Format
              </label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD (2026-11-10)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (10/11/2026)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (11/10/2026)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Time Format
              </label>
              <select
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
              >
                <option value="12h">12-Hour (09:00 AM)</option>
                <option value="24h">24-Hour (09:00)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                First Day of Week
              </label>
              <select
                value={firstDayOfWeek}
                onChange={(e) => setFirstDayOfWeek(parseInt(e.target.value, 10) as 0 | 1)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
              >
                <option value={1}>Monday</option>
                <option value={0}>Sunday</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 6: Defaults */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Attendance Defaults
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Default Activity
              </label>
              <select
                value={defaultActivityId}
                onChange={(e) => setDefaultActivityId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
              >
                {activities.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Default Shift
              </label>
              <select
                value={defaultShiftId}
                onChange={(e) => setDefaultShiftId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
              >
                {shifts.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Default Daily Working Hours
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={defaultWorkingHours}
                onChange={(e) => setDefaultWorkingHours(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
              />
            </div>
          </div>
        </div>

        {/* PWA App Installation */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Install on Device</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Install AttendPulse on your Android, iPhone, or Desktop for 100% offline standalone usage.
            </p>
          </div>
          <PWAInstallButton />
        </div>

        {/* Save Bar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/30 active:scale-95 transition"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
};
