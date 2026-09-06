import React from 'react';
import { 
  LayoutDashboard, Wand2, Calendar, Users, GraduationCap, Building2, 
  BookOpen, DoorClosed, Clock, RefreshCw, AlertTriangle, Bell, 
  BarChart3, Settings, CalendarCheck, BookMarked, Sparkles, Award, Zap
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, userRole }) {
  const adminNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'find_best_faculty', label: 'Find Best Faculty', icon: Award, badge: 'AI' },
    { id: 'generate', label: 'Generate Timetable', icon: Wand2, badge: 'AI' },
    { id: 'timetables', label: 'Timetables', icon: Calendar },
    { id: 'conflicts', label: 'Conflict Center', icon: AlertTriangle, badge: 'Live' },
    { id: 'rescheduling', label: 'Rescheduling', icon: RefreshCw },
    { id: 'adaptive_reoptimize', label: 'Adaptive Re-Optimizer', icon: Zap, badge: 'AI' },
    { id: 'faculty', label: 'Faculty Management', icon: Users },
    { id: 'students', label: 'Students & Classes', icon: GraduationCap },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'classrooms', label: 'Classrooms & Labs', icon: DoorClosed },
    { id: 'availability', label: 'Faculty Availability', icon: Clock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const facultyNav = [
    { id: 'dashboard', label: 'Faculty Dashboard', icon: LayoutDashboard },
    { id: 'timetables', label: 'My Weekly Schedule', icon: Calendar },
    { id: 'availability', label: 'My Availability', icon: CalendarCheck },
    { id: 'rescheduling', label: 'Leave & Reschedule', icon: RefreshCw },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  const studentNav = [
    { id: 'dashboard', label: 'Student Dashboard', icon: LayoutDashboard },
    { id: 'find_best_faculty', label: 'Find Best Faculty', icon: Award, badge: 'AI' },
    { id: 'timetables', label: 'Weekly Timetable', icon: Calendar },
    { id: 'study_planner', label: 'AI Study Planner', icon: Sparkles, badge: 'AI' },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  let navItems = adminNav;
  if (userRole === 'FACULTY') navItems = facultyNav;
  if (userRole === 'STUDENT') navItems = studentNav;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-65px)] p-4 flex flex-col justify-between shrink-0 shadow-lg border-r border-slate-800">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Main Menu ({userRole})
          </p>

          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive 
                        ? 'bg-indigo-500 text-white' 
                        : 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-800 to-indigo-950 border border-slate-700/60 text-slate-300">
        <div className="flex items-center space-x-2 mb-1.5">
          <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
          <span className="text-xs font-bold text-white">Smart Education 2026</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight">
          Constraint Optimization & AI Rescheduling Engine
        </p>
      </div>
    </aside>
  );
}
