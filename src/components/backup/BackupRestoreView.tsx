import React, { useState, useEffect } from 'react';
import {
  Upload,
  Download,
  AlertTriangle,
  CheckCircle,
  Database,
  ShieldCheck,
  Clock,
  Lock,
  KeyRound,
  Shield,
  HardDrive,
} from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';
import { FullBackupData, EncryptedBackupData } from '../../types';
import { getFullBackupData } from '../../db/indexedDB';
import {
  downloadJsonFile,
  validateBackupJson,
  getStorageEstimate,
  requestPersistentStorage,
  encryptBackup,
  decryptBackup,
} from '../../utils/backupUtils';
import { Modal } from '../common/Modal';
import { formatDateSafe } from '../../utils/dateUtils';

export const BackupRestoreView: React.FC = () => {
  const {
    activities,
    members,
    attendance,
    shifts,
    settings,
    updateSettings,
    restoreBackup,
    wipeAllData,
  } = useAttendance();

  const [storageStats, setStorageStats] = useState<{ usageMB: number; quotaMB: number; percent: number } | null>(null);
  const [isPersisted, setIsPersisted] = useState<boolean | null>(null);

  // Export states
  const [useEncryption, setUseEncryption] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Import states
  const [pendingEncryptedData, setPendingEncryptedData] = useState<EncryptedBackupData | null>(null);
  const [decryptPasswordInput, setDecryptPasswordInput] = useState('');
  const [validatedBackup, setValidatedBackup] = useState<FullBackupData | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearInputCheck, setClearInputCheck] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    getStorageEstimate().then(setStorageStats);
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then(setIsPersisted);
    }
  }, [activities, members, attendance]);

  const handleRequestPersistence = async () => {
    const granted = await requestPersistentStorage();
    setIsPersisted(granted);
    if (granted) {
      setStatusMessage('Persistent storage granted! Browser will not clear your database.');
    } else {
      setValidationError('Persistent storage was not granted by your browser.');
    }
    setTimeout(() => {
      setStatusMessage(null);
      setValidationError(null);
    }, 4000);
  };

  // Export Backup
  const handleExportBackup = async () => {
    try {
      if (useEncryption) {
        if (!exportPassword || exportPassword.length < 6) {
          setValidationError('Encryption password must be at least 6 characters long.');
          return;
        }
        if (exportPassword !== confirmPassword) {
          setValidationError('Encryption passwords do not match.');
          return;
        }
      }

      const fullData = await getFullBackupData();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

      if (useEncryption) {
        const encrypted = await encryptBackup(fullData, exportPassword);
        downloadJsonFile(encrypted, `AttendPulse_Encrypted_Backup_${timestamp}.json`);
      } else {
        downloadJsonFile(fullData, `AttendPulse_Backup_${timestamp}.json`);
      }

      await updateSettings({
        ...settings,
        lastBackupDate: new Date().toISOString(),
      });

      setStatusMessage(useEncryption ? 'Encrypted backup exported securely!' : 'Full application backup exported successfully!');
      setExportPassword('');
      setConfirmPassword('');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setValidationError(`Export failed: ${msg}`);
    }
  };

  // Handle File Upload & Validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationError(null);
    setValidatedBackup(null);
    setPendingEncryptedData(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const parsed = JSON.parse(text);
        if (parsed.isEncrypted && parsed.ciphertext && parsed.salt && parsed.iv) {
          setPendingEncryptedData(parsed);
          setDecryptPasswordInput('');
          return;
        }
      } catch {
        // let validateBackupJson report JSON syntax error
      }

      const result = validateBackupJson(text);
      if (result.isValid && result.data) {
        setValidatedBackup(result.data);
        setIsRestoreModalOpen(true);
      } else {
        setValidationError(result.error || 'Invalid backup file structure.');
      }
    };
    reader.readAsText(file);
  };

  // Handle Decryption of Encrypted Backup
  const handleConfirmDecrypt = async () => {
    if (!pendingEncryptedData || !decryptPasswordInput) return;
    try {
      const decrypted = await decryptBackup(pendingEncryptedData, decryptPasswordInput);
      setValidatedBackup(decrypted);
      setPendingEncryptedData(null);
      setDecryptPasswordInput('');
      setIsRestoreModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Incorrect password.';
      setValidationError(msg);
    }
  };

  // Perform Restore
  const handleConfirmRestore = async () => {
    if (!validatedBackup) return;
    try {
      await restoreBackup(validatedBackup, restoreMode);
      setIsRestoreModalOpen(false);
      setValidatedBackup(null);
      setStatusMessage(`Data restored successfully (${restoreMode === 'replace' ? 'Full Replace' : 'Merged'})!`);
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setValidationError(`Restore failed: ${msg}`);
    }
  };

  // Wipe All Data
  const handleWipeData = async () => {
    if (clearInputCheck !== 'DELETE') return;
    await wipeAllData();
    setShowClearConfirm(false);
    setClearInputCheck('');
    setStatusMessage('All application data has been wiped.');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          Data Management & Local Backup
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Since all data is saved privately on your device, download periodic backups to prevent accidental data loss.
        </p>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2.5 animate-slide-up">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {validationError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm font-semibold flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Main Grid: Export and Restore Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Export Backup */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Export Full Backup</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">JSON Archive with optional encryption</p>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Downloads a timestamped JSON file including all activities ({activities.length}), enrolled members ({members.length}), historical attendance ({attendance.length}), shifts, and preferences.
            </p>

            {/* Encryption toggle */}
            <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-100 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Encrypt with Password (AES-256-GCM)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={useEncryption}
                  onChange={(e) => setUseEncryption(e.target.checked)}
                  className="rounded text-indigo-600"
                />
              </div>

              {useEncryption && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <input
                    type="password"
                    placeholder="Enter encryption password..."
                    value={exportPassword}
                    onChange={(e) => setExportPassword(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                  <input
                    type="password"
                    placeholder="Confirm password..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>
              )}
            </div>

            <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-750 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                Last Backup:{' '}
                <strong>
                  {settings.lastBackupDate ? formatDateSafe(settings.lastBackupDate, 'dd MMM yyyy, HH:mm') : 'Never'}
                </strong>
              </span>
            </div>
          </div>

          <button
            onClick={handleExportBackup}
            className="mt-6 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 active:scale-95 transition"
          >
            <Download className="w-4 h-4" />
            <span>{useEncryption ? 'Export Encrypted Backup' : 'Export & Download Backup'}</span>
          </button>
        </div>

        {/* Card 2: Restore Backup */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Restore from Backup</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Import plain or encrypted JSON files</p>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Select an AttendPulse JSON backup file from your phone or computer. You can review the contents and choose between Merging or Clean Replacing before applying.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                Select Backup JSON File
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950 dark:file:text-emerald-300 hover:file:bg-emerald-100 cursor-pointer"
              />
            </div>
          </div>

          <div className="mt-6 text-xs text-slate-400 text-center">
            Files are validated offline locally before loading.
          </div>
        </div>
      </div>

      {/* Local Storage Meter & Persistent Storage Card */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-500" />
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Local Device Storage Usage</h4>
          </div>
          <div className="flex items-center gap-3">
            {isPersisted !== null && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isPersisted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-500'}`}>
                {isPersisted ? 'Persistent Mode: Active' : 'Persistent: Default'}
              </span>
            )}
            <button
              onClick={handleRequestPersistence}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Request Persistent Storage</span>
            </button>
          </div>
        </div>

        {storageStats && (
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all"
              style={{ width: `${Math.max(1, storageStats.percent)}%` }}
            />
          </div>
        )}

        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>Offline-First Reliability:</span>
          </div>
          <p className="leading-relaxed">
            All attendance records reside exclusively inside your device browser's IndexedDB storage.
            Granting persistent storage prevents the operating system or browser from automatically clearing data under low disk space.
          </p>
        </div>
      </div>

      {/* Danger Zone: Clear Data */}
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">Reset Application & Wipe Data</h4>
            <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">
              Permanently remove all activities, members, and historical attendance logs from this device.
            </p>
          </div>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shrink-0"
          >
            Clear All Data
          </button>
        </div>
      </div>

      {/* Decrypt Password Modal */}
      {pendingEncryptedData && (
        <Modal
          isOpen={true}
          onClose={() => setPendingEncryptedData(null)}
          title="Encrypted Backup Detected"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
              <KeyRound className="w-4 h-4" />
              <span>This backup is secured with AES-256-GCM encryption.</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Enter Decryption Password:
              </label>
              <input
                type="password"
                placeholder="Password used during export..."
                value={decryptPasswordInput}
                onChange={(e) => setDecryptPasswordInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingEncryptedData(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecrypt}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
              >
                Decrypt & Review
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Restore Preview Modal */}
      {isRestoreModalOpen && validatedBackup && (
        <Modal
          isOpen={true}
          onClose={() => setIsRestoreModalOpen(false)}
          title="Review & Confirm Restore"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              The backup file has been validated. Here is what will be imported:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                  {validatedBackup.activities?.length || 0}
                </span>
                <p className="text-[10px] font-bold uppercase text-slate-500">Activities</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-lg font-black text-cyan-600 dark:text-cyan-400">
                  {validatedBackup.members?.length || 0}
                </span>
                <p className="text-[10px] font-bold uppercase text-slate-500">Members</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {validatedBackup.attendance?.length || 0}
                </span>
                <p className="text-[10px] font-bold uppercase text-slate-500">Attendance</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                  {validatedBackup.shifts?.length || 0}
                </span>
                <p className="text-[10px] font-bold uppercase text-slate-500">Shifts</p>
              </div>
            </div>

            {/* Choose Restore Strategy */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                Restore Method
              </label>

              <div
                onClick={() => setRestoreMode('replace')}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  restoreMode === 'replace'
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="restoreMode"
                  checked={restoreMode === 'replace'}
                  onChange={() => setRestoreMode('replace')}
                  className="mt-0.5 text-indigo-600"
                />
                <div>
                  <div className="text-xs font-bold">Clean Replace (Recommended for full restores)</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Wipes current database and replaces it completely with the imported backup file.
                  </div>
                </div>
              </div>

              <div
                onClick={() => setRestoreMode('merge')}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  restoreMode === 'merge'
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="restoreMode"
                  checked={restoreMode === 'merge'}
                  onChange={() => setRestoreMode('merge')}
                  className="mt-0.5 text-indigo-600"
                />
                <div>
                  <div className="text-xs font-bold">Merge with Existing Data</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Keeps existing activities/members and adds or updates them from the backup.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30"
              >
                Confirm & Restore Data
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Wipe Confirmation Dialog */}
      {showClearConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setShowClearConfirm(false)}
          title="Permanently Delete All Data?"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              This action cannot be undone. All your activities, members, and historical attendance logs will be permanently deleted from this device.
            </p>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                Type <strong>DELETE</strong> below to confirm:
              </label>
              <input
                type="text"
                placeholder="DELETE"
                value={clearInputCheck}
                onChange={(e) => setClearInputCheck(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-rose-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                disabled={clearInputCheck !== 'DELETE'}
                onClick={handleWipeData}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-bold"
              >
                Wipe Everything
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
