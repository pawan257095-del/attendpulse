import React, { useMemo } from 'react';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Sun,
  Flame,
  ArrowRight,
  PlusCircle,
  Calendar,
  FileBarChart2,
  TrendingUp,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useAttendance } from '../../context/AttendanceContext';
import { calculateDailySummary, calculateMemberStats } from '../../utils/attendanceCalc';
import { getTodayDateString, shiftDateByDays, formatDateSafe } from '../../utils/dateUtils';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const {
    activities,
    members,
    attendance,
    holidays,
    selectedActivityId,
    setSelectedActivityId,
    selectedDate,
    setSelectedDate,
  } = useAttendance();

  const today = getTodayDateString();
  const currentActivity = activities.find(a => a.id === selectedActivityId) || activities[0];

  // Calculate today's summary for current activity
  const todaySummary = useMemo(() => {
    if (!currentActivity) {
      return {
        date: today,
        activityId: '',
        totalMembers: 0,
        presentCount: 0,
        absentCount: 0,
        halfDayCount: 0,
        holidayCount: 0,
        overtimeCount: 0,
        unmarkedCount: 0,
        totalOvertimeHours: 0,
        expectedMembers: 0,
        effectivePresentCount: 0,
        percentage: 0,
        isWeeklyOff: false,
        isHoliday: false,
      };
    }
    return calculateDailySummary(today, currentActivity, members, attendance, holidays);
  }, [today, currentActivity, members, attendance, holidays]);

  // Overall & Monthly stats for members in current activity
  const monthlyStats = useMemo(() => {
    if (!currentActivity) return { percentage: 0, present: 0, absent: 0, halfDay: 0, holidays: 0, overtimeHours: 0 };
    const activeMembers = members.filter(m => m.activityId === currentActivity.id && m.isActive);
    const startOfMonth = `${today.slice(0, 7)}-01`;
    let totalPresent = 0;
    let totalHalfDay = 0;
    let totalAbsent = 0;
    let totalHols = 0;
    let totalOTHours = 0;
    let totalExpected = 0;

    activeMembers.forEach(m => {
      const stats = calculateMemberStats(m, currentActivity, startOfMonth, today, attendance, holidays);
      totalPresent += stats.presentDays;
      totalHalfDay += stats.halfDays;
      totalAbsent += stats.absentDays;
      totalHols += stats.holidays;
      totalOTHours += stats.totalOvertimeHours;
      totalExpected += stats.expectedWorkingDays;
    });

    const effective = totalPresent + totalHalfDay * 0.5;
    const pct = totalExpected > 0 ? Math.min(100, Number(((effective / totalExpected) * 100).toFixed(1))) : 100;

    return {
      percentage: pct,
      present: totalPresent,
      absent: totalAbsent,
      halfDay: totalHalfDay,
      holidays: totalHols,
      overtimeHours: totalOTHours,
    };
  }, [currentActivity, today, members, attendance, holidays]);

  // 14-day Attendance Trend Data for chart
  const trendData = useMemo(() => {
    if (!currentActivity) return [];
    const points = [];
    for (let i = 13; i >= 0; i--) {
      const d = shiftDateByDays(today, -i);
      const sum = calculateDailySummary(d, currentActivity, members, attendance, holidays);
      points.push({
        date: formatDateSafe(d, 'dd MMM'),
        fullDate: d,
        present: sum.presentCount,
        absent: sum.absentCount,
        halfDay: sum.halfDayCount,
        percentage: sum.percentage,
      });
    }
    return points;
  }, [today, currentActivity, members, attendance, holidays]);

  // Activity-wise comparison data
  const activityComparisonData = useMemo(() => {
    return activities.map(act => {
      const sum = calculateDailySummary(today, act, members, attendance, holidays);
      return {
        name: act.name.length > 14 ? act.name.slice(0, 12) + '...' : act.name,
        percentage: sum.percentage,
        members: sum.totalMembers,
        present: sum.presentCount,
      };
    });
  }, [activities, today, members, attendance, holidays]);

  // Pie chart breakdown data for today
  const pieData = [
    { name: 'Present', value: todaySummary.presentCount, color: '#10b981' },
    { name: 'Absent', value: todaySummary.absentCount, color: '#ef4444' },
    { name: 'Half Day', value: todaySummary.halfDayCount, color: '#f59e0b' },
    { name: 'Holiday', value: todaySummary.holidayCount, color: '#3b82f6' },
    { name: 'Unmarked', value: todaySummary.unmarkedCount, color: '#94a3b8' },
  ].filter(item => item.value > 0);

  const totalRegisteredMembers = members.filter(m => m.isActive).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Empty State Banner if no activities exist */}
      {activities.length === 0 && (
        <div className="rounded-3xl bg-white dark:bg-slate-800 p-8 border border-dashed border-indigo-200 dark:border-indigo-900 text-center max-w-2xl mx-auto shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Welcome to AttendPulse</h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Your private, offline-first attendance register is ready. Create your first activity to get started.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
            <button
              onClick={() => onNavigate('activities')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition"
            >
              Create First Activity
            </button>
          </div>
        </div>
      )}

      {/* Incomplete Attendance Alert Banner */}
      {activities.length > 0 && todaySummary.unmarkedCount > 0 && !todaySummary.isWeeklyOff && !todaySummary.isHoliday && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-300 text-xs shadow-xs">
          <div className="flex items-center gap-2.5 font-bold">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Attendance Incomplete: {todaySummary.unmarkedCount} of {todaySummary.totalMembers} active members have not been marked yet for today ({currentActivity?.name}).
            </span>
          </div>
          <button
            onClick={() => {
              setSelectedDate(today);
              onNavigate('attendance');
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 transition"
          >
            Mark Now
          </button>
        </div>
      )}

      {/* 7 Summary Cards as requested in Section 3 */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Key Attendance Summary
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
          {/* Card 1: Total Activities */}
          <div
            onClick={() => onNavigate('activities')}
            className="group cursor-pointer rounded-2xl bg-white dark:bg-slate-800/90 p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-500 transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Activities</span>
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              {activities.length}
            </div>
            <div className="mt-1 flex items-center text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-0.5 transition">
              <span>Manage</span> <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          {/* Card 2: Total Registered Members */}
          <div
            onClick={() => onNavigate('members')}
            className="group cursor-pointer rounded-2xl bg-white dark:bg-slate-800/90 p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-500 transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Members</span>
              <div className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              {totalRegisteredMembers}
            </div>
            <div className="mt-1 flex items-center text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold group-hover:translate-x-0.5 transition">
              <span>View list</span> <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          {/* Card 3: Today's Present */}
          <div className="rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 p-4 border border-emerald-200/60 dark:border-emerald-800/60 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Present</span>
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-900 dark:text-emerald-200">
              {todaySummary.presentCount}
            </div>
            <div className="mt-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
              Full day attendance
            </div>
          </div>

          {/* Card 4: Today's Absent */}
          <div className="rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 p-4 border border-rose-200/60 dark:border-rose-800/60 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase">Absent</span>
              <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-rose-900 dark:text-rose-200">
              {todaySummary.absentCount}
            </div>
            <div className="mt-1 text-[10px] text-rose-700 dark:text-rose-400 font-medium">
              Reported absent
            </div>
          </div>

          {/* Card 5: Today's Half Day */}
          <div className="rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 p-4 border border-amber-200/60 dark:border-amber-800/60 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase">Half Day</span>
              <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-amber-900 dark:text-amber-200">
              {todaySummary.halfDayCount}
            </div>
            <div className="mt-1 text-[10px] text-amber-700 dark:text-amber-400 font-medium">
              0.5 day credit
            </div>
          </div>

          {/* Card 6: Today's Holidays */}
          <div className="rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 p-4 border border-blue-200/60 dark:border-blue-800/60 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase">Holidays</span>
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400">
                <Sun className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-blue-900 dark:text-blue-200">
              {todaySummary.holidayCount}
            </div>
            <div className="mt-1 text-[10px] text-blue-700 dark:text-blue-400 font-medium">
              Exempt from calc
            </div>
          </div>

          {/* Card 7: Today's Overtime */}
          <div className="rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 p-4 border border-purple-200/60 dark:border-purple-800/60 shadow-xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 uppercase">Overtime</span>
              <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-purple-900 dark:text-purple-200">
              {todaySummary.overtimeCount}
            </div>
            <div className="mt-1 text-[10px] text-purple-700 dark:text-purple-400 font-medium">
              {todaySummary.totalOvertimeHours} hrs total
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Overview Progress Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-5 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Today's Attendance Rate</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              {todaySummary.effectivePresentCount} / {todaySummary.expectedMembers} Present
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {todaySummary.percentage}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">effective</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${todaySummary.percentage}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-800 p-5 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Monthly Attendance Rate</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400">
              This Month
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {monthlyStats.percentage}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">cumulative</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${monthlyStats.percentage}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-800 p-5 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Month Overtime Logged</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              Hours
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-purple-600 dark:text-purple-400">
              {monthlyStats.overtimeHours} hrs
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">across activity</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span>Present days: {monthlyStats.present}</span>
            <span>Half days: {monthlyStats.halfDay}</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend (Line Chart) */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-5 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">14-Day Attendance Trend</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Daily attendance percentage over past two weeks</p>
            </div>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  name="Attendance %"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#4f46e5' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Present vs Absent vs Half Day (Pie Chart) */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-5 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Today's Distribution</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Breakdown of member attendance today</p>
            </div>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-sm text-slate-400 py-12">
                No attendance marked yet today.
              </div>
            )}
          </div>
        </div>

        {/* Activity-wise Comparison (Bar Chart) */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-5 border border-slate-200 dark:border-slate-700 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Activity-wise Comparison</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Today's attendance percentage across all registered activities</p>
            </div>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityComparisonData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="percentage" name="Attendance %" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Action Cards Bar */}
      <div className="rounded-2xl bg-slate-100 dark:bg-slate-800/60 p-5 border border-slate-200 dark:border-slate-700">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Quick Navigation & Actions
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => {
              setSelectedDate(today);
              onNavigate('attendance');
            }}
            className="flex flex-col items-start p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition text-left group"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2 group-hover:scale-110 transition" />
            <span className="text-sm font-bold text-slate-900 dark:text-white">Take Attendance</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">One-tap register</span>
          </button>

          <button
            onClick={() => onNavigate('activities')}
            className="flex flex-col items-start p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition text-left group"
          >
            <PlusCircle className="w-5 h-5 text-indigo-500 mb-2 group-hover:scale-110 transition" />
            <span className="text-sm font-bold text-slate-900 dark:text-white">New Activity</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Add office, class, gym</span>
          </button>

          <button
            onClick={() => onNavigate('members')}
            className="flex flex-col items-start p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition text-left group"
          >
            <Users className="w-5 h-5 text-cyan-500 mb-2 group-hover:scale-110 transition" />
            <span className="text-sm font-bold text-slate-900 dark:text-white">Add Member</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Manage people & shifts</span>
          </button>

          <button
            onClick={() => onNavigate('calendar')}
            className="flex flex-col items-start p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition text-left group"
          >
            <Calendar className="w-5 h-5 text-amber-500 mb-2 group-hover:scale-110 transition" />
            <span className="text-sm font-bold text-slate-900 dark:text-white">Calendar History</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">View past records</span>
          </button>
        </div>
      </div>
    </div>
  );
};
