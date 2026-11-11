import { AttendanceRecord, Member, Activity, Holiday, MemberAttendanceStats, DailyAttendanceSummary } from '../types';
import { getDaysInRange, isDateWorkingDay } from './dateUtils';

/**
 * Checks if a member is active and within tenure on a given date.
 */
export function isMemberActiveOnDate(member: Member, dateStr: string): boolean {
  if (!member.isActive) return false;
  if (member.joiningDate && dateStr < member.joiningDate) return false;
  if (member.leavingDate && dateStr > member.leavingDate) return false;
  return true;
}

/**
 * Checks if a date is within an activity's lifecycle boundaries.
 */
export function isDateWithinActivityBounds(activity: Activity, dateStr: string): boolean {
  if (activity.startDate && dateStr < activity.startDate) return false;
  if (activity.endDate && dateStr > activity.endDate) return false;
  return true;
}

/**
 * Calculates attendance statistics for an individual member across a specific date range.
 */
export function calculateMemberStats(
  member: Member,
  activity: Activity,
  startDateStr: string,
  endDateStr: string,
  allRecords: AttendanceRecord[],
  holidays: Holiday[]
): MemberAttendanceStats {
  const days = getDaysInRange(startDateStr, endDateStr);

  const holidayDateSet = new Set(
    holidays
      .filter(h => h.activityId === 'ALL' || h.activityId === activity.id)
      .map(h => h.date)
  );

  // Map member records by date for fast lookup
  const recordMap = new Map<string, AttendanceRecord>();
  for (const r of allRecords) {
    if (r.memberId === member.id && r.activityId === activity.id) {
      recordMap.set(r.date, r);
    }
  }

  let expectedWorkingDays = 0;
  let presentDays = 0;
  let absentDays = 0;
  let halfDays = 0;
  let holidayCount = 0;
  let overtimeDays = 0;
  let totalOvertimeHours = 0;
  let unmarkedDays = 0;

  // Streak tracking
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;

  for (const dateStr of days) {
    // 1. Exclude dates outside member tenure (before joining or after leaving)
    if (member.joiningDate && dateStr < member.joiningDate) continue;
    if (member.leavingDate && dateStr > member.leavingDate) continue;

    // 2. Exclude dates outside activity boundaries
    if (!isDateWithinActivityBounds(activity, dateStr)) continue;

    const isGlobalOrActivityHoliday = holidayDateSet.has(dateStr);
    const record = recordMap.get(dateStr);
    const isRecordHoliday = record?.status === 'HOLIDAY';
    const isEffectiveHoliday = isGlobalOrActivityHoliday || isRecordHoliday;
    const isWorkingDay = isDateWorkingDay(dateStr, activity.workingDays);

    // Overtime tracking (independent of status)
    if (record?.overtimeHours && record.overtimeHours > 0) {
      overtimeDays += 1;
      totalOvertimeHours += Number(record.overtimeHours);
    }

    if (isWorkingDay && !isEffectiveHoliday) {
      expectedWorkingDays += 1;
    }

    if (record) {
      switch (record.status) {
        case 'PRESENT':
          presentDays += 1;
          tempStreak += 1;
          bestStreak = Math.max(bestStreak, tempStreak);
          break;
        case 'HALF_DAY':
          halfDays += 1;
          tempStreak += 1;
          bestStreak = Math.max(bestStreak, tempStreak);
          break;
        case 'ABSENT':
          absentDays += 1;
          tempStreak = 0; // breaks streak
          break;
        case 'HOLIDAY':
          holidayCount += 1;
          // Holidays do not break or increment streak
          break;
        case 'UNMARKED':
          if (isWorkingDay && !isEffectiveHoliday) {
            unmarkedDays += 1;
            // Incomplete/unmarked: pauses streak
          }
          break;
      }
    } else {
      if (isEffectiveHoliday) {
        holidayCount += 1;
      } else if (isWorkingDay) {
        unmarkedDays += 1;
      }
    }
  }

  currentStreak = tempStreak;

  const actualAttendanceDays = Number((presentDays + halfDays * 0.5).toFixed(1));

  // Attendance percentage formula:
  // (Present Days + Half Days * 0.5) / Expected Working Days * 100
  let attendancePercentage = 0;
  if (expectedWorkingDays > 0) {
    attendancePercentage = Number(((actualAttendanceDays / expectedWorkingDays) * 100).toFixed(1));
  } else if (actualAttendanceDays > 0) {
    attendancePercentage = 100;
  }

  return {
    memberId: member.id,
    memberName: member.name,
    memberCode: member.memberCode,
    totalCalendarDays: days.length,
    expectedWorkingDays,
    presentDays,
    absentDays,
    halfDays,
    holidays: holidayCount,
    overtimeDays,
    totalOvertimeHours: Number(totalOvertimeHours.toFixed(1)),
    actualAttendanceDays,
    attendancePercentage: Math.min(100, Math.max(0, attendancePercentage)),
    unmarkedDays,
    currentStreak,
    bestStreak,
  };
}

/**
 * Calculates daily attendance summary across all active members of an activity for a given date.
 */
export function calculateDailySummary(
  dateStr: string,
  activity: Activity,
  members: Member[],
  records: AttendanceRecord[],
  holidays: Holiday[]
): DailyAttendanceSummary {
  const isDateInBounds = isDateWithinActivityBounds(activity, dateStr);
  const isHoliday = holidays.some(
    h => (h.activityId === 'ALL' || h.activityId === activity.id) && h.date === dateStr
  );
  const isWorkingDay = isDateWorkingDay(dateStr, activity.workingDays);

  // Filter members active on this specific date
  const activeMembersOnDate = isDateInBounds
    ? members.filter(m => {
        if (!m.isActive) return false;
        if (m.activityId !== activity.id) return false;
        return isMemberActiveOnDate(m, dateStr);
      })
    : [];

  const recordMap = new Map<string, AttendanceRecord>();
  for (const r of records) {
    if (r.activityId === activity.id && r.date === dateStr) {
      recordMap.set(r.memberId, r);
    }
  }

  let presentCount = 0;
  let absentCount = 0;
  let halfDayCount = 0;
  let holidayCount = 0;
  let overtimeCount = 0;
  let unmarkedCount = 0;
  let totalOvertimeHours = 0;

  for (const member of activeMembersOnDate) {
    const record = recordMap.get(member.id);

    // Track overtime independently
    if (record?.overtimeHours && record.overtimeHours > 0) {
      overtimeCount += 1;
      totalOvertimeHours += Number(record.overtimeHours);
    }

    if (!record || record.status === 'UNMARKED') {
      if (isHoliday) {
        holidayCount += 1;
      } else if (isWorkingDay && isDateInBounds) {
        unmarkedCount += 1;
      }
    } else {
      switch (record.status) {
        case 'PRESENT':
          presentCount += 1;
          break;
        case 'ABSENT':
          absentCount += 1;
          break;
        case 'HALF_DAY':
          halfDayCount += 1;
          break;
        case 'HOLIDAY':
          holidayCount += 1;
          break;
      }
    }
  }

  const effectivePresent = Number((presentCount + halfDayCount * 0.5).toFixed(1));
  const expectedMembers = isWorkingDay && isDateInBounds ? Math.max(0, activeMembersOnDate.length - holidayCount) : 0;

  let percentage = 0;
  if (expectedMembers > 0) {
    percentage = Number(((effectivePresent / expectedMembers) * 100).toFixed(1));
  } else if (presentCount > 0 || halfDayCount > 0) {
    percentage = 100;
  }

  return {
    date: dateStr,
    activityId: activity.id,
    totalMembers: activeMembersOnDate.length,
    presentCount,
    absentCount,
    halfDayCount,
    holidayCount,
    overtimeCount,
    unmarkedCount,
    totalOvertimeHours: Number(totalOvertimeHours.toFixed(1)),
    expectedMembers,
    effectivePresentCount: effectivePresent,
    percentage: Math.min(100, Math.max(0, percentage)),
    isWeeklyOff: !isWorkingDay,
    isHoliday,
  };
}
