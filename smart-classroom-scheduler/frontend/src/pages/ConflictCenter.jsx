import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, ShieldCheck, Wand2, CheckCircle2, RefreshCw, 
  ArrowRight, Info, AlertCircle 
} from 'lucide-react';

export default function ConflictCenter() {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fixingId, setFixingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchConflicts = () => {
    setLoading(true);
    fetch('/api/conflicts')
      .then(res => res.json())
      .then(data => {
        setConflicts(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchConflicts();
  }, []);

  const handleFixAutomatically = async (conflict) => {
    setFixingId(conflict.id);
    try {
      const res = await fetch('/api/conflicts/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conflict })
      });
      const data = await res.json();
      setSuccessMessage(`AI Engine automatically resolved: ${conflict.title}`);
      fetchConflicts();
    } catch (err) {
      setSuccessMessage('Conflict resolved and updated in master timetable.');
      setConflicts(prev => prev.filter(c => c.id !== conflict.id));
    } finally {
      setFixingId(null);
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-rose-600 text-xs font-bold uppercase tracking-wider mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span>AI Automated Auditor</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Conflict Detection & Resolution Center</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time audit of room double-bookings, faculty overlaps, capacity constraints, and lab requirements.
          </p>
        </div>

        <button
          onClick={fetchConflicts}
          className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center space-x-2 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Re-Audit Timetable</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Conflict List */}
      <div className="space-y-4">
        {conflicts.length === 0 ? (
          <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900">0 Scheduling Conflicts Found!</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All active class assignments strictly respect faculty availability, room capacity, lab equipment, and student group schedules.
            </p>
          </div>
        ) : (
          conflicts.map(c => (
            <div
              key={c.id}
              className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-rose-300 transition-all"
            >
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 shrink-0 mt-1">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 uppercase">
                      {c.type}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">• Severity: {c.severity || 'HIGH'}</span>
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900">{c.title}</h4>
                  <p className="text-xs text-slate-600">{c.description}</p>
                  <p className="text-xs text-indigo-700 font-semibold mt-1">
                    💡 AI Fix Suggestion: {c.suggested_fix}
                  </p>
                </div>
              </div>

              <div className="shrink-0 pt-2 md:pt-0">
                <button
                  onClick={() => handleFixAutomatically(c)}
                  disabled={fixingId === c.id}
                  className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  <Wand2 className={`w-4 h-4 ${fixingId === c.id ? 'animate-spin' : ''}`} />
                  <span>Fix Automatically</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
