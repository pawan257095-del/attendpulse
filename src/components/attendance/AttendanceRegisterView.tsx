import React, { useState, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Sun,
  Flame,
  Users,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Edit3,
  PlusCircle,
  FolderPlus,
  Sparkles,
} from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';
import { AttendanceStatus, Member } from '../../types';
import { calculateDailySummary } from '../../utils/attendanceCalc';
import { formatDateSafe, shiftDateByDays, getTodayDateString } from '../../utils/dateUtils';
import { Modal } from '../common/Modal';

export const AttendanceRegisterView: React.FC = () => {
  const {
    activities,
    members,
    attendance,
    shifts,
    holidays,
    selectedActivityId,
    selectedDate,
    setSelectedDate,
    markAttendance,
    assignShiftToMember,
    setMemberOvertime,
    bulkMarkAttendance,
    resetTodayAttendance,
  } = useAttendance();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // Overtime Modal
  const [overtimeModalMember, setOvertimeModalMember] = useState<Member | null>(null);
  const [overtimeHoursInput, setOvertimeHoursInput] = useState<string>('2');
  const [overtimeNotesInput, setOvertimeNotesInput] = useState<string>('');

  // Shift Modal
  const [shiftModalMember, setShiftModalMember] = useState<Member | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');

  // Reset Modal
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Bulk Overwrite Preview Modal
  const [pendingBulkStatus, setPendingBulkStatus] = useState<AttendanceStatus | null>(null);
  const [showBulkOverwriteModal, setShowBulkOverwriteModal] = useState(false);

  const activeActivity = activities.find(a => a.id === selectedActivityId) || activities[0];
  const today = getTodayDateString();

  // Active members for this activity within tenure
  const activityMembers = useMemo(() => {
    if (!activeActivity) return [];
    return members.filter(m => {
      if (m.activityId !== activeActivity.id) return false;
      if (!m.isActive) return false;
      if (m.joiningDate && selectedDate < m.joiningDate) return false;
      if (m.leavingDate && selectedDate > m.leavingDate) return false;
      return true;
    });
  }, [activeActivity, members, selectedDate]);

  // Current day's records lookup map
  const recordMap = useMemo(() => {
    const map = new Map();
    attendance.forEach(r => {
      if (r.activityId === activeActivity?.id && r.date === selectedDate) {
        map.set(r.memberId, r);
      }
    });
    return map;
  }, [attendance, activeActivity, selectedDate]);

  // Shift lookup map
  const shiftMap = useMemo(() => {
    return new Map(shifts.map(s => [s.id, s]));
  }, [shifts]);

  // Summary for today
  const dailySummary = useMemo(() => {
    if (!activeActivity) {
      return {
        totalMembers: 0,
        presentCount: 0,
        absentCount: 0,
        halfDayCount: 0,
        holidayCount: 0,
        overtimeCount: 0,
        unmarkedCount: 0,
        percentage: 0,
        isWeeklyOff: false,
        isHoliday: false,
      };
    }
    return calculateDailySummary(selectedDate, activeActivity, activityMembers, attendance, holidays);
  }, [selectedDate, activeActivity, activityMembers, attendance, holidays]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return activityMembers.filter(m => {
      // Search filter
      const matchSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.memberCode.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      // Status filter
      if (statusFilter === 'ALL') return true;
      const rec = recordMap.get(m.id);
      const currentStatus = rec ? rec.status : 'UNMARKED';

      if (statusFilter === 'UNMARKED') return currentStatus === 'UNMARKED';
      if (statusFilter === 'HAS_OT') return Boolean(rec?.overtimeHours && rec.overtimeHours > 0);
      return currentStatus === statusFilter;
    });
  }, [activityMembers, searchQuery, statusFilter, recordMap]);

  // One-Tap Attendance Marking
  const handleTapStatus = (member: Member, status: AttendanceStatus) => {
    markAttendance(member.id, status);
  };

  // Open Overtime Modal
  const handleOpenOvertime = (member: Member) => {
    setOvertimeModalMember(member);
    const existing = recordMap.get(member.id);
    setOvertimeHoursInput(existing?.overtimeHours ? String(existing.overtimeHours) : '2');
    setOvertimeNotesInput(existing?.notes || '');
  };

  // Save Overtime Independently
  const handleSaveOvertime = async () => {
    if (!overtimeModalMember) return;
    const hours = parseFloat(overtimeHoursInput) || 0;
    await setMemberOvertime(overtimeModalMember.id, hours, overtimeNotesInput);
    setOvertimeModalMember(null);
  };

  // Shift Assignment Modal
  const handleOpenShiftModal = (member: Member) => {
    setShiftModalMember(member);
    const existing = recordMap.get(member.id);
    setSelectedShiftId(existing?.shiftId || member.assignedShiftId || shifts[0]?.id || '');
  };

  // Save Shift Independently without changing attendance status
  const handleSaveShift = async () => {
    if (!shiftModalMember || !selectedShiftId) return;
    await assignShiftToMember(shiftModalMember.id, selectedShiftId);
    setShiftModalMember(null);
  };

  // Request Bulk Mark with Overwrite Preview
  const handleRequestBulkMark = (status: AttendanceStatus) => {
    const alreadyMarked = activityMembers.filter(m => {
      const rec = recordMap.get(m.id);
      return rec && rec.status !== 'UNMARKED';
    });

    if (alreadyMarked.length > 0) {
      setPendingBulkStatus(status);
      setShowBulkOverwriteModal(true);
    } else {
      // Direct bulk mark
      bulkMarkAttendance(activityMembers.map(m => m.id), status);
    }
  };

  // Execute Bulk Action from Preview Modal
  const handleExecuteBulk = (overwriteMode: 'all' | 'unmarkedOnly') => {
    if (!pendingBulkStatus) return;

    let targetIds: string[] = [];
    if (overwriteMode === 'all') {
      targetIds = activityMembers.map(m => m.id);
    } else {
      targetIds = activityMembers.filter(m => {
        const rec = recordMap.get(m.id);
        return !rec || rec.status === 'UNMARKED';
      }).map(m => m.id);
    }

    if (targetIds.length > 0) {
      bulkMarkAttendance(targetIds, pendingBulkStatus);
    }

    setShowBulkOverwriteModal(false);
    setPendingBulkStatus(null);
  };

  // Empty state when no activities exist
  if (!activeActivity || activities.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-100 dark:border-indigo-900">
          <FolderPlus className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">No Activities Registered</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Your attendance register is empty and ready for fresh setup. Create your first activity (e.g., Office, College, Gym, Project) to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-16">
      {/* Date Header & Quick Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/80 p-1 rounded-xl">
            <button
              onClick={() => setSelectedDate(shiftDateByDays(selectedDate, -1))}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 transition"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="bg-transparent font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 border-0 focus:ring-0 cursor-pointer px-2"
            />
            <button
              onClick={() => setSelectedDate(shiftDateByDays(selectedDate, 1))}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 transition"
              aria-label="Next day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {selectedDate !== today && (
            <button
              onClick={() => setSelectedDate(today)}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100 transition"
            >
              Go to Today
            </button>
          )}

          {dailySummary.isWeeklyOff && (
            <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
              Weekly Off
            </span>
          )}
          {dailySummary.isHoliday && (
            <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
              Holiday
            </span>
          )}
        </div>

        {/* Day Attendance Metric Bar */}
        <div className="flex items-center gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>{dailySummary.presentCount} P</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
            <XCircle className="w-4 h-4" />
            <span>{dailySummary.absentCount} A</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
            <Clock className="w-4 h-4" />
            <span>{dailySummary.halfDayCount} HD</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
            <Sun className="w-4 h-4" />
            <span>{dailySummary.holidayCount} H</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>{dailySummary.unmarkedCount} Unmarked</span>
          </div>
        </div>
      </div>

      {/* Bulk Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl p-3 sm:p-4 border border-indigo-100 dark:border-indigo-900/50">
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-300">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Quick Bulk Actions:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleRequestBulkMark('PRESENT')}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs active:scale-95 transition"
          >
            Mark All Present
          </button>
          <button
            onClick={() => handleRequestBulkMark('ABSENT')}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs active:scale-95 transition"
          >
            Mark All Absent
          </button>
          <button
            onClick={() => handleRequestBulkMark('HOLIDAY')}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs active:scale-95 transition"
          >
            Mark All Holiday
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 text-xs font-semibold transition"
          >
            Reset Day
          </button>
        </div>
      </div>

      {/* Search and Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by member name or ID code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'PRESENT', label: 'Present' },
            { id: 'ABSENT', label: 'Absent' },
            { id: 'HALF_DAY', label: 'Half Day' },
            { id: 'HOLIDAY', label: 'Holiday' },
            { id: 'HAS_OT', label: 'With Overtime' },
            { id: 'UNMARKED', label: 'Unmarked' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                statusFilter === f.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Member Attendance Register Cards */}
      <div className="space-y-3">
        {filteredMembers.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-slate-800/80 p-12 text-center border border-dashed border-slate-300 dark:border-slate-700">
            <Users className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-900 dark:text-white">No members found</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Try adjusting your search query or filter, or add members to this activity.
            </p>
          </div>
        ) : (
          filteredMembers.map((member) => {
            const record = recordMap.get(member.id);
            const currentStatus = record ? record.status : 'UNMARKED';
            const currentShift = record?.shiftId
              ? shiftMap.get(record.shiftId)
              : (member.assignedShiftId ? shiftMap.get(member.assignedShiftId) : null);
            const hasOvertime = Boolean(record?.overtimeHours && record.overtimeHours > 0);

            return (
              <div
                key={member.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition"
              >
                {/* Member Details */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-tr from-indigo-500 to-indigo-700 text-white font-bold text-sm shadow-xs">
                    {member.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                        {member.name}
                      </h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {member.memberCode}
                      </span>
                      {hasOvertime && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          <Flame className="w-3 h-3 text-purple-600" />
                          {record?.overtimeHours}h OT
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {/* Current Shift Badge (clickable to change) */}
                      <button
                        onClick={() => handleOpenShiftModal(member)}
                        className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                        title="Change assigned shift for this date"
                      >
                        <Clock className="w-3 h-3 text-indigo-500" />
                        <span className="font-medium underline decoration-dotted">
                          {currentShift ? currentShift.name : 'General Shift'}
                        </span>
                      </button>

                      {record?.notes && (
                        <span className="truncate max-w-[150px] italic">
                          • "{record.notes}"
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status & Overtime / Shift Actions */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap shrink-0">
                  {/* PRESENT */}
                  <button
                    onClick={() => handleTapStatus(member, 'PRESENT')}
                    aria-label={`Mark ${member.name} Present`}
                    className={`flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                      currentStatus === 'PRESENT'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>P</span>
                  </button>

                  {/* ABSENT */}
                  <button
                    onClick={() => handleTapStatus(member, 'ABSENT')}
                    aria-label={`Mark ${member.name} Absent`}
                    className={`flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                      currentStatus === 'ABSENT'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-500'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>A</span>
                  </button>

                  {/* HALF DAY */}
                  <button
                    onClick={() => handleTapStatus(member, 'HALF_DAY')}
                    aria-label={`Mark ${member.name} Half Day`}
                    className={`flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                      currentStatus === 'HALF_DAY'
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 ring-2 ring-amber-500'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>HD</span>
                  </button>

                  {/* HOLIDAY */}
                  <button
                    onClick={() => handleTapStatus(member, 'HOLIDAY')}
                    aria-label={`Mark ${member.name} Holiday`}
                    className={`flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                      currentStatus === 'HOLIDAY'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-500'
                        : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 hover:bg-blue-100'
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    <span>H</span>
                  </button>

                  {/* OVERTIME BUTTON (Independent logging) */}
                  <button
                    onClick={() => handleOpenOvertime(member)}
                    aria-label={`Log Overtime for ${member.name}`}
                    className={`flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                      hasOvertime
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 hover:bg-purple-100'
                    }`}
                  >
                    <Flame className="w-4 h-4" />
                    <span>{hasOvertime ? `${record?.overtimeHours}h` : '+OT'}</span>
                  </button>

                  {/* SHIFT BUTTON (Independent assignment) */}
                  <button
                    onClick={() => handleOpenShiftModal(member)}
                    aria-label={`Assign Shift for ${member.name}`}
                    className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition active:scale-95"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Shift</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bulk Overwrite Preview Modal */}
      {showBulkOverwriteModal && pendingBulkStatus && (
        <Modal
          isOpen={true}
          onClose={() => setShowBulkOverwriteModal(false)}
          title={`Bulk Mark: ${pendingBulkStatus}`}
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">Existing Attendance Records Detected</p>
                <p className="mt-1">
                  Some members already have attendance marked for {formatDateSafe(selectedDate)}.
                  How would you like to apply the bulk action?
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleExecuteBulk('unmarkedOnly')}
                className="w-full text-left p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
              >
                <div className="text-xs sm:text-sm font-bold text-indigo-900 dark:text-indigo-200">
                  Fill Unmarked Members Only (Safe)
                </div>
                <div className="text-xs text-indigo-700 dark:text-indigo-400 mt-0.5">
                  Keep existing marked statuses intact and only apply {pendingBulkStatus} to unmarked members.
                </div>
              </button>

              <button
                onClick={() => handleExecuteBulk('all')}
                className="w-full text-left p-3.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition"
              >
                <div className="text-xs sm:text-sm font-bold text-rose-900 dark:text-rose-200">
                  Overwrite All Members
                </div>
                <div className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">
                  Replace all members' attendance on this date with {pendingBulkStatus}.
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowBulkOverwriteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Overtime Modal */}
      {overtimeModalMember && (
        <Modal
          isOpen={true}
          onClose={() => setOvertimeModalMember(null)}
          title={`Log Overtime: ${overtimeModalMember.name}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Overtime hours are stored independently from attendance status and accumulated in monthly summaries.
            </p>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                Overtime Hours
              </label>
              <div className="flex gap-2 mb-3">
                {['0', '1', '1.5', '2', '2.5', '3', '4'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setOvertimeHoursInput(preset)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      overtimeHoursInput === preset
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {preset === '0' ? 'Clear' : `+${preset}h`}
                  </button>
                ))}
              </div>
              <input
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={overtimeHoursInput}
                onChange={(e) => setOvertimeHoursInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                Notes / Reason (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Critical release, Weekend coverage"
                value={overtimeNotesInput}
                onChange={(e) => setOvertimeNotesInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setOvertimeModalMember(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOvertime}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/30"
              >
                Save Overtime
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Shift Change Modal */}
      {shiftModalMember && (
        <Modal
          isOpen={true}
          onClose={() => setShiftModalMember(null)}
          title={`Assign Shift: ${shiftModalMember.name}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select which shift this member is working on {formatDateSafe(selectedDate)}. Changing shifts does not alter their attendance status.
            </p>

            <div className="space-y-2">
              {shifts.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedShiftId(s.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                    selectedShiftId === s.id
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-white'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="text-sm font-bold">{s.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {s.startTime} – {s.endTime} ({s.totalWorkingHours} hrs)
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    selectedShiftId === s.id ? 'border-indigo-600 bg-indigo-600' : 'border-slate-400'
                  }`}>
                    {selectedShiftId === s.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShiftModalMember(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveShift}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
              >
                Apply Shift
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setShowResetConfirm(false)}
          title="Reset Today's Attendance?"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to clear all marked attendance records for{' '}
              <strong>{activeActivity?.name}</strong> on{' '}
              <strong>{formatDateSafe(selectedDate)}</strong>?
            </p>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>You will still be able to Undo this action immediately from the toast.</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (activeActivity) {
                    resetTodayAttendance(activeActivity.id, selectedDate);
                  }
                  setShowResetConfirm(false);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Yes, Reset Attendance
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
