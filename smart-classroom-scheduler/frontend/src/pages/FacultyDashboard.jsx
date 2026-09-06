import React from 'react';
import { 
  UserCheck, Clock, Calendar, DoorClosed, RefreshCw, 
  CheckCircle2, BookOpen, AlertTriangle 
} from 'lucide-react';

export default function FacultyDashboard({ onNavigate, currentUser }) {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-800 to-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 uppercase tracking-wider">
            Faculty Portal
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight mt-1">Welcome, Dr. Rahul Sharma</h2>
          <p className="text-xs text-teal-200 mt-1">Department of Computer Science & Engineering • EMP1001</p>
        </div>

        <button
          onClick={() => onNavigate('rescheduling')}
          className="px-5 py-3 rounded-2xl bg-white text-emerald-950 font-extrabold text-xs flex items-center space-x-2 shadow-lg hover:bg-emerald-50 transition-all"
        >
          <RefreshCw className="w-4 h-4 text-emerald-600" />
          <span>Mark Leave / Request Change</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Teaching Hours / Week</span>
          <p className="text-2xl font-extrabold text-slate-900">14 / 16 Hrs</p>
          <span className="text-[10px] text-emerald-600 font-semibold">Optimal Load</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Subjects</span>
          <p className="text-2xl font-extrabold text-slate-900">2 Courses</p>
          <span className="text-[10px] text-indigo-600 font-semibold">DSA & AI</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Student Batches</span>
          <p className="text-2xl font-extrabold text-slate-900">115 Students</p>
          <span className="text-[10px] text-slate-500 font-medium">CSE Sec A & B</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Classes Today</span>
          <p className="text-2xl font-extrabold text-slate-900">2 Sessions</p>
          <span className="text-[10px] text-emerald-600 font-semibold">09:00 & 10:00 AM</span>
        </div>
      </div>

      {/* Today's Teaching Schedule */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="font-extrabold text-base text-slate-900">My Classes Today (Monday)</h3>

        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center">
                09:00
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">Data Structures & Algorithms (CSE101)</h4>
                <p className="text-xs text-slate-500">Student Group: B.Tech CSE Sem 4 Sec A (60 Students)</p>
              </div>
            </div>

            <div className="text-right">
              <span className="px-3 py-1 rounded-xl bg-white text-indigo-700 font-extrabold text-xs shadow-2xs">
                Room C301
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center">
                10:00
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">Artificial Intelligence (CSE302)</h4>
                <p className="text-xs text-slate-500">Student Group: B.Tech CSE Sem 4 Sec A (60 Students)</p>
              </div>
            </div>

            <div className="text-right">
              <span className="px-3 py-1 rounded-xl bg-white text-emerald-700 font-extrabold text-xs shadow-2xs">
                Room C301
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
