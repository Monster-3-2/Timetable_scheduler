import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, CheckCircle2, Clock } from 'lucide-react';

export default function SubjectManagement() {
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);

  useEffect(() => {
    fetch('/api/subjects').then(r => r.json()).then(d => setSubjects(d)).catch(() => {});
    fetch('/api/faculty').then(r => r.json()).then(d => setFaculty(d)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Academic Curriculum</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Subject Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure subject codes, weekly session frequencies, duration, faculty assignments, and lab requirements.
          </p>
        </div>
      </div>

      {/* Subjects Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Subject Name</th>
              <th className="py-3 px-4">Code</th>
              <th className="py-3 px-4">Sessions/Wk</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-4">Room Requirement</th>
              <th className="py-3 px-4">Lab Required</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
            {subjects.map(s => (
              <tr key={s.id} className="hover:bg-slate-50/80 transition-all">
                <td className="py-3.5 px-4 font-extrabold text-slate-900">{s.name}</td>
                <td className="py-3.5 px-4 font-bold text-indigo-600">{s.code}</td>
                <td className="py-3.5 px-4 font-bold">{s.sessions_per_week} Sessions</td>
                <td className="py-3.5 px-4 font-medium text-slate-600">{s.session_duration_hours} Hour(s)</td>
                <td className="py-3.5 px-4 font-semibold">{s.room_requirement}</td>
                <td className="py-3.5 px-4">
                  {s.lab_required ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                      YES (LAB)
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600">
                      NO
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
