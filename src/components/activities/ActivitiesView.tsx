import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Users,
  Calendar,
  Clock,
  Briefcase,
  AlertTriangle,
  FolderPlus,
  Sparkles,
  Palmtree,
  Globe,
} from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';
import { Activity, Holiday } from '../../types';
import { Modal } from '../common/Modal';
import { getTodayDateString, formatDateSafe } from '../../utils/dateUtils';

export const ActivitiesView: React.FC = () => {
  const {
    activities,
    members,
    shifts,
    holidays,
    addOrUpdateActivity,
    removeActivity,
    addOrUpdateHoliday,
    removeHoliday,
    selectedActivityId,
    setSelectedActivityId,
  } = useAttendance();

  const [activeTab, setActiveTab] = useState<'activities' | 'holidays'>('activities');

  // Activity Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Activity Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#4f46e5');
  const [icon, setIcon] = useState('briefcase');
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [endDate, setEndDate] = useState('');
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [defaultShiftId, setDefaultShiftId] = useState('');
  const [workingHours, setWorkingHours] = useState('8');
  const [isActive, setIsActive] = useState(true);

  // Holiday Modal State
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [holidayDate, setHolidayDate] = useState(getTodayDateString());
  const [holidayName, setHolidayName] = useState('');
  const [holidayActivityId, setHolidayActivityId] = useState('ALL');
  const [deleteHolidayId, setDeleteHolidayId] = useState<string | null>(null);

  const colors = [
    '#4f46e5', // Indigo
    '#059669', // Emerald
    '#e11d48', // Rose
    '#d97706', // Amber
    '#0284c7', // Sky
    '#7c3aed', // Purple
    '#0d9488', // Teal
    '#dc2626', // Red
  ];

  const daysOfWeek = [
    { day: 1, label: 'Mon' },
    { day: 2, label: 'Tue' },
    { day: 3, label: 'Wed' },
    { day: 4, label: 'Thu' },
    { day: 5, label: 'Fri' },
    { day: 6, label: 'Sat' },
    { day: 0, label: 'Sun' },
  ];

  const handleOpenCreate = () => {
    setEditingActivity(null);
    setName('');
    setDescription('');
    setColor('#4f46e5');
    setIcon('briefcase');
    setStartDate(getTodayDateString());
    setEndDate('');
    setWorkingDays([1, 2, 3, 4, 5]);
    setDefaultShiftId(shifts[0]?.id || '');
    setWorkingHours('8');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (act: Activity) => {
    setEditingActivity(act);
    setName(act.name);
    setDescription(act.description || '');
    setColor(act.color);
    setIcon(act.icon);
    setStartDate(act.startDate);
    setEndDate(act.endDate || '');
    setWorkingDays(act.workingDays || [1, 2, 3, 4, 5]);
    setDefaultShiftId(act.defaultShiftId || shifts[0]?.id || '');
    setWorkingHours(String(act.workingHours || 8));
    setIsActive(act.isActive);
    setIsModalOpen(true);
  };

  const handleToggleDay = (day: number) => {
    if (workingDays.includes(day)) {
      if (workingDays.length > 1) {
        setWorkingDays(workingDays.filter(d => d !== day));
      }
    } else {
      setWorkingDays([...workingDays, day].sort());
    }
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const act: Activity = {
      id: editingActivity ? editingActivity.id : `act_${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      color,
      icon,
      startDate,
      endDate: endDate ? endDate : undefined,
      workingDays,
      defaultShiftId,
      workingHours: parseFloat(workingHours) || 8,
      isActive,
      createdAt: editingActivity ? editingActivity.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await addOrUpdateActivity(act);
    setIsModalOpen(false);
  };

  // Holiday handlers
  const handleOpenCreateHoliday = () => {
    setEditingHoliday(null);
    setHolidayDate(getTodayDateString());
    setHolidayName('');
    setHolidayActivityId(selectedActivityId || 'ALL');
    setIsHolidayModalOpen(true);
  };

  const handleOpenEditHoliday = (h: Holiday) => {
    setEditingHoliday(h);
    setHolidayDate(h.date);
    setHolidayName(h.name);
    setHolidayActivityId(h.activityId);
    setIsHolidayModalOpen(true);
  };

  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayName.trim() || !holidayDate) return;

    const hol: Holiday = {
      id: editingHoliday ? editingHoliday.id : `hol_${Date.now()}`,
      date: holidayDate,
      name: holidayName.trim(),
      activityId: holidayActivityId,
    };

    await addOrUpdateHoliday(hol);
    setIsHolidayModalOpen(false);
  };

  const toDeleteActivity = activities.find(a => a.id === deleteConfirmId);
  const toDeleteMembersCount = members.filter(m => m.activityId === deleteConfirmId).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Activities & Holiday Calendar
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure independent registers, working schedules, and global or activity-specific holidays.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab buttons */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('activities')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'activities'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Activities ({activities.length})
            </button>
            <button
              onClick={() => setActiveTab('holidays')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'holidays'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Holidays ({holidays.length})
            </button>
          </div>

          {activeTab === 'activities' ? (
            <button
              onClick={handleOpenCreate}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Activity</span>
            </button>
          ) : (
            <button
              onClick={handleOpenCreateHoliday}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Holiday</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'activities' ? (
        <>
          {activities.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-800/80 p-12 text-center border border-dashed border-slate-300 dark:border-slate-700 max-w-lg mx-auto">
              <FolderPlus className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">No Activities Created Yet</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                Every attendance register belongs to an activity. Create your first activity to start a register.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
                <button
                  onClick={handleOpenCreate}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition"
                >
                  Create New Activity
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activities.map((act) => {
                const actMembers = members.filter(m => m.activityId === act.id);
                const isSelected = act.id === selectedActivityId;

                return (
                  <div
                    key={act.id}
                    className={`rounded-2xl bg-white dark:bg-slate-800 p-5 border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 shadow-lg shadow-indigo-600/10 ring-2 ring-indigo-500/30'
                        : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md"
                            style={{ backgroundColor: act.color }}
                          >
                            <Briefcase className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                              {act.name}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  act.isActive
                                    ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                }`}
                              >
                                {act.isActive ? 'Active' : 'Archived'}
                              </span>
                              {isSelected && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                                  Current
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(act)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                            title="Edit Activity"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(act.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            title="Delete Activity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {act.description && (
                        <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                          {act.description}
                        </p>
                      )}

                      {/* Details list */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400" /> Members
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {actMembers.length} enrolled
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Working Days
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {act.workingDays.length} days/week
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" /> Shift Hours
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {act.workingHours} hrs/day
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                      <button
                        onClick={() => setSelectedActivityId(act.id)}
                        disabled={isSelected}
                        className={`w-full py-2 rounded-xl text-xs font-bold transition ${
                          isSelected
                            ? 'bg-slate-100 dark:bg-slate-700/60 text-slate-400 cursor-default'
                            : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                        }`}
                      >
                        {isSelected ? 'Currently Selected' : 'Switch to this Activity'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Holiday Management Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Registered Holidays
            </h3>
            <span className="text-xs text-slate-500">
              Holidays automatically exclude working days from expected attendance quotas.
            </span>
          </div>

          {holidays.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-800/80 p-12 text-center border border-dashed border-slate-300 dark:border-slate-700">
              <Palmtree className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-900 dark:text-white">No Holidays Scheduled</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Add global or activity-specific holidays to exclude them from expected working days.
              </p>
              <button
                onClick={handleOpenCreateHoliday}
                className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                Add First Holiday
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {holidays.map((h) => {
                const isGlobal = h.activityId === 'ALL';
                const actName = activities.find(a => a.id === h.activityId)?.name || 'Custom Activity';

                return (
                  <div
                    key={h.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{h.name}</span>
                        {isGlobal ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 flex items-center gap-1">
                            <Globe className="w-2.5 h-2.5" /> Global
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                            {actName}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDateSafe(h.date, 'EEEE, dd MMMM yyyy')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditHoliday(h)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteHolidayId(h.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Activity Add/Edit Modal */}
      {isModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          title={editingActivity ? 'Edit Activity' : 'Create New Activity'}
          maxWidth="lg"
        >
          <form onSubmit={handleSaveActivity} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Activity Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Head Office, Physics Lab, Gym Morning"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Details regarding attendance policy or location..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              />
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                Theme Color
              </label>
              <div className="flex flex-wrap gap-2.5">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-xl transition ${
                      color === c ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Working Days */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                Working Days
              </label>
              <div className="flex flex-wrap gap-1.5">
                {daysOfWeek.map((d) => {
                  const isChecked = workingDays.includes(d.day);
                  return (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => handleToggleDay(d.day)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        isChecked
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shift & Hours */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Default Shift
                </label>
                <select
                  value={defaultShiftId}
                  onChange={(e) => setDefaultShiftId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime} – {s.endTime})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Working Hours / Day
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="act-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="act-active" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Activity is Active
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
              >
                {editingActivity ? 'Save Changes' : 'Create Activity'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Holiday Add / Edit Modal */}
      {isHolidayModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsHolidayModalOpen(false)}
          title={editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
        >
          <form onSubmit={handleSaveHoliday} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Holiday Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Labor Day, Company Annual Day"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Holiday Date *
              </label>
              <input
                type="date"
                required
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Scope / Activity
              </label>
              <select
                value={holidayActivityId}
                onChange={(e) => setHolidayActivityId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
              >
                <option value="ALL">All Activities (Global Holiday)</option>
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} Only
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsHolidayModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
              >
                {editingHoliday ? 'Save Changes' : 'Add Holiday'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Holiday Delete Confirmation */}
      {deleteHolidayId && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteHolidayId(null)}
          title="Delete Holiday?"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to remove this holiday? It will be restored to an ordinary working day if scheduled on a working weekday.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteHolidayId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  removeHoliday(deleteHolidayId);
                  setDeleteHolidayId(null);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Remove Holiday
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirmId(null)}
          title="Delete Activity?"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to delete <strong>{toDeleteActivity?.name}</strong>?
            </p>
            {toDeleteMembersCount > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
                <span>
                  <strong>Warning:</strong> Deleting this activity will also permanently delete its{' '}
                  <strong>{toDeleteMembersCount} registered members</strong> and all associated historical
                  attendance records!
                </span>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  removeActivity(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
