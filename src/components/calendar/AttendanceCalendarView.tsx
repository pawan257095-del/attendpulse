import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Sun,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';
import { calculateDailySummary, calculateMemberStats } from '../../utils/attendanceCalc';
import {
  formatDateSafe,
  getTodayDateString,
  isDateWorkingDay,
  getMonthStartAndEnd,
  getDaysInRange,
} from '../../utils/dateUtils';
import { format, getDay, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths } from 'date-fns';

interface AttendanceCalendarViewProps {
  onNavigateToDate: (dateStr: string) => void;
}

export const AttendanceCalendarView: React.FC<AttendanceCalendarViewProps> = ({ onNavigateToDate }) => {
  const {
    activities,
    members,
    attendance,
    holidays,
    selectedActivityId,
    selectedDate,
    setSelectedDate,
  } = useAttendance();

  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
  const [calendarViewMode, setCalendarViewMode] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('ALL');

  const activeActivity = activities.find(a => a.id === selectedActivityId) || activities[0];
  const today = getTodayDateString();

  const activityMembers = useMemo(() => {
    if (!activeActivity) return [];
    return members.filter(m => m.activityId === activeActivity.id && m.isActive);
  }, [activeActivity, members]);

  // Navigate months
  const handlePrev = () => {
    setCurrentMonthDate(prev => subMonths(prev, 1));
  };
  const handleNext = () => {
    setCurrentMonthDate(prev => addMonths(prev, 1));
  };
  const handleGoToday = () => {
    setCurrentMonthDate(new Date());
    setSelectedDate(today);
  };

  // Generate calendar days for the monthly grid (with leading/trailing padding days)
  const calendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const start = startOfWeek(firstDayOfMonth, { weekStartsOn: 1 }); // Monday start
    const end = endOfWeek(lastDayOfMonth, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start, end });

    return days.map(d => {
      const yearStr = d.getFullYear();
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      const dateString = `${yearStr}-${monthStr}-${dayStr}`;

      const isCurrentMonth = d.getMonth() === month;
      const isWorking = activeActivity ? isDateWorkingDay(dateString, activeActivity.workingDays) : true;
      const isToday = dateString === today;
      const isSelected = dateString === selectedDate;

      // Summary for this day
      const summary = activeActivity
        ? calculateDailySummary(dateString, activeActivity, activityMembers, attendance, holidays)
        : null;

      // Single member status if filtered
      let memberStatus: string | null = null;
      if (selectedMemberFilter !== 'ALL' && activeActivity) {
        const rec = attendance.find(
          r => r.activityId === activeActivity.id && r.memberId === selectedMemberFilter && r.date === dateString
        );
        memberStatus = rec ? rec.status : 'UNMARKED';
      }

      return {
        date: d,
        dateString,
        dayNumber: d.getDate(),
        isCurrentMonth,
        isWorking,
        isToday,
        isSelected,
        summary,
        memberStatus,
      };
    });
  }, [currentMonthDate, activeActivity, activityMembers, attendance, holidays, today, selectedDate, selectedMemberFilter]);

  // Selected date details
  const selectedDaySummary = useMemo(() => {
    if (!activeActivity) return null;
    return calculateDailySummary(selectedDate, activeActivity, activityMembers, attendance, holidays);
  }, [selectedDate, activeActivity, activityMembers, attendance, holidays]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Controls & Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-700/80 p-1 rounded-xl">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 transition"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-bold text-sm sm:text-base text-slate-900 dark:text-white min-w-[130px] text-center">
              {format(currentMonthDate, 'MMMM yyyy')}
            </span>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 transition"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleGoToday}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            Today
          </button>
        </div>

        {/* Member filter & View Mode */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Member Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/80 px-2.5 py-1.5 rounded-xl">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedMemberFilter}
              onChange={(e) => setSelectedMemberFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 border-0 focus:ring-0 cursor-pointer"
            >
              <option value="ALL">All Members (Aggregated)</option>
              {activityMembers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.memberCode})
                </option>
              ))}
            </select>
          </div>

          {/* Legend helper button */}
          <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 pl-2">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Present</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Absent</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Half Day</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Holiday</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> OT</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-6 shadow-xs">
        {/* Day of Week Headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center pb-3 border-b border-slate-100 dark:border-slate-700/60 font-bold text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span className="text-indigo-600 dark:text-indigo-400">Sat</span>
          <span className="text-rose-500 dark:text-rose-400">Sun</span>
        </div>

        {/* Calendar Days Cells */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mt-2">
          {calendarDays.map((item, idx) => {
            const hasData = item.summary && (item.summary.presentCount > 0 || item.summary.absentCount > 0 || item.summary.halfDayCount > 0);

            return (
              <div
                key={idx}
                onClick={() => {
                  setSelectedDate(item.dateString);
                }}
                className={`min-h-[70px] sm:min-h-[96px] p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                  item.isSelected
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-500/40'
                    : item.isToday
                    ? 'border-amber-400 bg-amber-50/30 dark:bg-amber-950/20'
                    : item.isCurrentMonth
                    ? 'border-slate-100 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
                    : 'border-transparent opacity-40 bg-transparent'
                }`}
              >
                {/* Top: Day Number & Holiday indicator */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs sm:text-sm font-bold ${
                      item.isToday
                        ? 'flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white'
                        : item.isSelected
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.dayNumber}
                  </span>

                  {!item.isWorking && (
                    <span className="text-[9px] font-bold text-slate-400 uppercase">OFF</span>
                  )}
                </div>

                {/* Center / Bottom: Attendance Indicators */}
                <div className="mt-1">
                  {selectedMemberFilter === 'ALL' ? (
                    // Aggregated Daily Indicators
                    item.summary && hasData ? (
                      <div className="space-y-1">
                        <div className="hidden sm:flex items-center justify-between text-[10px] font-bold">
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {item.summary.presentCount}P
                          </span>
                          {item.summary.absentCount > 0 && (
                            <span className="text-rose-600 dark:text-rose-400">
                              {item.summary.absentCount}A
                            </span>
                          )}
                          {item.summary.halfDayCount > 0 && (
                            <span className="text-amber-600 dark:text-amber-400">
                              {item.summary.halfDayCount}HD
                            </span>
                          )}
                        </div>
                        {/* Mini progress bar on day */}
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 sm:h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${item.summary.percentage}%` }}
                          />
                        </div>
                      </div>
                    ) : item.isWorking && item.isCurrentMonth ? (
                      <span className="text-[9px] text-slate-400 hidden sm:inline">No records</span>
                    ) : null
                  ) : (
                    // Individual Member Status Badge
                    item.memberStatus && (
                      <div className="flex items-center justify-center">
                        {item.memberStatus === 'PRESENT' && (
                          <span className="w-full text-center py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                            PRESENT
                          </span>
                        )}
                        {item.memberStatus === 'ABSENT' && (
                          <span className="w-full text-center py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                            ABSENT
                          </span>
                        )}
                        {item.memberStatus === 'HALF_DAY' && (
                          <span className="w-full text-center py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                            HALF DAY
                          </span>
                        )}
                        {item.memberStatus === 'OVERTIME' && (
                          <span className="w-full text-center py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-bold">
                            OVERTIME
                          </span>
                        )}
                        {item.memberStatus === 'HOLIDAY' && (
                          <span className="w-full text-center py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                            HOLIDAY
                          </span>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Register Drawer / Details Box */}
      {selectedDaySummary && (
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Selected Date Register
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {activeActivity?.name}
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {formatDateSafe(selectedDate, 'EEEE, dd MMMM yyyy')}
            </h3>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-semibold">
              <span className="text-emerald-600 dark:text-emerald-400">
                {selectedDaySummary.presentCount} Present
              </span>
              <span className="text-rose-600 dark:text-rose-400">
                {selectedDaySummary.absentCount} Absent
              </span>
              <span className="text-amber-600 dark:text-amber-400">
                {selectedDaySummary.halfDayCount} Half Day
              </span>
              <span className="text-purple-600 dark:text-purple-400">
                {selectedDaySummary.overtimeCount} Overtime ({selectedDaySummary.totalOvertimeHours}h)
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {selectedDaySummary.unmarkedCount} Unmarked
              </span>
            </div>
          </div>

          <button
            onClick={() => onNavigateToDate(selectedDate)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/30 active:scale-95 transition"
          >
            <span>Open & Mark Attendance</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
