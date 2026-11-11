import { Member, AttendanceRecord, Activity, Shift } from '../types';

/**
 * Sanitizes fields to prevent CSV / Formula Injection attacks in spreadsheet applications (Excel, Google Sheets).
 * Cells starting with =, +, -, @, tab, or carriage return are prefixed with an apostrophe.
 */
export function sanitizeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export function downloadCsvFile(csvContent: string, fileName: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportDailyAttendanceCsv(
  activity: Activity,
  dateStr: string,
  members: Member[],
  records: AttendanceRecord[],
  shifts: Shift[]
): string {
  const shiftMap = new Map(shifts.map(s => [s.id, s.name]));
  const recordMap = new Map(records.filter(r => r.date === dateStr && r.activityId === activity.id).map(r => [r.memberId, r]));

  const headers = ['Member Code', 'Member Name', 'Activity', 'Date', 'Status', 'Shift', 'Overtime Hours', 'Notes'];
  const rows = members.map(m => {
    const r = recordMap.get(m.id);
    const status = r ? r.status : 'UNMARKED';
    const shift = r?.shiftId ? (shiftMap.get(r.shiftId) || '') : (m.assignedShiftId ? (shiftMap.get(m.assignedShiftId) || '') : '');
    const ot = r?.overtimeHours ? r.overtimeHours.toString() : '0';
    const notes = r?.notes || '';

    return [
      sanitizeCsvField(m.memberCode),
      sanitizeCsvField(m.name),
      sanitizeCsvField(activity.name),
      sanitizeCsvField(dateStr),
      sanitizeCsvField(status),
      sanitizeCsvField(shift),
      sanitizeCsvField(ot),
      sanitizeCsvField(notes),
    ];
  });

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function exportMembersCsv(activityName: string, members: Member[]): string {
  const headers = ['Member Code', 'Full Name', 'Phone', 'Email', 'Joining Date', 'Leaving Date', 'Status', 'Notes'];
  const rows = members.map(m => [
    sanitizeCsvField(m.memberCode),
    sanitizeCsvField(m.name),
    sanitizeCsvField(m.mobile || ''),
    sanitizeCsvField(m.email || ''),
    sanitizeCsvField(m.joiningDate),
    sanitizeCsvField(m.leavingDate || ''),
    sanitizeCsvField(m.isActive ? 'Active' : 'Inactive'),
    sanitizeCsvField(m.notes || ''),
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function generateMemberTemplateCsv(): string {
  return [
    'Member Code,Full Name,Phone,Email,Joining Date,Leaving Date,Notes',
    'EMP-101,John Doe,+1 555-0199,john@example.com,2026-01-01,,Senior Team Member',
    'EMP-102,Jane Smith,+1 555-0288,jane@example.com,2026-01-15,,Developer',
  ].join('\n');
}

/**
 * Robust CSV parser that handles commas inside quotes and strips CSV injection marks safely.
 */
export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  const lines = csvText.split(/\r\n|\n/);

  for (const line of lines) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let insideQuote = false;
    let entry = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuote && line[i + 1] === '"') {
          entry += '"';
          i++;
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === ',' && !insideQuote) {
        row.push(entry.trim());
        entry = '';
      } else {
        entry += char;
      }
    }
    row.push(entry.trim());
    rows.push(row);
  }

  return rows;
}

export function parseMembersCsv(csvText: string): Partial<Member>[] {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
  const codeIdx = headers.findIndex(h => h.includes('code') || h.includes('id'));
  const nameIdx = headers.findIndex(h => h.includes('name'));
  const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('mobile'));
  const emailIdx = headers.findIndex(h => h.includes('email'));
  const joinIdx = headers.findIndex(h => h.includes('join'));
  const leaveIdx = headers.findIndex(h => h.includes('leav') || h.includes('exit'));
  const notesIdx = headers.findIndex(h => h.includes('note'));

  const parsed: Partial<Member>[] = [];
  const seenCodes = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i].map(c => {
      let clean = c.replace(/^["']|["']$/g, '').trim();
      // If was escaped for formula injection, strip leading single quote
      if (clean.startsWith("'") && /^[=+\-@\t\r]/.test(clean.slice(1))) {
        clean = clean.slice(1);
      }
      return clean;
    });

    const name = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx] : '';
    if (!name) continue;

    let code = codeIdx !== -1 && cols[codeIdx] ? cols[codeIdx] : `MEM-${Date.now().toString().slice(-4)}-${i}`;
    // Deduplicate within the file
    if (seenCodes.has(code)) {
      code = `${code}-${i}`;
    }
    seenCodes.add(code);

    const mobile = phoneIdx !== -1 ? cols[phoneIdx] : '';
    const email = emailIdx !== -1 ? cols[emailIdx] : '';
    const joiningDate = joinIdx !== -1 && cols[joinIdx] ? cols[joinIdx] : new Date().toISOString().split('T')[0];
    const leavingDate = leaveIdx !== -1 && cols[leaveIdx] ? cols[leaveIdx] : undefined;
    const notes = notesIdx !== -1 ? cols[notesIdx] : '';

    parsed.push({
      memberCode: code,
      name,
      mobile,
      email,
      joiningDate,
      leavingDate: leavingDate || undefined,
      notes,
      isActive: true,
    });
  }

  return parsed;
}
