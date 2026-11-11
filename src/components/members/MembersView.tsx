import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Download,
  Upload,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Calendar,
  Clock,
  ArrowUpDown,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Flame,
  UserX,
} from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';
import { Member } from '../../types';
import { Modal } from '../common/Modal';
import { getTodayDateString, formatDateSafe } from '../../utils/dateUtils';
import { calculateMemberStats } from '../../utils/attendanceCalc';
import {
  exportMembersCsv,
  downloadCsvFile,
  generateMemberTemplateCsv,
  parseMembersCsv,
} from '../../utils/exportCsv';

export const MembersView: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
  const {
    activities,
    members,
    attendance,
    holidays,
    shifts,
    selectedActivityId,
    addOrUpdateMember,
    removeMember,
    importMembersBulk,
  } = useAttendance();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [sortOrder, setSortOrder] = useState<'name_asc' | 'name_desc' | 'code_asc'>('name_asc');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showActivityPrompt, setShowActivityPrompt] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<Partial<Member>[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [memberCode, setMemberCode] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [joiningDate, setJoiningDate] = useState(getTodayDateString());
  const [leavingDate, setLeavingDate] = useState('');
  const [assignedShiftId, setAssignedShiftId] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  const activeActivity = activities.find(a => a.id === selectedActivityId) || activities[0];
  const shiftMap = useMemo(() => new Map(shifts.map(s => [s.id, s.name])), [shifts]);
  const today = getTodayDateString();

  // Current activity members
  const currentMembers = useMemo(() => {
    if (!activeActivity) return [];
    return members.filter(m => m.activityId === activeActivity.id);
  }, [activeActivity, members]);

  // Compute stats (including streaks) for each member
  const memberStatsMap = useMemo(() => {
    const map = new Map();
    if (!activeActivity) return map;
    currentMembers.forEach(m => {
      const stats = calculateMemberStats(
        m,
        activeActivity,
        m.joiningDate || '2026-01-01',
        today,
        attendance,
        holidays
      );
      map.set(m.id, stats);
    });
    return map;
  }, [currentMembers, activeActivity, today, attendance, holidays]);

  // Filtered & Sorted members
  const displayedMembers = useMemo(() => {
    return currentMembers
      .filter(m => {
        // Search
        const match =
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.memberCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.mobile && m.mobile.includes(searchQuery)) ||
          (m.email && m.email.toLowerCase().includes(searchQuery.toLowerCase()));
        if (!match) return false;

        // Active/inactive
        if (activeFilter === 'active') return m.isActive;
        if (activeFilter === 'inactive') return !m.isActive;
        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'name_asc') return a.name.localeCompare(b.name);
        if (sortOrder === 'name_desc') return b.name.localeCompare(a.name);
        if (sortOrder === 'code_asc') return a.memberCode.localeCompare(b.memberCode);
        return 0;
      });
  }, [currentMembers, searchQuery, activeFilter, sortOrder]);

  const handleOpenCreate = () => {
    if (!activeActivity) {
      setShowActivityPrompt(true);
      return;
    }
    setEditingMember(null);
    setName('');
    const nextCode = `MEM-${String(currentMembers.length + 1).padStart(2, '0')}`;
    setMemberCode(nextCode);
    setMobile('');
    setEmail('');
    setJoiningDate(getTodayDateString());
    setLeavingDate('');
    setAssignedShiftId(activeActivity?.defaultShiftId || shifts[0]?.id || '');
    setNotes('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: Member) => {
    setEditingMember(m);
    setName(m.name);
    setMemberCode(m.memberCode);
    setMobile(m.mobile || '');
    setEmail(m.email || '');
    setJoiningDate(m.joiningDate);
    setLeavingDate(m.leavingDate || '');
    setAssignedShiftId(m.assignedShiftId || shifts[0]?.id || '');
    setNotes(m.notes || '');
    setIsActive(m.isActive);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !activeActivity) return;

    const mem: Member = {
      id: editingMember ? editingMember.id : `mem_${Date.now()}`,
      activityId: activeActivity.id,
      name: name.trim(),
      memberCode: memberCode.trim() || `MEM-${Date.now().toString().slice(-4)}`,
      mobile: mobile.trim() || undefined,
      email: email.trim() || undefined,
      joiningDate,
      leavingDate: leavingDate.trim() || undefined,
      assignedShiftId: assignedShiftId || undefined,
      notes: notes.trim() || undefined,
      isActive,
      createdAt: editingMember ? editingMember.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await addOrUpdateMember(mem);
    setIsModalOpen(false);
  };

  // CSV Export
  const handleExportCsv = () => {
    if (!activeActivity) return;
    const csv = exportMembersCsv(activeActivity.name, currentMembers);
    downloadCsvFile(csv, `${activeActivity.name.replace(/\s+/g, '_')}_Members.csv`);
  };

  const handleDownloadTemplate = () => {
    const template = generateMemberTemplateCsv();
    downloadCsvFile(template, 'members_import_template.csv');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseMembersCsv(text);
      setImportPreview(parsed);
    };
    reader.readAsText(file);
  };

  // Duplicates check
  const duplicateCodes = useMemo(() => {
    const existing = new Set(currentMembers.map(m => m.memberCode.toLowerCase()));
    return importPreview.filter(p => p.memberCode && existing.has(p.memberCode.toLowerCase()));
  }, [importPreview, currentMembers]);

  const handleConfirmImport = async () => {
    if (!activeActivity || importPreview.length === 0) return;
    const now = new Date().toISOString();
    const existingCodeMap = new Map(currentMembers.map(m => [m.memberCode.toLowerCase(), m]));

    const membersToAdd: Member[] = [];

    importPreview.forEach((p, idx) => {
      const codeKey = (p.memberCode || '').toLowerCase();
      if (skipDuplicates && existingCodeMap.has(codeKey)) {
        return; // skip duplicate
      }

      const existing = existingCodeMap.get(codeKey);

      membersToAdd.push({
        id: existing ? existing.id : `mem_imp_${Date.now()}_${idx}`,
        activityId: activeActivity.id,
        name: p.name || 'Unknown',
        memberCode: p.memberCode || `MEM-${idx + 1}`,
        mobile: p.mobile,
        email: p.email,
        joiningDate: p.joiningDate || getTodayDateString(),
        leavingDate: p.leavingDate || undefined,
        assignedShiftId: activeActivity.defaultShiftId || shifts[0]?.id,
        notes: p.notes,
        isActive: true,
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now,
      });
    });

    if (membersToAdd.length > 0) {
      await importMembersBulk(membersToAdd);
    }

    setIsImportModalOpen(false);
    setImportPreview([]);
  };

  const toDeleteMember = members.find(m => m.id === deleteConfirmId);

  return (
    <>
    <Modal isOpen={showActivityPrompt} onClose={() => setShowActivityPrompt(false)} title="Add an activity first">
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">Please add an activity before adding a new member. Members are organized under an activity.</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setShowActivityPrompt(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Close</button>
          <button type="button" onClick={() => { setShowActivityPrompt(false); onNavigate?.('activities'); }} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">Go to Activities</button>
        </div>
      </div>
    </Modal>
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Members Directory
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              {currentMembers.length} enrolled
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Activity: <strong className="text-slate-700 dark:text-slate-200">{activeActivity?.name}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-500" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Search, Filter, Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, ID code, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveFilter('active')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                activeFilter === 'active'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setActiveFilter('inactive')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                activeFilter === 'inactive'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Inactive
            </button>
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                activeFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              All
            </button>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="bg-transparent border-0 focus:ring-0 cursor-pointer"
            >
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="code_asc">Member Code</option>
            </select>
          </div>
        </div>
      </div>

      {/* Member Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedMembers.length === 0 ? (
          <div className="col-span-full rounded-2xl bg-white dark:bg-slate-800/80 p-12 text-center border border-dashed border-slate-300 dark:border-slate-700">
            <Users className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-900 dark:text-white">No members found</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Add new members or import via CSV to start tracking attendance.
            </p>
          </div>
        ) : (
          displayedMembers.map((member) => {
            const stats = memberStatsMap.get(member.id);
            const currentStreak = stats?.currentStreak || 0;

            return (
              <div
                key={member.id}
                className="rounded-2xl bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-600 transition"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-tr from-indigo-600 to-cyan-500 text-white font-black text-sm shadow-xs">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                            {member.name}
                          </h3>
                          {!member.isActive && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-500">
                              Inactive
                            </span>
                          )}
                          {member.leavingDate && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                              Left
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          {member.memberCode}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(member)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                        title="Edit Member"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(member.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Delete Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Streak & Attendance Progress */}
                  <div className="mt-3 flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Flame className={`w-4 h-4 ${currentStreak > 0 ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {currentStreak} {currentStreak === 1 ? 'day' : 'days'} streak
                      </span>
                    </div>

                    <div className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                      {stats ? `${stats.attendancePercentage}%` : '0%'}
                    </div>
                  </div>

                  {/* Member contact & metadata */}
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    {member.mobile && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{member.mobile}</span>
                      </div>
                    )}
                    {member.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Joined: {formatDateSafe(member.joiningDate)}</span>
                    </div>
                    {member.leavingDate && (
                      <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold">
                        <UserX className="w-3.5 h-3.5 shrink-0" />
                        <span>Left: {formatDateSafe(member.leavingDate)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        Shift: {member.assignedShiftId ? shiftMap.get(member.assignedShiftId) || 'General' : 'General'}
                      </span>
                    </div>
                  </div>

                  {member.notes && (
                    <div className="mt-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-750 text-[11px] text-slate-500 dark:text-slate-400 italic">
                      "{member.notes}"
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Member Modal */}
      {isModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          title={editingMember ? 'Edit Member Details' : 'Add New Member'}
          maxWidth="lg"
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Member ID / Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EMP-101"
                  value={memberCode}
                  onChange={(e) => setMemberCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Mobile Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Joining Date *
                </label>
                <input
                  type="date"
                  required
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Leaving Date (Optional)
                </label>
                <input
                  type="date"
                  value={leavingDate}
                  onChange={(e) => setLeavingDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Attendance is excluded after this date.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Assigned Shift
                </label>
                <select
                  value={assignedShiftId}
                  onChange={(e) => setAssignedShiftId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
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
                  Notes / Role Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lead Designer, Trainer"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="mem-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="mem-active" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Active Member (appears in daily register)
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
                {editingMember ? 'Save Changes' : 'Add Member'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsImportModalOpen(false)}
          title="Import Members from CSV"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Import a list of members into <strong>{activeActivity?.name}</strong>. Formula injection protection is enabled automatically.
            </p>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span>Need formatting reference?</span>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Download Sample CSV
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                Choose CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-950 dark:file:text-indigo-300 hover:file:bg-indigo-100 cursor-pointer"
              />
            </div>

            {duplicateCodes.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{duplicateCodes.length} duplicate member codes detected</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="skip-dup"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <label htmlFor="skip-dup" className="text-slate-700 dark:text-slate-300 font-semibold">
                    Skip existing members (uncheck to overwrite details)
                  </label>
                </div>
              </div>
            )}

            {importPreview.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Found {importPreview.length} members in file:</span>
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 p-2 space-y-1 text-xs">
                  {importPreview.map((m, idx) => (
                    <div key={idx} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{m.name}</span>
                      <span className="text-slate-500">{m.memberCode}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={importPreview.length === 0}
                onClick={handleConfirmImport}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-600/30"
              >
                Confirm Import ({importPreview.length})
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirmId(null)}
          title="Delete Member?"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to delete <strong>{toDeleteMember?.name}</strong> ({toDeleteMember?.memberCode})?
              All past attendance history for this member will also be deleted.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  removeMember(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Delete Member
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
    </>
  );
};
