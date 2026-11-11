import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMemberStats,
  calculateDailySummary,
  isMemberActiveOnDate,
  isDateWithinActivityBounds,
} from './attendanceCalc';
import { calculateShiftDurationHours } from './dateUtils';
import { sanitizeCsvField, parseMembersCsv, parseCsvRows } from './exportCsv';
import { Activity, Member, AttendanceRecord, Holiday } from '../types';

test('shift duration calculation handles daytime and overnight shifts', () => {
  // Daytime shift: 9:00 to 17:00 with 60m break = 7.0h
  const general = calculateShiftDurationHours('09:00', '17:00', 60);
  assert.equal(general, 7.0);

  // Morning shift: 6:00 to 14:00 with 30m break = 7.5h
  const morning = calculateShiftDurationHours('06:00', '14:00', 30);
  assert.equal(morning, 7.5);

  // Overnight shift: 22:00 to 06:00 (crosses midnight) with 60m break = 7.0h
  const night = calculateShiftDurationHours('22:00', '06:00', 60);
  assert.equal(night, 7.0);
});

test('attendance percentage formula: (Present + HalfDays * 0.5) / Expected * 100 with independent overtime', () => {
  const dummyActivity: Activity = {
    id: 'act-1',
    name: 'Office',
    color: '#10b981',
    icon: 'briefcase',
    startDate: '2026-11-01',
    workingDays: [1, 2, 3, 4, 5], // Mon-Fri
    workingHours: 8,
    isActive: true,
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
  };

  const dummyMember: Member = {
    id: 'mem-1',
    activityId: 'act-1',
    name: 'Alice Johnson',
    memberCode: 'EMP001',
    joiningDate: '2026-11-01',
    isActive: true,
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
  };

  // 2026-11-02 (Mon): Present (1.0)
  // 2026-11-03 (Tue): Half Day (0.5)
  // 2026-11-04 (Wed): Absent (0.0)
  // 2026-11-05 (Thu): Holiday (excluded from expected working days)
  // 2026-11-06 (Fri): Present with 2.5h independent overtime
  // Expected working days: Mon, Tue, Wed, Fri = 4 days
  // Actual attendance: 1.0 (Mon) + 0.5 (Tue) + 0 (Wed) + 1.0 (Fri) = 2.5 days
  // Percentage: (2.5 / 4) * 100 = 62.5%
  const records: AttendanceRecord[] = [
    {
      id: 'r1',
      activityId: 'act-1',
      memberId: 'mem-1',
      date: '2026-11-02',
      status: 'PRESENT',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'r2',
      activityId: 'act-1',
      memberId: 'mem-1',
      date: '2026-11-03',
      status: 'HALF_DAY',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'r3',
      activityId: 'act-1',
      memberId: 'mem-1',
      date: '2026-11-04',
      status: 'ABSENT',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'r4',
      activityId: 'act-1',
      memberId: 'mem-1',
      date: '2026-11-05',
      status: 'HOLIDAY',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'r5',
      activityId: 'act-1',
      memberId: 'mem-1',
      date: '2026-11-06',
      status: 'PRESENT',
      overtimeHours: 2.5,
      createdAt: '',
      updatedAt: '',
    },
  ];

  const holidays: Holiday[] = [
    {
      id: 'h1',
      activityId: 'act-1',
      date: '2026-11-05',
      name: 'Company Foundation Day',
    },
  ];

  const stats = calculateMemberStats(
    dummyMember,
    dummyActivity,
    '2026-11-02',
    '2026-11-06',
    records,
    holidays
  );

  assert.equal(stats.expectedWorkingDays, 4);
  assert.equal(stats.presentDays, 2);
  assert.equal(stats.halfDays, 1);
  assert.equal(stats.absentDays, 1);
  assert.equal(stats.holidays, 1);
  assert.equal(stats.overtimeDays, 1);
  assert.equal(stats.totalOvertimeHours, 2.5);
  assert.equal(stats.actualAttendanceDays, 2.5);
  assert.equal(stats.attendancePercentage, 62.5);
});

test('member tenure respect joiningDate and leavingDate', () => {
  const member: Member = {
    id: 'm-tenure',
    activityId: 'act-1',
    name: 'Test Member',
    memberCode: 'TM01',
    joiningDate: '2026-11-05',
    leavingDate: '2026-11-15',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  };

  // Before joining date: inactive
  assert.equal(isMemberActiveOnDate(member, '2026-11-04'), false);
  // On joining date: active
  assert.equal(isMemberActiveOnDate(member, '2026-11-05'), true);
  // During tenure: active
  assert.equal(isMemberActiveOnDate(member, '2026-11-10'), true);
  // On leaving date: active
  assert.equal(isMemberActiveOnDate(member, '2026-11-15'), true);
  // After leaving date: inactive
  assert.equal(isMemberActiveOnDate(member, '2026-11-16'), false);
});

test('activity lifecycle bounds respect startDate and endDate', () => {
  const activity: Activity = {
    id: 'act-bounds',
    name: 'Seasonal Project',
    color: '#3b82f6',
    icon: 'target',
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    workingDays: [1, 2, 3, 4, 5],
    workingHours: 8,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  };

  assert.equal(isDateWithinActivityBounds(activity, '2026-10-31'), false);
  assert.equal(isDateWithinActivityBounds(activity, '2026-11-01'), true);
  assert.equal(isDateWithinActivityBounds(activity, '2026-11-15'), true);
  assert.equal(isDateWithinActivityBounds(activity, '2026-11-30'), true);
  assert.equal(isDateWithinActivityBounds(activity, '2026-12-01'), false);
});

test('daily summary calculates correctly across members and separates unmarked from absences', () => {
  const dummyActivity: Activity = {
    id: 'act-1',
    name: 'Office',
    color: '#10b981',
    icon: 'briefcase',
    startDate: '2026-11-01',
    workingDays: [1, 2, 3, 4, 5],
    workingHours: 8,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  };

  const members: Member[] = [
    { id: 'm1', activityId: 'act-1', name: 'Alice', memberCode: '001', isActive: true, joiningDate: '2026-11-01', createdAt: '', updatedAt: '' },
    { id: 'm2', activityId: 'act-1', name: 'Bob', memberCode: '002', isActive: true, joiningDate: '2026-11-01', createdAt: '', updatedAt: '' },
    { id: 'm3', activityId: 'act-1', name: 'Charlie', memberCode: '003', isActive: true, joiningDate: '2026-11-01', createdAt: '', updatedAt: '' },
    { id: 'm4', activityId: 'act-1', name: 'Diana', memberCode: '004', isActive: true, joiningDate: '2026-11-01', createdAt: '', updatedAt: '' },
  ];

  const records: AttendanceRecord[] = [
    { id: 'r1', activityId: 'act-1', memberId: 'm1', date: '2026-11-10', status: 'PRESENT', createdAt: '', updatedAt: '' },
    { id: 'r2', activityId: 'act-1', memberId: 'm2', date: '2026-11-10', status: 'HALF_DAY', createdAt: '', updatedAt: '' },
    { id: 'r3', activityId: 'act-1', memberId: 'm3', date: '2026-11-10', status: 'ABSENT', createdAt: '', updatedAt: '' },
    // m4 is completely UNMARKED
  ];

  const summary = calculateDailySummary('2026-11-10', dummyActivity, members, records, []);
  assert.equal(summary.totalMembers, 4);
  assert.equal(summary.presentCount, 1);
  assert.equal(summary.halfDayCount, 1);
  assert.equal(summary.absentCount, 1);
  assert.equal(summary.unmarkedCount, 1);
  assert.equal(summary.effectivePresentCount, 1.5);
  assert.equal(summary.expectedMembers, 4);
  assert.equal(summary.percentage, 37.5);
});

test('CSV formula injection protection sanitizes dangerous prefixes', () => {
  // Dangerous formulas should have leading quote prepended
  assert.equal(sanitizeCsvField('=cmd|/C calc!A0'), `"'=cmd|/C calc!A0"`);
  assert.equal(sanitizeCsvField('+12345'), ` "'+12345"`.trim());
  assert.equal(sanitizeCsvField('-12345'), ` "'-12345"`.trim());
  assert.equal(sanitizeCsvField('@SUM(A1:A10)'), `"'@SUM(A1:A10)"`);
  // Regular text is quoted normally
  assert.equal(sanitizeCsvField('Alice Johnson'), `"Alice Johnson"`);
});

test('CSV parser correctly extracts members and leaving date', () => {
  const csvText = `Member Code,Full Name,Phone,Email,Joining Date,Leaving Date,Notes
EMP-001,Alice Johnson,+1 555-0101,alice@work.com,2026-01-01,2026-10-31,Team Lead
EMP-002,Bob Smith,+1 555-0102,bob@work.com,2026-02-01,,Developer`;

  const parsed = parseMembersCsv(csvText);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].name, 'Alice Johnson');
  assert.equal(parsed[0].leavingDate, '2026-10-31');
  assert.equal(parsed[1].name, 'Bob Smith');
  assert.equal(parsed[1].leavingDate, undefined);
});
