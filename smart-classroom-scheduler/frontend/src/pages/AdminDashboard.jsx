import React, { useState, useEffect } from 'react';
import { 
  Users, GraduationCap, DoorClosed, BookOpen, Clock, BarChart2, 
  Wand2, Plus, RefreshCw, CheckCircle2, AlertTriangle, ArrowUpRight, Sparkles, Building2
} from 'lucide-react';

export default function AdminDashboard({ onNavigate, stats: initialStats }) {
  const [stats, setStats] = useState(initialStats || {
    total_students: 195,
    total_faculty: 4,
    total_classrooms: 7,
    total_subjects: 8,
    classes_today: 5,
    room_utilization_rate: 91.2,
    today_classes: []
  });

  const [showAddFacultyModal, setShowAddFacultyModal] = useState(false);
  const [showAddClassroomModal, setShowAddClassroomModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick AI Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-indigo-200 text-xs font-semibold w-fit mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300 animate-pulse" />
            <span>Smart Education SaaS Core</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">University Academic Timetable Control Center</h2>
          <p className="text-xs text-indigo-200 mt-1 max-w-xl">
            Real-time monitoring of campus classrooms, faculty availability matrices, and AI constraint satisfaction solver.
          </p>
        </div>

        <div className="flex items-center space-x-3 relative z-10">
          <button
            onClick={() => onNavigate('generate')}
            className="px-5 py-3 rounded-2xl bg-white text-indigo-900 font-extrabold text-xs flex items-center space-x-2 shadow-lg hover:bg-indigo-50 transition-all"
          >
            <Wand2 className="w-4 h-4 text-indigo-600 animate-spin" />
            <span>Generate AI Timetable</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Students</span>
            <GraduationCap className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{stats.total_students}</p>
          <span className="text-[10px] text-emerald-600 font-semibold flex items-center">
            <ArrowUpRight className="w-3 h-3 mr-0.5" /> 4 Active Groups
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Faculty</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{stats.total_faculty}</p>
          <span className="text-[10px] text-slate-500 font-medium">Full Availability</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Classrooms</span>
            <DoorClosed className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{stats.total_classrooms}</p>
          <span className="text-[10px] text-sky-600 font-semibold">3 Labs & 4 Halls</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Subjects</span>
            <BookOpen className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{stats.total_subjects}</p>
          <span className="text-[10px] text-slate-500 font-medium">CSE & ECE Courses</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Classes Today</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{stats.classes_today}</p>
          <span className="text-[10px] text-purple-600 font-semibold">Ongoing Schedule</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Room Utilization</span>
            <BarChart2 className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{stats.room_utilization_rate}%</p>
          <span className="text-[10px] text-emerald-600 font-semibold">Optimal Capacity</span>
        </div>
      </div>

      {/* Quick Action Shortcuts Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            onClick={() => onNavigate('generate')}
            className="p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center space-x-2 border border-indigo-200 transition-all"
          >
            <Wand2 className="w-4 h-4" />
            <span>Generate Timetable</span>
          </button>

          <button
            onClick={() => onNavigate('faculty')}
            className="p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center space-x-2 border border-emerald-200 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Faculty</span>
          </button>

          <button
            onClick={() => onNavigate('classrooms')}
            className="p-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center space-x-2 border border-sky-200 transition-all"
          >
            <Building2 className="w-4 h-4" />
            <span>Add Classroom</span>
          </button>

          <button
            onClick={() => onNavigate('subjects')}
            className="p-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center space-x-2 border border-amber-200 transition-all"
          >
            <BookOpen className="w-4 h-4" />
            <span>Add Subject</span>
          </button>

          <button
            onClick={() => onNavigate('rescheduling')}
            className="p-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center space-x-2 border border-purple-200 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reschedule Class</span>
          </button>
        </div>
      </div>

      {/* Today's Classes Section */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">Today's Classes Schedule</h3>
            <p className="text-xs text-slate-500">Live view of current academic sessions and room allocations</p>
          </div>
          <button
            onClick={() => onNavigate('timetables')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
          >
            <span>View Full Grid</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Faculty</th>
                <th className="py-3 px-4">Student Group</th>
                <th className="py-3 px-4">Room</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {(stats.today_classes && stats.today_classes.length > 0 ? stats.today_classes : [
                { id: '1', time_slot: '09:00 AM', subject_name: 'Data Structures & Algorithms', subject_code: 'CSE101', faculty_name: 'Dr. Rahul Sharma', student_group_name: 'B.Tech CSE Sem 4 Sec A', classroom_name: 'C301', is_lab: false },
                { id: '2', time_slot: '10:00 AM', subject_name: 'Artificial Intelligence', subject_code: 'CSE302', faculty_name: 'Dr. Rahul Sharma', student_group_name: 'B.Tech CSE Sem 4 Sec A', classroom_name: 'C301', is_lab: false },
                { id: '3', time_slot: '11:00 AM', subject_name: 'Database Management Systems', subject_code: 'CSE201', faculty_name: 'Dr. Priya Patel', student_group_name: 'B.Tech CSE Sem 4 Sec A', classroom_name: 'C302', is_lab: false },
                { id: '4', time_slot: '02:00 PM', subject_name: 'Data Structures Lab', subject_code: 'CSE101L', faculty_name: 'Prof. Vikram Singh', student_group_name: 'B.Tech CSE Sem 4 Sec A', classroom_name: 'Computer Lab 1', is_lab: true }
              ]).map((cls) => (
                <tr key={cls.id} className="hover:bg-slate-50/80 transition-all">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{cls.time_slot}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{cls.subject_name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-100 text-slate-600">{cls.subject_code}</span>
                      {cls.is_lab && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-700">LAB</span>}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">{cls.faculty_name}</td>
                  <td className="py-3.5 px-4">{cls.student_group_name}</td>
                  <td className="py-3.5 px-4 font-semibold text-indigo-600">{cls.classroom_name}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>On Schedule</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
