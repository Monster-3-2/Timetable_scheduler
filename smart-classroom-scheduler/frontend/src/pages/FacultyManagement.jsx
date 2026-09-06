import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit, Check, Clock, Calendar, Mail, ShieldCheck } from 'lucide-react';

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const SLOTS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

export default function FacultyManagement() {
  const [faculty, setFaculty] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedFacultyForMatrix, setSelectedFacultyForMatrix] = useState(null);

  const [newFac, setNewFac] = useState({
    name: '',
    employee_id: '',
    department_id: 'dept_cse',
    email: '',
    max_classes_per_day: 4,
    max_classes_per_week: 16
  });

  const fetchFaculty = () => {
    fetch('/api/faculty')
      .then(res => res.json())
      .then(data => setFaculty(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchFaculty();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/faculty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newFac,
          subjects: ['subj_dsa'],
          available_days: DAYS,
          available_slots: DAYS.reduce((acc, d) => ({ ...acc, [d]: SLOTS }), {})
        })
      });
      fetchFaculty();
      setShowAddModal(false);
      setNewFac({ name: '', employee_id: '', department_id: 'dept_cse', email: '', max_classes_per_day: 4, max_classes_per_week: 16 });
    } catch (err) {}
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/faculty/${id}`, { method: 'DELETE' });
      fetchFaculty();
    } catch (err) {}
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Faculty Directory & Availability</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Faculty Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage teaching staff, workload parameters, and weekly time slot availability matrices.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Faculty Member</span>
        </button>
      </div>

      {/* Faculty Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Faculty Member</th>
              <th className="py-3 px-4">Emp ID</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Max Classes (Day/Wk)</th>
              <th className="py-3 px-4">Availability Matrix</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
            {faculty.map(f => (
              <tr key={f.id} className="hover:bg-slate-50/80 transition-all">
                <td className="py-3.5 px-4">
                  <div>
                    <p className="font-extrabold text-slate-900">{f.name}</p>
                    <p className="text-[11px] text-slate-500">{f.email}</p>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-semibold text-slate-600">{f.employee_id}</td>
                <td className="py-3.5 px-4 uppercase font-bold text-indigo-600">{f.department_id.replace('dept_', '')}</td>
                <td className="py-3.5 px-4 font-bold text-slate-800">{f.max_classes_per_day} / day • {f.max_classes_per_week} / wk</td>
                <td className="py-3.5 px-4">
                  <button
                    onClick={() => setSelectedFacultyForMatrix(f)}
                    className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 text-[11px] hover:bg-indigo-100 transition-all"
                  >
                    View Weekly Grid
                  </button>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Faculty Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900">Add Faculty Member</h3>

            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newFac.name}
                  onChange={e => setNewFac({ ...newFac, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Employee ID</label>
                <input
                  type="text"
                  value={newFac.employee_id}
                  onChange={e => setNewFac({ ...newFac, employee_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newFac.email}
                  onChange={e => setNewFac({ ...newFac, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max / Day</label>
                  <input
                    type="number"
                    value={newFac.max_classes_per_day}
                    onChange={e => setNewFac({ ...newFac, max_classes_per_day: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max / Week</label>
                  <input
                    type="number"
                    value={newFac.max_classes_per_week}
                    onChange={e => setNewFac({ ...newFac, max_classes_per_week: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700"
                >
                  Save Faculty
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Faculty Weekly Availability Matrix Drawer */}
      {selectedFacultyForMatrix && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Weekly Slot Availability Matrix</h3>
                <p className="text-xs text-slate-500">{selectedFacultyForMatrix.name} ({selectedFacultyForMatrix.employee_id})</p>
              </div>
              <button onClick={() => setSelectedFacultyForMatrix(null)} className="px-3 py-1 bg-slate-100 font-bold text-xs rounded-xl">
                Close
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold">
                    <th className="p-2 border">Time</th>
                    {DAYS.map(d => <th key={d} className="p-2 border">{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {SLOTS.map(slot => (
                    <tr key={slot}>
                      <td className="p-2 border font-bold text-slate-500">{slot}</td>
                      {DAYS.map(day => (
                        <td key={day} className="p-2 border">
                          <span className="inline-block w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold leading-4">
                            ✓
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
