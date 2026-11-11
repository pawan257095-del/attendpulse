import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  Activity,
  Member,
  AttendanceRecord,
  Shift,
  Holiday,
  AppSettings,
  AttendanceStatus,
  FullBackupData,
} from '../types';
import * as db from '../db/indexedDB';
import { getTodayDateString } from '../utils/dateUtils';
import { DEFAULT_SETTINGS } from '../db/seedData';

export type StorageStatus = 'saved' | 'saving' | 'error';

export interface UndoItem {
  id: string;
  wasNew: boolean;
  previousRecord?: AttendanceRecord;
}

export interface UndoAction {
  description: string;
  items: UndoItem[];
}

interface AttendanceContextType {
  activities: Activity[];
  members: Member[];
  attendance: AttendanceRecord[];
  shifts: Shift[];
  holidays: Holiday[];
  settings: AppSettings;
  selectedActivityId: string;
  setSelectedActivityId: (id: string) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  isLoading: boolean;
  storageStatus: StorageStatus;
  lastSaved: Date | null;
  errorMessage: string | null;
  undoAction: UndoAction | null;
  markAttendance: (
    memberId: string,
    status: AttendanceStatus,
    options?: { overtimeHours?: number; shiftId?: string; notes?: string }
  ) => Promise<boolean>;
  assignShiftToMember: (memberId: string, shiftId: string) => Promise<boolean>;
  setMemberOvertime: (memberId: string, hours: number, notes?: string) => Promise<boolean>;
  bulkMarkAttendance: (
    memberIds: string[],
    status: AttendanceStatus,
    options?: { overtimeHours?: number; shiftId?: string }
  ) => Promise<boolean>;
  resetTodayAttendance: (activityId: string, date: string) => Promise<boolean>;
  undoLastAttendanceChange: () => Promise<void>;
  dismissUndo: () => void;
  dismissError: () => void;
  addOrUpdateActivity: (activity: Activity) => Promise<void>;
  removeActivity: (id: string) => Promise<void>;
  addOrUpdateMember: (member: Member) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  importMembersBulk: (members: Member[]) => Promise<void>;
  addOrUpdateShift: (shift: Shift) => Promise<void>;
  removeShift: (id: string, fallbackShiftId?: string) => Promise<void>;
  addOrUpdateHoliday: (holiday: Holiday) => Promise<void>;
  removeHoliday: (id: string) => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
  restoreBackup: (backup: FullBackupData, mode: 'replace' | 'merge') => Promise<void>;
  wipeAllData: () => Promise<void>;
  reloadAllData: () => Promise<void>;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [storageStatus, setStorageStatus] = useState<StorageStatus>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [acts, mems, atts, shfts, hols, sett] = await Promise.all([
        db.getActivities(),
        db.getMembers(),
        db.getAttendance(),
        db.getShifts(),
        db.getHolidays(),
        db.getSettings(),
      ]);

      setActivities(acts);
      setMembers(mems);
      setAttendance(atts);
      setShifts(shfts);
      setHolidays(hols);
      setSettings(sett);

      // Default selected activity
      if (acts.length > 0) {
        if (!selectedActivityId || !acts.some(a => a.id === selectedActivityId)) {
          const pref = sett.defaultActivityId && acts.some(a => a.id === sett.defaultActivityId)
            ? sett.defaultActivityId
            : acts[0].id;
          setSelectedActivityId(pref);
        }
      } else {
        setSelectedActivityId('');
      }
    } catch (err: unknown) {
      console.error('Failed to load data from IndexedDB:', err);
      setErrorMessage('Failed to initialize local IndexedDB database.');
      setStorageStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedActivityId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keep the application in its supported light appearance.
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // One-tap attendance marking with instant optimistic update & robust undo history
  const markAttendance = async (
    memberId: string,
    status: AttendanceStatus,
    options?: { overtimeHours?: number; shiftId?: string; notes?: string }
  ): Promise<boolean> => {
    const activityId = selectedActivityId;
    const date = selectedDate;
    const id = `${activityId}_${memberId}_${date}`;

    const existing = attendance.find(r => r.activityId === activityId && r.memberId === memberId && r.date === date);
    const member = members.find(m => m.id === memberId);
    const memberName = member ? member.name : 'Member';

    // Store in undo stack: if existing was undefined, wasNew is true
    setUndoAction({
      description: `Marked ${memberName} as ${status}`,
      items: [
        {
          id,
          wasNew: !existing,
          previousRecord: existing ? { ...existing } : undefined,
        },
      ],
    });

    const newRecord: AttendanceRecord = {
      id,
      activityId,
      memberId,
      date,
      status,
      shiftId: options?.shiftId !== undefined ? options.shiftId : (existing?.shiftId || member?.assignedShiftId),
      overtimeHours: options?.overtimeHours !== undefined ? options.overtimeHours : existing?.overtimeHours,
      notes: options?.notes !== undefined ? options.notes : existing?.notes,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const previousState = [...attendance];

    // Optimistically update React state immediately
    setAttendance(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = newRecord;
        return copy;
      }
      return [...prev, newRecord];
    });

    setStorageStatus('saving');

    try {
      await db.saveAttendanceRecord(newRecord);
      setStorageStatus('saved');
      setLastSaved(new Date());
      return true;
    } catch (err: unknown) {
      console.error('IndexedDB save failed, rolling back UI state:', err);
      // Rollback to previous state on failure
      setAttendance(previousState);
      setStorageStatus('error');
      setErrorMessage('Failed to save attendance to local storage. Changes rolled back.');
      return false;
    }
  };

  // Assign shift to member WITHOUT changing their attendance status (Fixes mandatory requirement 5)
  const assignShiftToMember = async (memberId: string, shiftId: string): Promise<boolean> => {
    const activityId = selectedActivityId;
    const date = selectedDate;
    const id = `${activityId}_${memberId}_${date}`;

    const existing = attendance.find(r => r.activityId === activityId && r.memberId === memberId && r.date === date);
    const member = members.find(m => m.id === memberId);
    const memberName = member ? member.name : 'Member';

    setUndoAction({
      description: `Assigned shift to ${memberName}`,
      items: [
        {
          id,
          wasNew: !existing,
          previousRecord: existing ? { ...existing } : undefined,
        },
      ],
    });

    // If existing record exists, keep its status; if not, status is UNMARKED
    const newRecord: AttendanceRecord = {
      id,
      activityId,
      memberId,
      date,
      status: existing ? existing.status : 'UNMARKED',
      shiftId,
      overtimeHours: existing?.overtimeHours,
      notes: existing?.notes,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const previousState = [...attendance];

    setAttendance(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = newRecord;
        return copy;
      }
      return [...prev, newRecord];
    });

    setStorageStatus('saving');

    try {
      await db.saveAttendanceRecord(newRecord);
      setStorageStatus('saved');
      setLastSaved(new Date());
      return true;
    } catch (err: unknown) {
      console.error('IndexedDB save shift failed:', err);
      setAttendance(previousState);
      setStorageStatus('error');
      setErrorMessage('Failed to save shift to local storage.');
      return false;
    }
  };

  // Set member overtime independently
  const setMemberOvertime = async (memberId: string, hours: number, notes?: string): Promise<boolean> => {
    const activityId = selectedActivityId;
    const date = selectedDate;
    const id = `${activityId}_${memberId}_${date}`;

    const existing = attendance.find(r => r.activityId === activityId && r.memberId === memberId && r.date === date);
    const member = members.find(m => m.id === memberId);
    const memberName = member ? member.name : 'Member';

    setUndoAction({
      description: `Logged ${hours}h overtime for ${memberName}`,
      items: [
        {
          id,
          wasNew: !existing,
          previousRecord: existing ? { ...existing } : undefined,
        },
      ],
    });

    const newRecord: AttendanceRecord = {
      id,
      activityId,
      memberId,
      date,
      // If member already has a status (e.g. PRESENT, HALF_DAY), preserve it;
      // if unmarked, mark as PRESENT with overtime.
      status: existing && existing.status !== 'UNMARKED' ? existing.status : 'PRESENT',
      shiftId: existing?.shiftId || member?.assignedShiftId,
      overtimeHours: hours,
      notes: notes !== undefined ? notes : existing?.notes,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const previousState = [...attendance];

    setAttendance(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = newRecord;
        return copy;
      }
      return [...prev, newRecord];
    });

    setStorageStatus('saving');

    try {
      await db.saveAttendanceRecord(newRecord);
      setStorageStatus('saved');
      setLastSaved(new Date());
      return true;
    } catch (err: unknown) {
      console.error('IndexedDB save overtime failed:', err);
      setAttendance(previousState);
      setStorageStatus('error');
      setErrorMessage('Failed to save overtime to local storage.');
      return false;
    }
  };

  // Bulk attendance marking with undo tracking
  const bulkMarkAttendance = async (
    memberIds: string[],
    status: AttendanceStatus,
    options?: { overtimeHours?: number; shiftId?: string }
  ): Promise<boolean> => {
    const activityId = selectedActivityId;
    const date = selectedDate;
    const now = new Date().toISOString();

    const undoItems: UndoItem[] = [];
    const newRecords: AttendanceRecord[] = [];

    memberIds.forEach(mId => {
      const existing = attendance.find(r => r.activityId === activityId && r.memberId === mId && r.date === date);
      const member = members.find(m => m.id === mId);
      const id = `${activityId}_${mId}_${date}`;

      undoItems.push({
        id,
        wasNew: !existing,
        previousRecord: existing ? { ...existing } : undefined,
      });

      newRecords.push({
        id,
        activityId,
        memberId: mId,
        date,
        status,
        shiftId: options?.shiftId !== undefined ? options.shiftId : (existing?.shiftId || member?.assignedShiftId),
        overtimeHours: options?.overtimeHours !== undefined ? options.overtimeHours : existing?.overtimeHours,
        notes: existing?.notes,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      });
    });

    setUndoAction({
      description: `Bulk marked ${memberIds.length} members as ${status}`,
      items: undoItems,
    });

    const previousState = [...attendance];

    // Optimistic update
    setAttendance(prev => {
      const idMap = new Map(newRecords.map(r => [r.id, r]));
      const remaining = prev.filter(r => !idMap.has(r.id));
      return [...remaining, ...newRecords];
    });

    setStorageStatus('saving');

    try {
      await db.saveBulkAttendance(newRecords);
      setStorageStatus('saved');
      setLastSaved(new Date());
      return true;
    } catch (err: unknown) {
      console.error('IndexedDB bulk save failed:', err);
      setAttendance(previousState);
      setStorageStatus('error');
      setErrorMessage('Bulk attendance save failed. Changes rolled back.');
      return false;
    }
  };

  // Reset entire day's attendance for the selected activity
  const resetTodayAttendance = async (activityId: string, date: string): Promise<boolean> => {
    const existingForDay = attendance.filter(r => r.activityId === activityId && r.date === date);
    if (existingForDay.length > 0) {
      setUndoAction({
        description: `Reset attendance for ${date}`,
        items: existingForDay.map(r => ({
          id: r.id,
          wasNew: false,
          previousRecord: { ...r },
        })),
      });
    }

    const previousState = [...attendance];
    setAttendance(prev => prev.filter(r => !(r.activityId === activityId && r.date === date)));
    setStorageStatus('saving');

    try {
      await db.resetDayAttendance(activityId, date);
      setStorageStatus('saved');
      setLastSaved(new Date());
      return true;
    } catch (err: unknown) {
      console.error('IndexedDB reset day failed:', err);
      setAttendance(previousState);
      setStorageStatus('error');
      setErrorMessage('Failed to reset attendance for the day.');
      return false;
    }
  };

  // Undo the last attendance change - properly handles DELETION of newly created records!
  const undoLastAttendanceChange = async () => {
    if (!undoAction) return;

    const items = undoAction.items;
    const idsToDelete = items.filter(it => it.wasNew).map(it => it.id);
    const recordsToRestore = items.filter(it => !it.wasNew && it.previousRecord).map(it => it.previousRecord!);

    setStorageStatus('saving');

    try {
      // 1. Delete newly created records from DB
      if (idsToDelete.length > 0) {
        await db.deleteAttendanceRecordsBulk(idsToDelete);
      }

      // 2. Restore previous records in DB
      if (recordsToRestore.length > 0) {
        await db.saveBulkAttendance(recordsToRestore);
      }

      // 3. Update React state
      setAttendance(prev => {
        const deleteSet = new Set(idsToDelete);
        const restoreMap = new Map(recordsToRestore.map(r => [r.id, r]));

        // Remove deleted items, restore modified items
        const updated = prev.filter(r => !deleteSet.has(r.id)).map(r => {
          return restoreMap.has(r.id) ? restoreMap.get(r.id)! : r;
        });

        // Add back any restored records that were not in prev
        recordsToRestore.forEach(r => {
          if (!updated.some(u => u.id === r.id)) {
            updated.push(r);
          }
        });

        return updated;
      });

      setUndoAction(null);
      setStorageStatus('saved');
      setLastSaved(new Date());
    } catch (err: unknown) {
      console.error('Undo operation failed:', err);
      setStorageStatus('error');
      setErrorMessage('Undo operation failed to update local storage.');
    }
  };

  const dismissUndo = () => {
    setUndoAction(null);
  };

  const dismissError = () => {
    setErrorMessage(null);
  };

  // Activity management (Fixes mandatory requirement 20)
  const addOrUpdateActivity = async (activity: Activity) => {
    await db.saveActivity(activity);
    setActivities(prev => {
      const idx = prev.findIndex(a => a.id === activity.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = activity;
        return copy;
      }
      return [...prev, activity];
    });
    if (!selectedActivityId) {
      setSelectedActivityId(activity.id);
    }
  };

  const removeActivity = async (id: string) => {
    await db.deleteActivity(id);
    const remaining = activities.filter(a => a.id !== id);
    setActivities(remaining);
    setMembers(prev => prev.filter(m => m.activityId !== id));
    setAttendance(prev => prev.filter(r => r.activityId !== id));
    setHolidays(prev => prev.filter(h => h.activityId !== id));

    // Fix 20: Ensure last activity can be deleted without leaving stale selectedActivityId
    if (selectedActivityId === id) {
      setSelectedActivityId(remaining.length > 0 ? remaining[0].id : '');
    }
  };

  // Member management
  const addOrUpdateMember = async (member: Member) => {
    await db.saveMember(member);
    setMembers(prev => {
      const idx = prev.findIndex(m => m.id === member.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = member;
        return copy;
      }
      return [...prev, member];
    });
  };

  const removeMember = async (id: string) => {
    await db.deleteMember(id);
    setMembers(prev => prev.filter(m => m.id !== id));
    setAttendance(prev => prev.filter(r => r.memberId !== id));
  };

  const importMembersBulk = async (newMembers: Member[]) => {
    await db.saveMembersBulk(newMembers);
    setMembers(prev => {
      const map = new Map(prev.map(m => [m.id, m]));
      newMembers.forEach(m => map.set(m.id, m));
      return Array.from(map.values());
    });
  };

  // Shift management with safe deletion (Fixes requirement 13)
  const addOrUpdateShift = async (shift: Shift) => {
    await db.saveShift(shift);
    setShifts(prev => {
      const idx = prev.findIndex(s => s.id === shift.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = shift;
        return copy;
      }
      return [...prev, shift];
    });
  };

  const removeShift = async (id: string, fallbackShiftId?: string) => {
    await db.deleteShift(id, fallbackShiftId);
    setShifts(prev => prev.filter(s => s.id !== id));
    // Update local state references
    if (fallbackShiftId) {
      setMembers(prev => prev.map(m => m.assignedShiftId === id ? { ...m, assignedShiftId: fallbackShiftId } : m));
      setActivities(prev => prev.map(a => a.defaultShiftId === id ? { ...a, defaultShiftId: fallbackShiftId } : a));
    }
  };

  // Holiday management
  const addOrUpdateHoliday = async (holiday: Holiday) => {
    await db.saveHoliday(holiday);
    setHolidays(prev => {
      const idx = prev.findIndex(h => h.id === holiday.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = holiday;
        return copy;
      }
      return [...prev, holiday];
    });
  };

  const removeHoliday = async (id: string) => {
    await db.deleteHoliday(id);
    setHolidays(prev => prev.filter(h => h.id !== id));
  };

  // Settings
  const updateSettings = async (newSettings: AppSettings) => {
    await db.saveSettings(newSettings);
    setSettings(newSettings);
  };

  // Backup & restore
  const restoreBackup = async (backup: FullBackupData, mode: 'replace' | 'merge') => {
    await db.restoreBackupData(backup, mode);
    await loadData();
  };

  const wipeAllData = async () => {
    await db.clearAllDatabase();
    setActivities([]);
    setMembers([]);
    setAttendance([]);
    setShifts([]);
    setHolidays([]);
    setSettings(DEFAULT_SETTINGS);
    setSelectedActivityId('');
  };

  return (
    <AttendanceContext.Provider
      value={{
        activities,
        members,
        attendance,
        shifts,
        holidays,
        settings,
        selectedActivityId,
        setSelectedActivityId,
        selectedDate,
        setSelectedDate,
        isLoading,
        storageStatus,
        lastSaved,
        errorMessage,
        undoAction,
        markAttendance,
        assignShiftToMember,
        setMemberOvertime,
        bulkMarkAttendance,
        resetTodayAttendance,
        undoLastAttendanceChange,
        dismissUndo,
        dismissError,
        addOrUpdateActivity,
        removeActivity,
        addOrUpdateMember,
        removeMember,
        importMembersBulk,
        addOrUpdateShift,
        removeShift,
        addOrUpdateHoliday,
        removeHoliday,
        updateSettings,
        restoreBackup,
        wipeAllData,
        reloadAllData: loadData,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export function useAttendance() {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
}
