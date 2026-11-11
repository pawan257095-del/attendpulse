import { Activity, Member, Shift, Holiday, AppSettings, AttendanceRecord } from '../types';
import { getTodayDateString, shiftDateByDays } from '../utils/dateUtils';

export const DEFAULT_SETTINGS: AppSettings = {
  appName: 'AttendPulse',
  organizationName: 'Daily Attendance Register',
  theme: 'light',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '12h',
  firstDayOfWeek: 1, // Monday
  defaultWorkingHours: 8,
};

export const DEFAULT_SHIFTS: Shift[] = [
  {
    id: 'shift_general',
    name: 'General Shift',
    startTime: '09:00',
    endTime: '17:00',
    breakMinutes: 60,
    totalWorkingHours: 7,
    description: 'Standard day shift (9:00 AM – 5:00 PM)',
    isDefault: true,
  },
  {
    id: 'shift_morning',
    name: 'Morning Shift',
    startTime: '06:00',
    endTime: '14:00',
    breakMinutes: 30,
    totalWorkingHours: 7.5,
    description: 'Early morning shift (6:00 AM – 2:00 PM)',
    isDefault: false,
  },
  {
    id: 'shift_evening',
    name: 'Evening Shift',
    startTime: '14:00',
    endTime: '22:00',
    breakMinutes: 30,
    totalWorkingHours: 7.5,
    description: 'Afternoon / evening shift (2:00 PM – 10:00 PM)',
    isDefault: false,
  },
  {
    id: 'shift_night',
    name: 'Night Shift',
    startTime: '22:00',
    endTime: '06:00',
    breakMinutes: 60,
    totalWorkingHours: 7,
    description: 'Overnight shift (10:00 PM – 6:00 AM)',
    isDefault: false,
  },
];

export const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: 'act_office',
    name: 'TechCorp Office',
    description: 'Engineering & Product Team Daily Register',
    color: '#4f46e5', // Indigo
    icon: 'briefcase',
    startDate: '2026-01-01',
    workingDays: [1, 2, 3, 4, 5], // Mon to Fri
    defaultShiftId: 'shift_general',
    workingHours: 8,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'act_college',
    name: 'CS302 Algorithm Lab',
    description: 'Computer Science Department Lab Sessions',
    color: '#059669', // Emerald
    icon: 'graduation-cap',
    startDate: '2026-01-15',
    workingDays: [1, 3, 5], // Mon, Wed, Fri
    defaultShiftId: 'shift_morning',
    workingHours: 4,
    isActive: true,
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'act_gym',
    name: 'Apex Fitness & Gym',
    description: 'Trainers & Strength Program Staff',
    color: '#e11d48', // Rose
    icon: 'dumbbell',
    startDate: '2026-02-01',
    workingDays: [1, 2, 3, 4, 5, 6], // Mon to Sat
    defaultShiftId: 'shift_morning',
    workingHours: 6,
    isActive: true,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
];

export const INITIAL_MEMBERS: Member[] = [
  // TechCorp Office Members
  {
    id: 'mem_101',
    activityId: 'act_office',
    name: 'David Chen',
    memberCode: 'EMP-01',
    mobile: '+1 (555) 234-5678',
    email: 'david.chen@techcorp.io',
    joiningDate: '2026-01-01',
    assignedShiftId: 'shift_general',
    notes: 'Senior Lead Architect',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'mem_102',
    activityId: 'act_office',
    name: 'Sarah Miller',
    memberCode: 'EMP-02',
    mobile: '+1 (555) 345-6789',
    email: 'sarah.m@techcorp.io',
    joiningDate: '2026-01-01',
    assignedShiftId: 'shift_general',
    notes: 'Senior Full Stack Engineer',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'mem_103',
    activityId: 'act_office',
    name: 'Marcus Brody',
    memberCode: 'EMP-03',
    mobile: '+1 (555) 456-7890',
    email: 'marcus.b@techcorp.io',
    joiningDate: '2026-01-10',
    assignedShiftId: 'shift_general',
    notes: 'UI/UX Product Designer',
    isActive: true,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-01-10T00:00:00Z',
  },
  {
    id: 'mem_104',
    activityId: 'act_office',
    name: 'Elena Rostova',
    memberCode: 'EMP-04',
    mobile: '+1 (555) 567-8901',
    email: 'elena.r@techcorp.io',
    joiningDate: '2026-01-15',
    assignedShiftId: 'shift_general',
    notes: 'DevOps & Site Reliability',
    isActive: true,
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'mem_105',
    activityId: 'act_office',
    name: 'Priya Sharma',
    memberCode: 'EMP-05',
    mobile: '+1 (555) 678-9012',
    email: 'priya.s@techcorp.io',
    joiningDate: '2026-02-01',
    assignedShiftId: 'shift_general',
    notes: 'QA & Automation Lead',
    isActive: true,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'mem_106',
    activityId: 'act_office',
    name: 'James Walker',
    memberCode: 'EMP-06',
    mobile: '+1 (555) 789-0123',
    email: 'james.w@techcorp.io',
    joiningDate: '2026-02-15',
    assignedShiftId: 'shift_general',
    notes: 'Backend Systems Engineer',
    isActive: true,
    createdAt: '2026-02-15T00:00:00Z',
    updatedAt: '2026-02-15T00:00:00Z',
  },

  // CS302 College Lab Members
  {
    id: 'mem_201',
    activityId: 'act_college',
    name: 'Alex Turner',
    memberCode: 'STU-101',
    mobile: '+1 (555) 890-1234',
    email: 'aturner@univ.edu',
    joiningDate: '2026-01-15',
    assignedShiftId: 'shift_morning',
    notes: 'Lab Assistant',
    isActive: true,
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'mem_202',
    activityId: 'act_college',
    name: 'Chloe Bennett',
    memberCode: 'STU-102',
    mobile: '+1 (555) 901-2345',
    email: 'cbennett@univ.edu',
    joiningDate: '2026-01-15',
    assignedShiftId: 'shift_morning',
    notes: 'Class Representative',
    isActive: true,
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'mem_203',
    activityId: 'act_college',
    name: 'Daniel Kim',
    memberCode: 'STU-103',
    mobile: '+1 (555) 012-3456',
    email: 'dkim@univ.edu',
    joiningDate: '2026-01-15',
    assignedShiftId: 'shift_morning',
    notes: 'Honors Student',
    isActive: true,
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },

  // Gym Members
  {
    id: 'mem_301',
    activityId: 'act_gym',
    name: 'Ryan O\'Connor',
    memberCode: 'TRN-01',
    mobile: '+1 (555) 123-4567',
    email: 'ryan@apexfit.com',
    joiningDate: '2026-02-01',
    assignedShiftId: 'shift_morning',
    notes: 'Head Strength Coach',
    isActive: true,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'mem_302',
    activityId: 'act_gym',
    name: 'Mia Rodriguez',
    memberCode: 'TRN-02',
    mobile: '+1 (555) 234-8901',
    email: 'mia@apexfit.com',
    joiningDate: '2026-02-01',
    assignedShiftId: 'shift_evening',
    notes: 'HIIT & Spin Instructor',
    isActive: true,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
];

export const INITIAL_HOLIDAYS: Holiday[] = [
  {
    id: 'hol_1',
    activityId: 'ALL',
    date: '2026-01-01',
    name: "New Year's Day",
    description: 'Public Holiday',
  },
  {
    id: 'hol_2',
    activityId: 'ALL',
    date: '2026-05-01',
    name: 'International Workers Day',
    description: 'Labor Holiday',
  },
  {
    id: 'hol_3',
    activityId: 'act_office',
    date: '2026-11-26',
    name: 'Thanksgiving Holiday',
    description: 'Office closed',
  },
];

export function generateSeedAttendance(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = getTodayDateString();

  // Generate 10 days of past records leading up to today
  for (let i = 9; i >= 0; i--) {
    const dateStr = shiftDateByDays(today, -i);

    // Office records
    INITIAL_MEMBERS.filter(m => m.activityId === 'act_office').forEach((m, idx) => {
      // Deterministic realistic attendance simulation
      const hash = (idx * 7 + i * 13) % 20;
      let status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'HOLIDAY' = 'PRESENT';
      let overtimeHours: number | undefined = undefined;

      if (i === 0) {
        // Today's attendance - realistic:
        // mem_101: Present, mem_102: Present, mem_103: Present + Overtime (2h), mem_104: Half Day, mem_105: Absent, mem_106: Present
        if (idx === 0) status = 'PRESENT';
        else if (idx === 1) status = 'PRESENT';
        else if (idx === 2) { status = 'PRESENT'; overtimeHours = 2; }
        else if (idx === 3) status = 'HALF_DAY';
        else if (idx === 4) status = 'ABSENT';
        else status = 'PRESENT';
      } else {
        if (hash === 3) {
          status = 'ABSENT';
        } else if (hash === 7) {
          status = 'HALF_DAY';
        } else if (hash === 11) {
          status = 'PRESENT';
          overtimeHours = 1.5;
        } else if (hash === 17) {
          status = 'HOLIDAY';
        } else {
          status = 'PRESENT';
        }
      }

      records.push({
        id: `act_office_${m.id}_${dateStr}`,
        activityId: 'act_office',
        memberId: m.id,
        date: dateStr,
        status,
        shiftId: m.assignedShiftId,
        overtimeHours,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    // College records
    INITIAL_MEMBERS.filter(m => m.activityId === 'act_college').forEach((m, idx) => {
      records.push({
        id: `act_college_${m.id}_${dateStr}`,
        activityId: 'act_college',
        memberId: m.id,
        date: dateStr,
        status: (idx + i) % 7 === 0 ? 'ABSENT' : 'PRESENT',
        shiftId: m.assignedShiftId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
  }

  return records;
}
