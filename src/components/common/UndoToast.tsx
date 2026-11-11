import React, { useEffect } from 'react';
import { RotateCcw, X, CheckCircle2 } from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';

export const UndoToast: React.FC = () => {
  const { undoAction, undoLastAttendanceChange, dismissUndo } = useAttendance();

  useEffect(() => {
    if (!undoAction) return;
    const timer = setTimeout(() => {
      dismissUndo();
    }, 6000); // Auto-dismiss after 6s
    return () => clearTimeout(timer);
  }, [undoAction, dismissUndo]);

  if (!undoAction) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 z-50 animate-slide-up">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 text-white px-4 py-3 shadow-2xl backdrop-blur-md border border-slate-700/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium truncate">{undoAction.description}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => undoLastAttendanceChange()}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 px-2.5 py-1 text-xs font-semibold text-white transition shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            onClick={() => dismissUndo()}
            className="rounded-lg p-1 text-slate-400 hover:text-white transition"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
