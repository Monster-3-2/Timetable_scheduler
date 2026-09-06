import React, { useState, useEffect } from 'react';
import { Bell, Zap, CheckCircle2, RefreshCw, DoorClosed, Info } from 'lucide-react';

export default function NotificationsPage({ notifications: initialNotifs }) {
  const [notifications, setNotifications] = useState(initialNotifs || []);

  useEffect(() => {
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => setNotifications(data))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Bell className="w-4 h-4" />
            <span>Campus Notification Hub</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Notifications & Alerts</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time automated broadcasts for room reassignments, rescheduling requests, and timetable releases.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {notifications.map(n => (
          <div key={n.id} className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-start space-x-4">
            <div className={`p-3 rounded-2xl shrink-0 ${
              n.type === 'reschedule' ? 'bg-purple-50 text-purple-600' :
              n.type === 'room_change' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
            }`}>
              <Zap className="w-5 h-5" />
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-slate-900">{n.title}</h4>
                <span className="text-[10px] text-slate-400 font-semibold">{n.timestamp}</span>
              </div>
              <p className="text-xs text-slate-600 font-medium">{n.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
