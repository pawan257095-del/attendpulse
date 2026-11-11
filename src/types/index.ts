export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'HOLIDAY' | 'UNMARKED';

export interface Activity {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  workingDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  defaultShiftId?: string;
  workingHours: number; // e.g. 8
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  id: string;
  activityId: string;
  name: string;
  memberCode: string; // Unique within activity or app
  mobile?: string;
  email?: string;
  joiningDate: string; // YYYY-MM-DD
  leavingDate?: string; // YYYY-MM-DD (optional, if member has departed)
  assignedShiftId?: string;
  notes?: string;
  photoUrl?: string; // base64 or placeholder
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string; // unique key, `${activityId}_${memberId}_${date}`
  activityId: string;
  memberId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  shiftId?: string;
  overtimeHours?: number; // numerical overtime hours independent of status
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string; // HH:MM (24-hour format)
  endTime: string;   // HH:MM
  breakMinutes: number;
  totalWorkingHours: number;
  description?: string;
  isDefault?: boolean;
}

export interface Holiday {
  id: string;
  activityId: string; // specific activityId or 'ALL'
  date: string; // YYYY-MM-DD
  name: string;
  description?: string;
}

export interface AppSettings {
  appName?: string;
  organizationName?: string;
  theme: 'light' | 'dark' | 'system';
  dateFormat: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY';
  timeFormat?: '12h' | '24h';
  firstDayOfWeek: 0 | 1; // 0=Sunday, 1=Monday
  defaultActivityId?: string;
  defaultShiftId?: string;
  defaultWorkingHours?: number;
  lastBackupDate?: string;
  compactView?: boolean;
  // Security & Reminders
  enableAppLock?: boolean;
  appLockPin?: string;
  appLockPinHash?: string;
  enableDailyReminder?: boolean;
  enableAttendanceReminders?: boolean;
  enableNotifications?: boolean;
  autoBackupFrequency?: string;
  reminderTime?: string; // HH:mm
}

export interface MemberAttendanceStats {
  memberId: string;
  memberName: string;
  memberCode: string;
  totalCalendarDays: number;
  expectedWorkingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  holidays: number;
  overtimeDays: number;
  totalOvertimeHours: number;
  actualAttendanceDays: number; // present + halfDays * 0.5
  attendancePercentage: number;
  unmarkedDays: number;
  currentStreak: number;
  bestStreak: number;
}

export interface DailyAttendanceSummary {
  date: string;
  activityId: string;
  totalMembers: number;
  presentCount: number;
  absentCount: number;
  halfDayCount: number;
  holidayCount: number;
  overtimeCount: number; // count of members with overtimeHours > 0
  unmarkedCount: number;
  totalOvertimeHours: number;
  expectedMembers: number; // active members expected to work (not on holiday/leave)
  effectivePresentCount: number; // present + halfDay * 0.5
  percentage: number;
  isWeeklyOff: boolean;
  isHoliday: boolean;
}

export interface FullBackupData {
  version: number;
  appVersion?: string;
  exportDate: string;
  settings: AppSettings;
  activities: Activity[];
  members: Member[];
  attendance: AttendanceRecord[];
  shifts: Shift[];
  holidays: Holiday[];
}

export interface EncryptedBackupData {
  version: number;
  isEncrypted: true;
  algorithm: 'AES-GCM';
  salt: string; // hex
  iv: string;   // hex
  ciphertext: string; // base64
  exportDate: string;
}
