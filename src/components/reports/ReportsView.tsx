import React, { useState, useMemo } from 'react';
import {
  FileBarChart2,
  Download,
  Share2,
  Printer,
  Copy,
  Calendar,
  Users,
  CheckCircle2,
  Send,
  MessageSquare,
  Mail,
  Check,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';
import { calculateDailySummary, calculateMemberStats } from '../../utils/attendanceCalc';
import {
  getTodayDateString,
  shiftDateByDays,
  formatDateSafe,
  getMonthStartAndEnd,
  getDaysInRange,
} from '../../utils/dateUtils';
import { generateDailyAttendancePdf, generateMonthlyAttendancePdf } from '../../utils/exportPdf';
import { exportDailyAttendanceCsv, downloadCsvFile } from '../../utils/exportCsv';
import { Modal } from '../common/Modal';

export const ReportsView: React.FC = () => {
  const {
    activities,
    members,
    attendance,
    shifts,
    holidays,
    settings,
    selectedActivityId,
  } = useAttendance();

  const today = getTodayDateString();
  const activeActivity = activities.find(a => a.id === selectedActivityId) || activities[0];

  const [reportType, setReportType] = useState<string>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [startDate, setStartDate] = useState<string>(shiftDateByDays(today, -30));
  const [endDate, setEndDate] = useState<string>(today);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [copiedToast, setCopiedToast] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const activityMembers = useMemo(() => {
    if (!activeActivity) return [];
    return members.filter(m => m.activityId === activeActivity.id && m.isActive);
  }, [activeActivity, members]);

  // Adjust start/end dates when changing preset report type
  const handleReportTypeChange = (type: string) => {
    setReportType(type);
    if (type === 'daily') {
      setSelectedDate(today);
    } else if (type === 'weekly') {
      setStartDate(shiftDateByDays(today, -7));
      setEndDate(today);
    } else if (type === 'monthly') {
      const now = new Date();
      const bounds = getMonthStartAndEnd(now.getFullYear(), now.getMonth());
      setStartDate(bounds.start);
      setEndDate(bounds.end);
    } else if (type === 'yearly') {
      const year = new Date().getFullYear();
      setStartDate(`${year}-01-01`);
      setEndDate(`${year}-12-31`);
    } else if (type === 'overtime' || type === 'absence' || type === 'halfday') {
      setStartDate(shiftDateByDays(today, -30));
      setEndDate(today);
    }
  };

  // Daily summary calculation
  const dailySummary = useMemo(() => {
    if (!activeActivity) return null;
    return calculateDailySummary(selectedDate, activeActivity, activityMembers, attendance, holidays);
  }, [selectedDate, activeActivity, activityMembers, attendance, holidays]);

  // Member stats across range
  const memberStatsList = useMemo(() => {
    if (!activeActivity) return [];
    return activityMembers.map(m =>
      calculateMemberStats(m, activeActivity, startDate, endDate, attendance, holidays)
    );
  }, [activeActivity, activityMembers, startDate, endDate, attendance, holidays]);

  // Filtered stats list based on special report types (Overtime, Absence, HalfDay)
  const filteredStatsList = useMemo(() => {
    if (reportType === 'overtime') {
      return memberStatsList.filter(s => s.overtimeDays > 0 || s.totalOvertimeHours > 0);
    }
    if (reportType === 'absence') {
      return memberStatsList.filter(s => s.absentDays > 0);
    }
    if (reportType === 'halfday') {
      return memberStatsList.filter(s => s.halfDays > 0);
    }
    if (reportType === 'member' && selectedMemberId) {
      return memberStatsList.filter(s => s.memberId === selectedMemberId);
    }
    return memberStatsList;
  }, [memberStatsList, reportType, selectedMemberId]);

  // Formatted Text Summary for WhatsApp / Copy
  const formattedTextSummary = useMemo(() => {
    if (!activeActivity) return '';
    if (reportType === 'daily' && dailySummary) {
      return `*DAILY ATTENDANCE REPORT*
Activity: ${activeActivity.name}
Date: ${formatDateSafe(selectedDate)}

Total Members: ${dailySummary.totalMembers}
Present: ${dailySummary.presentCount}
Absent: ${dailySummary.absentCount}
Half Day: ${dailySummary.halfDayCount}
Holiday: ${dailySummary.holidayCount}
Overtime: ${dailySummary.overtimeCount} (${dailySummary.totalOvertimeHours}h)
Unmarked: ${dailySummary.unmarkedCount}

Attendance Summary: ${dailySummary.effectivePresentCount} / ${dailySummary.expectedMembers} expected working members (${dailySummary.percentage}%).
_Generated via ${settings.appName || 'AttendPulse'}_`;
    } else {
      const totalExpected = filteredStatsList.reduce((acc, s) => acc + s.expectedWorkingDays, 0);
      const totalActual = filteredStatsList.reduce((acc, s) => acc + s.actualAttendanceDays, 0);
      const avgPct = totalExpected > 0 ? ((totalActual / totalExpected) * 100).toFixed(1) : '100';

      return `*ATTENDANCE SUMMARY REPORT*
Activity: ${activeActivity.name}
Period: ${formatDateSafe(startDate)} to ${formatDateSafe(endDate)}

Total Members Evaluated: ${filteredStatsList.length}
Overall Attendance: ${avgPct}%

Top Records:
${filteredStatsList.slice(0, 5).map(s => `• ${s.memberName} (${s.memberCode}): ${s.attendancePercentage}% (${s.actualAttendanceDays}/${s.expectedWorkingDays} days)`).join('\n')}

_Generated via ${settings.appName || 'AttendPulse'}_`;
    }
  }, [activeActivity, reportType, dailySummary, selectedDate, settings.appName, filteredStatsList, startDate, endDate]);

  // Export PDF Action
  const handleDownloadPdf = () => {
    if (!activeActivity) return;
    if (reportType === 'daily' && dailySummary) {
      const doc = generateDailyAttendancePdf({
        activity: activeActivity,
        dateStr: selectedDate,
        members: activityMembers,
        records: attendance,
        shifts,
        summary: dailySummary,
        appName: settings.appName,
        orgName: settings.organizationName,
      });
      doc.save(`${activeActivity.name}_Attendance_${selectedDate}.pdf`);
    } else {
      const doc = generateMonthlyAttendancePdf({
        activity: activeActivity,
        startDateStr: startDate,
        endDateStr: endDate,
        memberStatsList: filteredStatsList,
        appName: settings.appName,
        orgName: settings.organizationName,
      });
      doc.save(`${activeActivity.name}_Report_${startDate}_to_${endDate}.pdf`);
    }
  };

  // Share actual PDF file using Web Share API
  const handleSharePdfFile = async () => {
    if (!activeActivity) return;
    try {
      let doc;
      let filename = '';
      if (reportType === 'daily' && dailySummary) {
        doc = generateDailyAttendancePdf({
          activity: activeActivity,
          dateStr: selectedDate,
          members: activityMembers,
          records: attendance,
          shifts,
          summary: dailySummary,
          appName: settings.appName,
          orgName: settings.organizationName,
        });
        filename = `${activeActivity.name.replace(/\s+/g, '_')}_Attendance_${selectedDate}.pdf`;
      } else {
        doc = generateMonthlyAttendancePdf({
          activity: activeActivity,
          startDateStr: startDate,
          endDateStr: endDate,
          memberStatsList: filteredStatsList,
          appName: settings.appName,
          orgName: settings.organizationName,
        });
        filename = `${activeActivity.name.replace(/\s+/g, '_')}_Report_${startDate}_to_${endDate}.pdf`;
      }

      const pdfBlob = doc.output('blob');
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `${activeActivity.name} Attendance Report`,
          text: `Attendance report for ${activeActivity.name}`,
        });
      } else {
        doc.save(filename);
      }
    } catch (err) {
      console.warn('File share aborted or failed:', err);
    }
  };

  // Export CSV Action
  const handleDownloadCsv = () => {
    if (!activeActivity) return;
    if (reportType === 'daily') {
      const csv = exportDailyAttendanceCsv(activeActivity, selectedDate, activityMembers, attendance, shifts);
      downloadCsvFile(csv, `${activeActivity.name}_Daily_${selectedDate}.csv`);
    } else {
      const headers = ['Member Code', 'Member Name', 'Expected Days', 'Present', 'Half Days', 'Absent', 'Holidays', 'OT Days', 'OT Hours', 'Attendance %'];
      const rows = filteredStatsList.map(s => [
        `"${s.memberCode}"`,
        `"${s.memberName}"`,
        s.expectedWorkingDays,
        s.presentDays,
        s.halfDays,
        s.absentDays,
        s.holidays,
        s.overtimeDays,
        s.totalOvertimeHours,
        `"${s.attendancePercentage}%"`,
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadCsvFile(csv, `${activeActivity.name}_Period_${startDate}_${endDate}.csv`);
    }
  };

  // Share Actions
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(formattedTextSummary);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3000);
    } catch {
      // fallback
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${activeActivity?.name} Attendance Report`,
          text: formattedTextSummary,
        });
      } catch {
        // User cancelled or unsupported
      }
    } else {
      handleCopyText();
    }
  };

  const handleShareWhatsApp = () => {
    const encoded = encodeURIComponent(formattedTextSummary);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handleShareTelegram = () => {
    const encoded = encodeURIComponent(formattedTextSummary);
    window.open(`https://t.me/share/url?url=&text=${encoded}`, '_blank');
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`${activeActivity?.name} Attendance Report`);
    const body = encodeURIComponent(formattedTextSummary);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Reports & Sharing Center
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Generate printable reports, export PDF & CSV documents, or share summaries on WhatsApp.
          </p>
        </div>

        {/* Export & Print Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSharePdfFile}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-md shadow-cyan-600/30 active:scale-95 transition"
            title="Share PDF directly using native device sharing"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share PDF</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 active:scale-95 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Printable View</span>
          </button>
        </div>
      </div>

      {/* 10 Report Types Selector */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Select Report Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: 'daily', label: '1. Daily Report' },
              { id: 'weekly', label: '2. Weekly Report' },
              { id: 'monthly', label: '3. Monthly Report' },
              { id: 'yearly', label: '4. Yearly Report' },
              { id: 'member', label: '5. Member Report' },
              { id: 'activity', label: '6. Activity Report' },
              { id: 'overtime', label: '7. Overtime Report' },
              { id: 'absence', label: '8. Absence Report' },
              { id: 'halfday', label: '9. Half-Day Report' },
              { id: 'custom', label: '10. Custom Date Range' },
            ].map(r => (
              <button
                key={r.id}
                onClick={() => handleReportTypeChange(r.id)}
                className={`py-2 px-3 rounded-xl text-xs font-bold text-left transition ${
                  reportType === r.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date / Member Parameters */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center gap-4 text-xs font-semibold">
          {reportType === 'daily' ? (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 font-bold"
              />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 font-bold"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 font-bold"
                />
              </div>
            </div>
          )}

          {reportType === 'member' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">Select Member:</span>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 font-bold"
              >
                <option value="">All Members</option>
                {activityMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.memberCode})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Share Actions Bar */}
      <div className="bg-linear-to-r from-slate-900 to-indigo-950 rounded-2xl p-5 text-white shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Share2 className="w-4 h-4 text-cyan-400" />
              <span>Share Attendance Report</span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Instantly share summaries with managers, team leads, or department groups.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleShareTelegram}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Telegram</span>
            </button>

            <button
              onClick={handleShareEmail}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email</span>
            </button>

            <button
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs backdrop-blur-md transition"
            >
              {copiedToast ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedToast ? 'Copied!' : 'Copy Summary'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Report Preview Table */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Report Data Preview
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Activity: {activeActivity?.name} • Showing {reportType === 'daily' ? activityMembers.length : filteredStatsList.length} records
            </span>
          </div>
        </div>

        {reportType === 'daily' ? (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-750 text-slate-500 dark:text-slate-400 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Member Name</th>
                <th className="p-3">Status</th>
                <th className="p-3">Shift</th>
                <th className="p-3">Overtime</th>
                <th className="p-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium text-slate-700 dark:text-slate-200">
              {activityMembers.map(m => {
                const rec = attendance.find(r => r.activityId === activeActivity?.id && r.memberId === m.id && r.date === selectedDate);
                const status = rec ? rec.status : 'UNMARKED';

                return (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/50">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{m.memberCode}</td>
                    <td className="p-3">{m.name}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                        status === 'ABSENT' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                        status === 'HALF_DAY' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                        status === 'HOLIDAY' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="p-3">{rec?.shiftId ? (shifts.find(s => s.id === rec.shiftId)?.name || '-') : '-'}</td>
                    <td className="p-3">{rec?.overtimeHours ? `${rec.overtimeHours} hrs` : '-'}</td>
                    <td className="p-3 text-slate-400 italic">{rec?.notes || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-750 text-slate-500 dark:text-slate-400 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Member Name</th>
                <th className="p-3">Expected</th>
                <th className="p-3 text-emerald-600">Present</th>
                <th className="p-3 text-amber-600">Half Day</th>
                <th className="p-3 text-rose-600">Absent</th>
                <th className="p-3 text-blue-600">Holidays</th>
                <th className="p-3 text-purple-600">Overtime</th>
                <th className="p-3">Attendance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium text-slate-700 dark:text-slate-200">
              {filteredStatsList.map(s => (
                <tr key={s.memberId} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/50">
                  <td className="p-3 font-bold text-slate-900 dark:text-white">{s.memberCode}</td>
                  <td className="p-3">{s.memberName}</td>
                  <td className="p-3">{s.expectedWorkingDays} days</td>
                  <td className="p-3 text-emerald-600 font-bold">{s.presentDays}</td>
                  <td className="p-3 text-amber-600 font-bold">{s.halfDays}</td>
                  <td className="p-3 text-rose-600 font-bold">{s.absentDays}</td>
                  <td className="p-3 text-blue-600">{s.holidays}</td>
                  <td className="p-3 text-purple-600 font-bold">
                    {s.overtimeDays > 0 ? `${s.overtimeDays}d (${s.totalOvertimeHours}h)` : '-'}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                      s.attendancePercentage >= 85 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                      s.attendancePercentage >= 70 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                      'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {s.attendancePercentage}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Printable Preview Modal */}
      {showPrintModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowPrintModal(false)}
          title="Printable HTML Report"
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="p-6 bg-white text-slate-900 rounded-xl border border-slate-200 text-xs font-mono space-y-3">
              <div className="border-b pb-3 flex justify-between items-start">
                <div>
                  <h2 className="text-base font-bold uppercase">{settings.appName || 'AttendPulse'}</h2>
                  <p className="text-slate-500">{settings.organizationName}</p>
                  <p className="font-semibold text-slate-700">Activity: {activeActivity?.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">Generated: {formatDateSafe(today)}</p>
                  <p className="text-slate-500">Period: {reportType === 'daily' ? formatDateSafe(selectedDate) : `${formatDateSafe(startDate)} - ${formatDateSafe(endDate)}`}</p>
                </div>
              </div>

              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-700">
                {formattedTextSummary}
              </pre>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
