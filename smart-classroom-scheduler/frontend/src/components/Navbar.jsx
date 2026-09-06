import React, { useState } from 'react';
import { 
  Sparkles, Bell, Shield, UserCheck, GraduationCap, 
  LogOut, Zap, Pencil
} from 'lucide-react';
import EditProfileModal from './EditProfileModal';

export default function Navbar({ currentUser, onLogout, onUpdateUser, notifications = [] }) {
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const unreadNotifs = notifications.filter(n => !n.read);

  const roleBadges = {
    ADMIN: { label: 'Admin HOD', icon: Shield, bg: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    FACULTY: { label: 'Faculty Member', icon: UserCheck, bg: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    STUDENT: { label: 'Student Persona', icon: GraduationCap, bg: 'bg-sky-100 text-sky-700 border-sky-200' }
  };

  const currentBadge = roleBadges[currentUser.role] || roleBadges.ADMIN;
  const RoleIcon = currentBadge.icon;

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-xs">
      {/* Brand & Hackathon Title */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-400 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg text-slate-900 tracking-tight">SMART CLASSROOM</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-600 border border-indigo-200">
                VIT 2026
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">AI Timetable & Room Optimization Engine</p>
          </div>
        </div>
      </div>

      {/* Right Controls: Role Badge & Profile */}
      <div className="flex items-center space-x-4">
        {/* Static Role Badge (reflects real authenticated role — not switchable) */}
        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${currentBadge.bg}`}>
          <RoleIcon className="w-4 h-4" />
          <span>{currentBadge.label}</span>
        </div>

        {/* Notifications Icon & Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifs.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                {unreadNotifs.length}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-xs text-slate-800">Notifications Center</span>
                </div>
                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-semibold">
                  {notifications.length} Total
                </span>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {notifications.slice(0, 4).map(n => (
                  <div key={n.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <p className="font-semibold text-slate-800">{n.title}</p>
                    <p className="text-slate-600 text-[11px] mt-0.5">{n.message}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">{n.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar & Logout */}
        <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
          <button
            onClick={() => setShowEditProfile(true)}
            title="Edit profile"
            className="group relative shrink-0"
          >
            <img
              src={currentUser.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"}
              alt={currentUser.name}
              className="w-9 h-9 rounded-xl object-cover ring-2 ring-indigo-500/20"
            />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center ring-2 ring-white opacity-0 group-hover:opacity-100 transition-opacity">
              <Pencil className="w-2.5 h-2.5" />
            </span>
          </button>

          <button
            onClick={() => setShowEditProfile(true)}
            className="hidden sm:block text-left"
            title="Edit profile"
          >
            <p className="text-xs font-bold text-slate-800 leading-tight hover:text-indigo-600 transition-colors">{currentUser.name}</p>
            <p className="text-[11px] text-slate-500 font-medium">{currentUser.email}</p>
          </button>

          <button
            onClick={onLogout}
            title="Log out"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showEditProfile && (
        <EditProfileModal
          currentUser={currentUser}
          onClose={() => setShowEditProfile(false)}
          onSave={(updatedUser) => onUpdateUser && onUpdateUser(updatedUser)}
        />
      )}
    </header>
  );
}
