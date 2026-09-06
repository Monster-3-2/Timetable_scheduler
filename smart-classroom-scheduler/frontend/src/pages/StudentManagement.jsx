import React, { useState, useEffect } from 'react';
import { GraduationCap, Building2, Plus, Users, BookOpen } from 'lucide-react';

export default function StudentManagement() {
  const [studentGroups, setStudentGroups] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    fetch('/api/student-groups').then(r => r.json()).then(d => setStudentGroups(d)).catch(() => {});
    fetch('/api/departments').then(r => r.json()).then(d => setDepartments(d)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <GraduationCap className="w-4 h-4" />
            <span>Academic Groups & Batches</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Student & Class Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage academic departments, courses, semesters, sections, and student headcount per batch.
          </p>
        </div>
      </div>

      {/* Student Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {studentGroups.map(sg => (
          <div key={sg.id} className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 uppercase">
                {sg.course} • Sem {sg.semester}
              </span>
              <span className="text-xs font-bold text-slate-500">{sg.student_count} Students</span>
            </div>

            <h3 className="font-extrabold text-base text-slate-900">{sg.name}</h3>

            <div className="pt-2 border-t border-slate-100 text-xs flex justify-between text-slate-600 font-medium">
              <span>Section: <strong className="text-slate-900">{sg.section}</strong></span>
              <span>Dept: <strong className="text-indigo-600 uppercase">{sg.department_id.replace('dept_', '')}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
