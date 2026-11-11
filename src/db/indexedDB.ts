import {
  Activity,
  Member,
  AttendanceRecord,
  Shift,
  Holiday,
  AppSettings,
  FullBackupData,
} from '../types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_SHIFTS,
  INITIAL_ACTIVITIES,
  INITIAL_MEMBERS,
  INITIAL_HOLIDAYS,
  generateSeedAttendance,
} from './seedData';

const DB_NAME = 'AttendPulseDB';
const DB_VERSION = 2; // Incremented for schema enhancements

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported on this device/environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('activities')) {
        db.createObjectStore('activities', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('members')) {
        const memberStore = db.createObjectStore('members', { keyPath: 'id' });
        memberStore.createIndex('activityId', 'activityId', { unique: false });
        memberStore.createIndex('memberCode', 'memberCode', { unique: false });
      }

      if (!db.objectStoreNames.contains('attendance')) {
        const attStore = db.createObjectStore('attendance', { keyPath: 'id' });
        attStore.createIndex('activityId', 'activityId', { unique: false });
        attStore.createIndex('memberId', 'memberId', { unique: false });
        attStore.createIndex('date', 'date', { unique: false });
        attStore.createIndex('activity_date', ['activityId', 'date'], { unique: false });
        attStore.createIndex('activity_member_date', ['activityId', 'memberId', 'date'], { unique: true });
      }

      if (!db.objectStoreNames.contains('shifts')) {
        db.createObjectStore('shifts', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('holidays')) {
        const holStore = db.createObjectStore('holidays', { keyPath: 'id' });
        holStore.createIndex('activityId', 'activityId', { unique: false });
        holStore.createIndex('date', 'date', { unique: false });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    };

    request.onsuccess = async (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      try {
        await initCleanDatabaseDefaults(db);
        resolve(db);
      } catch (err) {
        console.error('Error initializing clean IndexedDB defaults:', err);
        resolve(db);
      }
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

/**
 * Initializes ONLY base default shifts and default settings on clean install.
 * Strict requirement: DO NOT automatically seed demo activities, members, or attendance records.
 * New installations start with an empty register.
 */
async function initCleanDatabaseDefaults(db: IDBDatabase): Promise<void> {
  const shiftsCount = await getCount(db, 'shifts');
  const settingsCount = await getCount(db, 'settings');

  if (shiftsCount === 0 || settingsCount === 0) {
    const tx = db.transaction(['shifts', 'settings'], 'readwrite');

    if (shiftsCount === 0) {
      const shiftStore = tx.objectStore('shifts');
      DEFAULT_SHIFTS.forEach(s => shiftStore.put(s));
    }

    if (settingsCount === 0) {
      const settStore = tx.objectStore('settings');
      settStore.put({ id: 'app_settings', ...DEFAULT_SETTINGS });
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

/**
 * User-initiated sample demo data seeding (optional from Settings or empty state).
 */
export async function seedSampleDemoData(): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(
    ['activities', 'members', 'attendance', 'shifts', 'holidays', 'settings'],
    'readwrite'
  );

  const actStore = tx.objectStore('activities');
  INITIAL_ACTIVITIES.forEach(a => actStore.put(a));

  const memStore = tx.objectStore('members');
  INITIAL_MEMBERS.forEach(m => memStore.put(m));

  const shiftStore = tx.objectStore('shifts');
  DEFAULT_SHIFTS.forEach(s => shiftStore.put(s));

  const holStore = tx.objectStore('holidays');
  INITIAL_HOLIDAYS.forEach(h => holStore.put(h));

  const settStore = tx.objectStore('settings');
  settStore.put({ id: 'app_settings', ...DEFAULT_SETTINGS, defaultActivityId: 'act_office' });

  const attStore = tx.objectStore('attendance');
  const seedAttendance = generateSeedAttendance();
  seedAttendance.forEach(att => attStore.put(att));

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function getCount(db: IDBDatabase, storeName: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllFromStore<T>(storeName: string): Promise<T[]> {
  return openDatabase().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  });
}

// ------------------- ACTIVITIES -------------------
export async function getActivities(): Promise<Activity[]> {
  return getAllFromStore<Activity>('activities');
}

export async function saveActivity(activity: Activity): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('activities', 'readwrite');
    tx.objectStore('activities').put(activity);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteActivity(activityId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['activities', 'members', 'attendance', 'holidays'], 'readwrite');
    tx.objectStore('activities').delete(activityId);

    // Cascade delete members for this activity
    const memStore = tx.objectStore('members');
    const memIndex = memStore.index('activityId');
    const memReq = memIndex.getAll(activityId);
    memReq.onsuccess = () => {
      const members = memReq.result as Member[];
      members.forEach(m => memStore.delete(m.id));
    };

    // Cascade delete attendance records
    const attStore = tx.objectStore('attendance');
    const attIndex = attStore.index('activityId');
    const attReq = attIndex.getAll(activityId);
    attReq.onsuccess = () => {
      const records = attReq.result as AttendanceRecord[];
      records.forEach(r => attStore.delete(r.id));
    };

    // Cascade delete activity-specific holidays
    const holStore = tx.objectStore('holidays');
    const holIndex = holStore.index('activityId');
    const holReq = holIndex.getAll(activityId);
    holReq.onsuccess = () => {
      const hols = holReq.result as Holiday[];
      hols.forEach(h => holStore.delete(h.id));
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ------------------- MEMBERS -------------------
export async function getMembers(): Promise<Member[]> {
  return getAllFromStore<Member>('members');
}

export async function saveMember(member: Member): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('members', 'readwrite');
    tx.objectStore('members').put(member);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveMembersBulk(members: Member[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('members', 'readwrite');
    const store = tx.objectStore('members');
    members.forEach(m => store.put(m));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteMember(memberId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['members', 'attendance'], 'readwrite');
    tx.objectStore('members').delete(memberId);

    const attStore = tx.objectStore('attendance');
    const attIndex = attStore.index('memberId');
    const attReq = attIndex.getAll(memberId);
    attReq.onsuccess = () => {
      const records = attReq.result as AttendanceRecord[];
      records.forEach(r => attStore.delete(r.id));
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ------------------- ATTENDANCE -------------------
export async function getAttendance(): Promise<AttendanceRecord[]> {
  return getAllFromStore<AttendanceRecord>('attendance');
}

export async function saveAttendanceRecord(record: AttendanceRecord): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('attendance', 'readwrite');
    const id = record.id || `${record.activityId}_${record.memberId}_${record.date}`;
    tx.objectStore('attendance').put({ ...record, id, updatedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteAttendanceRecord(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('attendance', 'readwrite');
    tx.objectStore('attendance').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteAttendanceRecordsBulk(ids: string[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('attendance', 'readwrite');
    const store = tx.objectStore('attendance');
    ids.forEach(id => store.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveBulkAttendance(records: AttendanceRecord[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('attendance', 'readwrite');
    const store = tx.objectStore('attendance');
    const now = new Date().toISOString();
    records.forEach(r => {
      const id = r.id || `${r.activityId}_${r.memberId}_${r.date}`;
      store.put({ ...r, id, updatedAt: now });
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function resetDayAttendance(activityId: string, dateStr: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('attendance', 'readwrite');
    const store = tx.objectStore('attendance');
    const index = store.index('activity_date');
    const req = index.getAll([activityId, dateStr]);
    req.onsuccess = () => {
      const items = req.result as AttendanceRecord[];
      items.forEach(item => store.delete(item.id));
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ------------------- SHIFTS -------------------
export async function getShifts(): Promise<Shift[]> {
  return getAllFromStore<Shift>('shifts');
}

export async function saveShift(shift: Shift): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('shifts', 'readwrite');
    tx.objectStore('shifts').put(shift);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Safe deletion of shifts with reassignment.
 * Reassigns any members or activities using shiftId to fallbackShiftId.
 */
export async function deleteShift(shiftId: string, fallbackShiftId?: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['shifts', 'members', 'activities'], 'readwrite');
    tx.objectStore('shifts').delete(shiftId);

    // Reassign members
    const memStore = tx.objectStore('members');
    const memReq = memStore.getAll();
    memReq.onsuccess = () => {
      const members = memReq.result as Member[];
      members.forEach(m => {
        if (m.assignedShiftId === shiftId) {
          memStore.put({ ...m, assignedShiftId: fallbackShiftId });
        }
      });
    };

    // Reassign activities
    const actStore = tx.objectStore('activities');
    const actReq = actStore.getAll();
    actReq.onsuccess = () => {
      const activities = actReq.result as Activity[];
      activities.forEach(a => {
        if (a.defaultShiftId === shiftId) {
          actStore.put({ ...a, defaultShiftId: fallbackShiftId });
        }
      });
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ------------------- HOLIDAYS -------------------
export async function getHolidays(): Promise<Holiday[]> {
  return getAllFromStore<Holiday>('holidays');
}

export async function saveHoliday(holiday: Holiday): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('holidays', 'readwrite');
    tx.objectStore('holidays').put(holiday);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteHoliday(holidayId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('holidays', 'readwrite');
    tx.objectStore('holidays').delete(holidayId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ------------------- SETTINGS -------------------
export async function getSettings(): Promise<AppSettings> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const req = tx.objectStore('settings').get('app_settings');
    req.onsuccess = () => {
      if (req.result) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...settings } = req.result;
        resolve({ ...DEFAULT_SETTINGS, ...settings });
      } else {
        resolve(DEFAULT_SETTINGS);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    tx.objectStore('settings').put({ id: 'app_settings', ...settings });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ------------------- BACKUP & RESTORE -------------------
export async function getFullBackupData(): Promise<FullBackupData> {
  const [settings, activities, members, attendance, shifts, holidays] = await Promise.all([
    getSettings(),
    getActivities(),
    getMembers(),
    getAttendance(),
    getShifts(),
    getHolidays(),
  ]);

  return {
    version: 2,
    appVersion: '2.0.0',
    exportDate: new Date().toISOString(),
    settings,
    activities,
    members,
    attendance,
    shifts,
    holidays,
  };
}

export async function restoreBackupData(
  backup: FullBackupData,
  mode: 'replace' | 'merge' = 'replace'
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      ['activities', 'members', 'attendance', 'shifts', 'holidays', 'settings'],
      'readwrite'
    );

    if (mode === 'replace') {
      tx.objectStore('activities').clear();
      tx.objectStore('members').clear();
      tx.objectStore('attendance').clear();
      tx.objectStore('shifts').clear();
      tx.objectStore('holidays').clear();
      tx.objectStore('settings').clear();
    }

    const actStore = tx.objectStore('activities');
    backup.activities.forEach(a => actStore.put(a));

    const memStore = tx.objectStore('members');
    backup.members.forEach(m => memStore.put(m));

    const attStore = tx.objectStore('attendance');
    backup.attendance.forEach(att => attStore.put(att));

    const shiftStore = tx.objectStore('shifts');
    backup.shifts.forEach(s => shiftStore.put(s));

    const holStore = tx.objectStore('holidays');
    backup.holidays.forEach(h => holStore.put(h));

    const settStore = tx.objectStore('settings');
    settStore.put({ id: 'app_settings', ...backup.settings });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllDatabase(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      ['activities', 'members', 'attendance', 'shifts', 'holidays', 'settings'],
      'readwrite'
    );
    tx.objectStore('activities').clear();
    tx.objectStore('members').clear();
    tx.objectStore('attendance').clear();
    tx.objectStore('shifts').clear();
    tx.objectStore('holidays').clear();
    tx.objectStore('settings').clear();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
