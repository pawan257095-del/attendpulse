import React, { useState } from 'react';
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  Sun,
  Moon,
  Coffee,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';
import { Shift } from '../../types';
import { Modal } from '../common/Modal';
import { calculateShiftDurationHours, formatTimeSafe } from '../../utils/dateUtils';

export const ShiftsView: React.FC = () => {
  const { shifts, members, activities, addOrUpdateShift, removeShift } = useAttendance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [fallbackShiftId, setFallbackShiftId] = useState<string>('');

  // Form State
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakMinutes, setBreakMinutes] = useState('60');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Computed hours
  const calculatedHours = calculateShiftDurationHours(
    startTime,
    endTime,
    parseInt(breakMinutes, 10) || 0
  );

  const isOvernight = startTime && endTime && endTime < startTime;

  const handleOpenCreate = () => {
    setEditingShift(null);
    setName('');
    setStartTime('09:00');
    setEndTime('17:00');
    setBreakMinutes('60');
    setDescription('');
    setIsDefault(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Shift) => {
    setEditingShift(s);
    setName(s.name);
    setStartTime(s.startTime);
    setEndTime(s.endTime);
    setBreakMinutes(String(s.breakMinutes || 0));
    setDescription(s.description || '');
    setIsDefault(!!s.isDefault);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (shiftId: string) => {
    setDeleteConfirmId(shiftId);
    // Find a fallback shift that is not the one being deleted
    const other = shifts.find(s => s.id !== shiftId);
    setFallbackShiftId(other ? other.id : '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const bMins = parseInt(breakMinutes, 10) || 0;
    const workingHours = calculateShiftDurationHours(startTime, endTime, bMins);

    const shiftObj: Shift = {
      id: editingShift ? editingShift.id : `shift_${Date.now()}`,
      name: name.trim(),
      startTime,
      endTime,
      breakMinutes: bMins,
      totalWorkingHours: workingHours,
      description: description.trim() || undefined,
      isDefault,
    };

    await addOrUpdateShift(shiftObj);
    setIsModalOpen(false);
  };

  const toDeleteShift = shifts.find(s => s.id === deleteConfirmId);
  const remainingShifts = shifts.filter(s => s.id !== deleteConfirmId);

  // Check how many members or activities reference this shift
  const referencedMembersCount = members.filter(m => m.assignedShiftId === deleteConfirmId).length;
  const referencedActivitiesCount = activities.filter(a => a.defaultShiftId === deleteConfirmId).length;
  const isReferenced = referencedMembersCount > 0 || referencedActivitiesCount > 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Shift Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure working hours, break durations, and overnight shifts with safe reassignment protection.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Shift</span>
        </button>
      </div>

      {/* Shifts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shifts.map((shift) => {
          const shiftOvernight = shift.endTime < shift.startTime;

          return (
            <div
              key={shift.id}
              className="rounded-2xl bg-white dark:bg-slate-800 p-5 border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-600 transition"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                      {shiftOvernight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                          {shift.name}
                        </h3>
                        {shift.isDefault && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            Default
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatTimeSafe(shift.startTime)} – {formatTimeSafe(shift.endTime)}
                        {shiftOvernight && ' (+1 day overnight)'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(shift)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                      title="Edit Shift"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenDelete(shift.id)}
                      disabled={shifts.length <= 1}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30 transition"
                      title="Delete Shift"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {shift.description && (
                  <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                    {shift.description}
                  </p>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Working: <strong>{shift.totalWorkingHours} hrs</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Coffee className="w-3.5 h-3.5 text-amber-500" />
                    <span>Break: <strong>{shift.breakMinutes} mins</strong></span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Shift Modal */}
      {isModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          title={editingShift ? 'Edit Shift' : 'Create Custom Shift'}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Shift Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Morning Shift, Split Shift"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Start Time *
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  End Time *
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
                />
              </div>
            </div>

            {isOvernight && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-xs text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                <Moon className="w-4 h-4 shrink-0" />
                <span>Overnight shift detected: ends on the following calendar day.</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Break Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="240"
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Calculated Net Hours
                </label>
                <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-sm font-black text-indigo-600 dark:text-indigo-400">
                  {calculatedHours} hours
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Standard day timing for engineering team"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="shift-def"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="shift-def" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Set as default shift for new members
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
                {editingShift ? 'Save Changes' : 'Create Shift'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Safe Delete Confirmation with Fallback Reassignment */}
      {deleteConfirmId && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirmId(null)}
          title="Delete Shift?"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to delete shift <strong>{toDeleteShift?.name}</strong>?
            </p>

            {isReferenced && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Shift is currently in use!</span>
                </div>
                <p>
                  This shift is currently assigned to <strong>{referencedMembersCount} members</strong> and set as default for <strong>{referencedActivitiesCount} activities</strong>.
                  Please select a safe fallback shift to reassign them to:
                </p>

                <div>
                  <label className="block font-bold mb-1">
                    Reassign referenced members & activities to:
                  </label>
                  <select
                    value={fallbackShiftId}
                    onChange={(e) => setFallbackShiftId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {remainingShifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.startTime} – {s.endTime})
                      </option>
                    ))}
                  </select>
                </div>
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
                onClick={async () => {
                  await removeShift(deleteConfirmId, fallbackShiftId);
                  setDeleteConfirmId(null);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Confirm Delete & Reassign
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
