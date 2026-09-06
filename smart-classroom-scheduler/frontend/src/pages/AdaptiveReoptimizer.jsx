import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap, AlertTriangle, Lock, RefreshCw, CheckCircle2, ChevronRight,
  ChevronDown, ArrowRight, Shield, Clock, Building2, Users, BarChart3,
  Play, Star, XCircle, Info, ToggleLeft, ToggleRight, Sparkles,
  UserX, DoorClosed, TrendingUp, PlusCircle, BadgeCheck, Send
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────
const EVENT_TYPES = [
  { id: 'faculty_unavailable', label: 'Faculty Unavailability',
    icon: UserX, color: 'rose', desc: 'Faculty member unable to take classes (illness, leave, emergency)' },
  { id: 'room_unavailable', label: 'Room / Lab Closure',
    icon: DoorClosed, color: 'amber', desc: 'Classroom or lab becomes unavailable (maintenance, emergency)' },
  { id: 'enrollment_change', label: 'Enrollment Surge',
    icon: TrendingUp, color: 'blue', desc: 'Student group size increases beyond current room capacity' },
  { id: 'new_section', label: 'New Section Added',
    icon: PlusCircle, color: 'emerald', desc: 'A new student section requires timetable accommodation' },
];

const COLOR_MAP = {
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    icon: 'text-rose-500',    btn: 'bg-rose-100 text-rose-700' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   icon: 'text-amber-500',   btn: 'bg-amber-100 text-amber-700' },
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    icon: 'text-blue-500',    btn: 'bg-blue-100 text-blue-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-500', btn: 'bg-emerald-100 text-emerald-700' },
  indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700',  icon: 'text-indigo-500',  btn: 'bg-indigo-600 text-white' },
};

const STEP_LABELS = [
  'Change Event',
  'Affected Classes',
  'Candidate Solutions',
  'Recommended Solution',
  'Review & Approve',
  'Published',
];

function StepIndicator({ step }) {
  return (
    <div className="flex items-center space-x-1 overflow-x-auto pb-1">
      {STEP_LABELS.map((label, i) => {
        const active   = i === step;
        const done     = i < step;
        const inactive = i > step;
        return (
          <React.Fragment key={i}>
            <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
              active   ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
              : done   ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-400'
            }`}>
              {done
                ? <CheckCircle2 className="w-3 h-3" />
                : <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                    active ? 'bg-indigo-500 text-white' : 'bg-slate-300 text-slate-500'
                  }`}>{i + 1}</span>
              }
              <span>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${i < step ? 'text-emerald-400' : 'text-slate-300'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function DisruptionBadge({ score }) {
  const low  = score <= 5;
  const mid  = score <= 15;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
      low ? 'bg-emerald-100 text-emerald-700'
      : mid ? 'bg-amber-100 text-amber-700'
      : 'bg-rose-100 text-rose-700'
    }`}>
      Disruption: {score}
    </span>
  );
}

function DiffCard({ diff, index }) {
  const [open, setOpen] = useState(false);
  const isUnresolved = diff.disruption_score >= 999;
  return (
    <div className={`rounded-2xl border p-3 text-xs space-y-1 ${
      isUnresolved
        ? 'border-rose-300 bg-rose-50'
        : diff.changes?.length === 0
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-amber-200 bg-amber-50'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isUnresolved
            ? <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            : diff.changes?.length === 0
              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              : <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          }
          <span className="font-bold text-slate-800">{diff.subject}</span>
          <span className="text-slate-500">{diff.student_group}</span>
        </div>
        {diff.changes?.length > 0 && (
          <button onClick={() => setOpen(!open)} className="text-slate-400 hover:text-slate-700">
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      <div className="flex items-center space-x-1 text-[11px] text-slate-500">
        <span className="line-through opacity-70">{diff.previous_state}</span>
        <ArrowRight className="w-3 h-3 text-indigo-400 shrink-0" />
        <span className={`font-semibold ${isUnresolved ? 'text-rose-700' : 'text-emerald-700'}`}>{diff.new_state}</span>
      </div>
      {open && diff.changes?.map((c, ci) => (
        <div key={ci} className="ml-5 text-[11px] text-slate-600 font-medium">• {c}</div>
      ))}
    </div>
  );
}

function SolutionCard({ candidate, selected, onSelect, recommended }) {
  const [expanded, setExpanded] = useState(false);
  const hasViolations = candidate.hard_violations && (
    Object.values(candidate.hard_violations).some(v => v > 0)
  );

  return (
    <div
      onClick={() => onSelect(candidate)}
      className={`rounded-3xl border-2 p-5 cursor-pointer transition-all space-y-3 ${
        selected
          ? 'border-indigo-500 bg-indigo-50 shadow-xl shadow-indigo-100'
          : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {recommended && (
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold">
              <Star className="w-2.5 h-2.5" /><span>Recommended</span>
            </span>
          )}
          <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
            selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}>Rank #{candidate.rank}</span>
        </div>
        {selected && <BadgeCheck className="w-5 h-5 text-indigo-600" />}
      </div>

      <div>
        <h3 className="font-extrabold text-slate-900 text-base">{candidate.label}</h3>
        <div className="flex flex-wrap gap-2 mt-2">
          <DisruptionBadge score={candidate.disruption_score} />
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
            {candidate.preservation_pct}% preserved
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
            {candidate.changes_count} changes
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
            {candidate.solver_time_ms}ms
          </span>
          {hasViolations
            ? <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700">⚠ Violations</span>
            : <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">✓ 0 Hard Violations</span>
          }
        </div>
      </div>

      {/* Diff log toggle */}
      {candidate.diff_log?.length > 0 && (
        <div>
          <button
            onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}
            className="text-[11px] text-indigo-600 font-bold hover:underline flex items-center space-x-1"
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <span>{expanded ? 'Hide' : 'View'} {candidate.diff_log.length} change{candidate.diff_log.length !== 1 ? 's' : ''}</span>
          </button>
          {expanded && (
            <div className="mt-2 space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {candidate.diff_log.map((d, i) => <DiffCard key={i} diff={d} index={i} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdaptiveReoptimizer() {
  const [step, setStep] = useState(0);          // 0-5
  const [eventType, setEventType] = useState('');
  const [targets, setTargets] = useState({ faculty: [], classrooms: [], student_groups: [] });
  const [targetId, setTargetId] = useState('');
  const [extraParams, setExtraParams] = useState({ new_student_count: 90 });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [applyStatus, setApplyStatus] = useState(null);

  // What-if simulator state
  const [whatIfMode, setWhatIfMode] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);

  useEffect(() => {
    fetch('/api/adaptive-reoptimize/targets')
      .then(r => r.json())
      .then(setTargets)
      .catch(() => {});
  }, []);

  const targetOptions = useCallback(() => {
    if (!eventType) return [];
    if (eventType === 'faculty_unavailable') return targets.faculty.filter(f => f.scheduled);
    if (eventType === 'room_unavailable')    return targets.classrooms.filter(c => c.scheduled);
    if (eventType === 'enrollment_change')   return targets.student_groups.filter(g => g.scheduled);
    if (eventType === 'new_section')         return targets.student_groups;
    return [];
  }, [eventType, targets]);

  const handleSelectEvent = (id) => {
    setEventType(id);
    setTargetId('');
    setResult(null);
    setSelectedCandidate(null);
    setStep(0);
  };

  const handleRunReoptimize = async () => {
    setLoading(true);
    setResult(null);
    setSelectedCandidate(null);
    try {
      const res = await fetch('/api/adaptive-reoptimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: eventType, target_id: targetId, params: extraParams }),
      });
      const data = await res.json();
      setResult(data);
      setSelectedCandidate(data.candidate_solutions?.[0] ?? null);
      setStep(2);
    } catch (e) {
      setResult({ error: String(e) });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedCandidate || !result) return;
    // We need the timetable_id — look it up from targets (we just re-use the active one)
    const ttRes = await fetch('/api/timetables').then(r => r.json()).catch(() => []);
    const activeTT = ttRes.find?.(t => t.status === 'Published') ?? ttRes[0];
    if (!activeTT) { setApplyStatus({ error: 'No timetable found' }); return; }

    setLoading(true);
    setApplyStatus(null);
    try {
      const res = await fetch('/api/adaptive-reoptimize/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timetable_id: activeTT.id, new_slots: selectedCandidate.new_slots }),
      });
      const data = await res.json();
      if (res.ok) {
        setApplyStatus({ success: data.message });
        setStep(5);
      } else {
        setApplyStatus({ error: data.detail });
      }
    } catch (e) {
      setApplyStatus({ error: String(e) });
    } finally {
      setLoading(false);
    }
  };

  const handleWhatIf = async () => {
    if (!eventType || !targetId) return;
    setWhatIfLoading(true);
    setWhatIfResult(null);
    try {
      const res = await fetch('/api/simulator/what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_type: eventType.replace('_unavailable', '_unavailable'),
          target_id: targetId,
          params: extraParams,
        }),
      });
      const data = await res.json();
      setWhatIfResult(data);
    } catch (e) {
      setWhatIfResult({ error: String(e) });
    } finally {
      setWhatIfLoading(false);
    }
  };

  const selectedEvent = EVENT_TYPES.find(e => e.id === eventType);
  const recommended = result?.candidate_solutions?.[result?.recommended_solution_index ?? 0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-slate-700/50 shadow-xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30">
                <Zap className="w-5 h-5 text-indigo-300" />
              </div>
              <span className="text-xs font-extrabold text-indigo-300 uppercase tracking-widest">Signature Feature</span>
            </div>
            <h1 className="text-2xl font-extrabold">Adaptive Re-Optimization Engine</h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Campus event occurs → system detects affected slots → locks unaffected assignments →
              surgically re-optimizes the delta → delivers ranked candidate solutions with disruption scoring.
            </p>
          </div>
          <button
            onClick={() => setWhatIfMode(!whatIfMode)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl border font-bold text-xs transition-all ${
              whatIfMode
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {whatIfMode ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            <span>What-If Simulator</span>
          </button>
        </div>
      </div>

      {/* ── Step Indicator ────────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <StepIndicator step={step} />
      </div>

      {/* ── Step 0 & 1: Event Configuration ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Event Type */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
          <h2 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>Step 1 — Select Change Event</span>
          </h2>
          <div className="space-y-2">
            {EVENT_TYPES.map(ev => {
              const Icon = ev.icon;
              const c    = COLOR_MAP[ev.color];
              const sel  = eventType === ev.id;
              return (
                <button
                  key={ev.id}
                  onClick={() => handleSelectEvent(ev.id)}
                  className={`w-full text-left px-4 py-3 rounded-2xl border-2 text-xs font-semibold transition-all ${
                    sel
                      ? `${c.bg} ${c.border} ${c.text}`
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className={`w-4 h-4 ${sel ? c.icon : 'text-slate-400'}`} />
                    <span className="font-extrabold">{ev.label}</span>
                  </div>
                  <p className="mt-0.5 ml-6 text-[11px] text-slate-500">{ev.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Target Selection */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <h2 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
            <Lock className="w-4 h-4 text-indigo-500" />
            <span>Step 2 — Select Target</span>
          </h2>

          {!eventType ? (
            <div className="flex items-center justify-center h-24 text-slate-400 text-xs">
              ← Choose an event type first
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  {eventType === 'faculty_unavailable' ? 'Faculty Member' :
                   eventType === 'room_unavailable'    ? 'Classroom / Lab' : 'Student Group'}
                </label>
                <select
                  value={targetId}
                  onChange={e => { setTargetId(e.target.value); if(step < 1) setStep(1); }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">— Choose —</option>
                  {targetOptions().map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.count ? ` (${t.count} students)` : ''}
                      {t.type  ? ` [${t.type}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {eventType === 'enrollment_change' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    New Student Count
                  </label>
                  <input
                    type="number"
                    value={extraParams.new_student_count}
                    onChange={e => setExtraParams({ ...extraParams, new_student_count: +e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    min={1}
                  />
                </div>
              )}

              {/* Constraints Info */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                  <Shield className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Constraint Enforcement</span>
                </div>
                <ul className="ml-4 space-y-0.5 text-slate-500">
                  <li>• All 10 hard constraints remain enforced</li>
                  <li>• Unaffected slots locked as immovable</li>
                  <li>• 3 ranked candidate solutions generated</li>
                  <li>• Disruption cost minimized via CP-SAT</li>
                </ul>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={handleRunReoptimize}
                  disabled={!targetId || loading}
                  className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Solving…</span></>
                    : <><Play className="w-4 h-4" /><span>Run Re-Optimization</span></>
                  }
                </button>

                {whatIfMode && (
                  <button
                    onClick={handleWhatIf}
                    disabled={!targetId || whatIfLoading}
                    className="px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-500/30 transition-all disabled:opacity-40"
                  >
                    {whatIfLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>What-If</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Result: Affected Slots Summary ────────────────────────────────── */}
      {result && !result.error && (
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
          <h2 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            <span>Step 3 — Affected Classes Detected</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Affected Slots',  value: result.affected_count,      color: 'rose',    icon: AlertTriangle },
              { label: 'Locked (Safe)',   value: result.locked_slots_count,   color: 'emerald', icon: Lock },
              { label: 'Candidates',      value: result.candidate_solutions?.length ?? 0, color: 'indigo', icon: Zap },
              { label: 'Solve Time',      value: `${result.solve_time_ms}ms`, color: 'slate',   icon: Clock },
            ].map(m => {
              const Icon = m.icon;
              return (
                <div key={m.label} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <Icon className={`w-4 h-4 mx-auto mb-1 ${COLOR_MAP[m.color]?.icon ?? 'text-slate-500'}`} />
                  <div className="text-base font-extrabold text-slate-900">{m.value}</div>
                  <div className="text-[10px] text-slate-500 font-medium">{m.label}</div>
                </div>
              );
            })}
          </div>
          {result.event && (
            <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-800 font-medium">
              <span className="font-extrabold">Event:</span> {result.event.description}
            </div>
          )}
        </div>
      )}

      {/* ── Candidate Solutions ───────────────────────────────────────────── */}
      {result && !result.error && result.candidate_solutions?.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2 px-1">
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
            <span>Step 4 — Candidate Solutions (Ranked by Disruption Score)</span>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {result.candidate_solutions.map((c, i) => (
              <SolutionCard
                key={c.id}
                candidate={c}
                selected={selectedCandidate?.id === c.id}
                onSelect={sol => { setSelectedCandidate(sol); setStep(3); }}
                recommended={i === (result.recommended_solution_index ?? 0)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Recommended Detail + Approve ─────────────────────────────────── */}
      {selectedCandidate && step >= 3 && step < 5 && (
        <div className="p-6 rounded-3xl bg-white border-2 border-indigo-200 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
              <Star className="w-4 h-4 text-indigo-500" />
              <span>Step 5 — Selected: {selectedCandidate.label}</span>
            </h2>
            <DisruptionBadge score={selectedCandidate.disruption_score} />
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200">
              <div className="text-lg font-extrabold text-indigo-700">{selectedCandidate.preservation_pct}%</div>
              <div className="text-[10px] text-slate-500">Schedule Preserved</div>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="text-lg font-extrabold text-emerald-700">{selectedCandidate.changes_count}</div>
              <div className="text-[10px] text-slate-500">Changes Made</div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-lg font-extrabold text-slate-700">{selectedCandidate.solver_time_ms}ms</div>
              <div className="text-[10px] text-slate-500">Solver Time</div>
            </div>
          </div>

          {selectedCandidate.diff_log?.length > 0 && (
            <div>
              <h3 className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-2">Full Change Log</h3>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {selectedCandidate.diff_log.map((d, i) => <DiffCard key={i} diff={d} index={i} />)}
              </div>
            </div>
          )}

          {applyStatus?.error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold">
              ✖ {applyStatus.error}
            </div>
          )}

          <button
            onClick={() => { setStep(4); handleApprove(); }}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-40"
          >
            {loading
              ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Applying…</span></>
              : <><Send className="w-4 h-4" /><span>Approve &amp; Publish to Timetable</span></>
            }
          </button>
        </div>
      )}

      {/* ── Published Confirmation ────────────────────────────────────────── */}
      {step === 5 && applyStatus?.success && (
        <div className="p-8 rounded-3xl bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-300 text-center space-y-3 shadow-xl">
          <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-300">
            <CheckCircle2 className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-xl font-extrabold text-emerald-800">Re-Optimized Timetable Published</h3>
          <p className="text-sm text-emerald-700 max-w-sm mx-auto">{applyStatus.success}</p>
          <div className="flex justify-center space-x-3 mt-4">
            <button
              onClick={() => { setStep(0); setResult(null); setSelectedCandidate(null); setApplyStatus(null); setEventType(''); setTargetId(''); }}
              className="px-5 py-2.5 rounded-2xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-50 transition-all"
            >
              Run Another Event
            </button>
          </div>
        </div>
      )}

      {/* ── What-If Simulator Panel ───────────────────────────────────────── */}
      {whatIfMode && whatIfResult && (
        <div className="p-6 rounded-3xl bg-amber-50 border-2 border-amber-200 shadow-xl space-y-4">
          <h2 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>What-If Simulation Result</span>
          </h2>

          {whatIfResult.error ? (
            <div className="text-xs text-rose-700 font-bold">{whatIfResult.error}</div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-center">
                {[
                  { label: 'Total Classes',   value: whatIfResult.metrics?.total_classes   ?? '—' },
                  { label: 'Affected',         value: whatIfResult.metrics?.slots_affected  ?? '—' },
                  { label: 'Disrupted',        value: whatIfResult.metrics?.slots_disrupted ?? '—' },
                  { label: 'Preserved',        value: whatIfResult.metrics?.schedule_preservation_rate ?? '—' },
                ].map(m => (
                  <div key={m.label} className="p-3 rounded-2xl bg-white border border-amber-200">
                    <div className="text-base font-extrabold text-slate-900">{m.value}</div>
                    <div className="text-[10px] text-slate-500">{m.label}</div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-2xl bg-white border border-amber-200 text-xs text-amber-800 font-medium">
                <span className="font-extrabold">Scenario:</span> {whatIfResult.scenario?.description}
                <span className="ml-3 font-bold text-slate-500">
                  Solved in {whatIfResult.metrics?.reoptimization_time_ms}ms
                  using {whatIfResult.metrics?.solver_used ?? 'CP-SAT'}
                </span>
              </div>

              {whatIfResult.disruption_log?.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                    Disruption Log ({whatIfResult.disruption_log.length} changes)
                  </h3>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {whatIfResult.disruption_log.map((d, i) => (
                      <DiffCard key={i} diff={d} index={i} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Error state */}
      {result?.error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold flex items-center space-x-2">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{result.error}</span>
        </div>
      )}
    </div>
  );
}
