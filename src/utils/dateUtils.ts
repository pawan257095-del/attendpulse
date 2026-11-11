import { format, parseISO, eachDayOfInterval, isValid, getDay, addDays, subDays } from 'date-fns';

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateSafe(dateStr: string, formatPattern: string = 'dd MMM yyyy'): string {
  try {
    if (!dateStr) return '';
    // If format is YYYY-MM-DD, parse as local year, month, date to prevent UTC timezone shifts
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (isValid(d)) {
        return format(d, formatPattern);
      }
    }
    const parsed = parseISO(dateStr);
    return isValid(parsed) ? format(parsed, formatPattern) : dateStr;
  } catch {
    return dateStr;
  }
}

export function formatTimeSafe(timeStr: string, is12Hour: boolean = true): string {
  if (!timeStr) return '';
  const [hourStr, minStr] = timeStr.split(':');
  if (hourStr === undefined || minStr === undefined) return timeStr;
  let hour = parseInt(hourStr, 10);
  const min = parseInt(minStr, 10);
  if (isNaN(hour) || isNaN(min)) return timeStr;

  if (!is12Hour) {
    return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12; // '0' should be '12'
  return `${hour}:${String(min).padStart(2, '0')} ${ampm}`;
}

export function getDaysInRange(startDateStr: string, endDateStr: string): string[] {
  try {
    const startParts = startDateStr.split('-').map(Number);
    const endParts = endDateStr.split('-').map(Number);
    const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
    const end = new Date(endParts[0], endParts[1] - 1, endParts[2]);

    if (start > end) return [];

    const interval = eachDayOfInterval({ start, end });
    return interval.map(d => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });
  } catch {
    return [];
  }
}

export function isDateWorkingDay(dateStr: string, workingDays: number[]): boolean {
  if (!workingDays || workingDays.length === 0) return true;
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const dayOfWeek = getDay(d); // 0 = Sunday, 1 = Monday, etc.
  return workingDays.includes(dayOfWeek);
}

export function shiftDateByDays(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const newD = days >= 0 ? addDays(d, days) : subDays(d, Math.abs(days));
  const year = newD.getFullYear();
  const month = String(newD.getMonth() + 1).padStart(2, '0');
  const day = String(newD.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonthStartAndEnd(year: number, monthIndex0: number): { start: string; end: string } {
  const first = new Date(year, monthIndex0, 1);
  const last = new Date(year, monthIndex0 + 1, 0);

  const startStr = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}-01`;
  const endStr = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
  return { start: startStr, end: endStr };
}

export function calculateShiftDurationHours(startTime: string, endTime: string, breakMinutes: number = 0): number {
  if (!startTime || !endTime) return 0;
  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);

  let startTotalMins = sH * 60 + sM;
  let endTotalMins = eH * 60 + eM;

  // Overnight shift support: if end is less than start, it crosses midnight
  if (endTotalMins < startTotalMins) {
    endTotalMins += 24 * 60;
  }

  const netMinutes = Math.max(0, endTotalMins - startTotalMins - breakMinutes);
  return Number((netMinutes / 60).toFixed(1));
}
