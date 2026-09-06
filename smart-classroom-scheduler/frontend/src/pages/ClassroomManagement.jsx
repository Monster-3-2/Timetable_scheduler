import React, { useState, useEffect } from 'react';
import { DoorClosed, Plus, Building2, CheckCircle2, AlertTriangle, Wrench } from 'lucide-react';

export default function ClassroomManagement() {
  const [classrooms, setClassrooms] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    building: 'Technology Tower A',
    capacity: 60,
    room_type: 'Lecture Room',
    status: 'Available'
  });

  const fetchRooms = () => {
    fetch('/api/classrooms').then(r => r.json()).then(d => setClassrooms(d)).catch(() => {});
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoom)
      });
      fetchRooms();
      setShowAdd(false);
      setNewRoom({ name: '', building: 'Technology Tower A', capacity: 60, room_type: 'Lecture Room', status: 'Available' });
    } catch (err) {}
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <DoorClosed className="w-4 h-4" />
            <span>Campus Infrastructure</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Classroom & Lab Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage lecture halls, specialized laboratories, capacity thresholds, and room status.
          </p>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Classroom / Lab</span>
        </button>
      </div>

      {/* Classroom Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {classrooms.map(c => (
          <div key={c.id} className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                c.room_type.includes('Lab') ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {c.room_type}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                {c.status}
              </span>
            </div>

            <h3 className="font-extrabold text-lg text-slate-900">{c.name}</h3>
            <p className="text-xs text-slate-500 font-medium">{c.building}</p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Seating Capacity</span>
              <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-indigo-700">{c.capacity} Seats</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900">Add Classroom / Lab</h3>

            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Room Name</label>
                <input
                  type="text"
                  value={newRoom.name}
                  onChange={e => setNewRoom({ ...newRoom, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. C303 or Robotics Lab"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Building</label>
                <input
                  type="text"
                  value={newRoom.building}
                  onChange={e => setNewRoom({ ...newRoom, building: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    value={newRoom.capacity}
                    onChange={e => setNewRoom({ ...newRoom, capacity: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Room Type</label>
                  <select
                    value={newRoom.room_type}
                    onChange={e => setNewRoom({ ...newRoom, room_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold"
                  >
                    <option value="Lecture Room">Lecture Room</option>
                    <option value="Computer Lab">Computer Lab</option>
                    <option value="Electronics Lab">Electronics Lab</option>
                    <option value="Seminar Hall">Seminar Hall</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-3">
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700">
                  Save Room
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
