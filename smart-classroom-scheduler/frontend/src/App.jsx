import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import CampusAIAssistant from './components/CampusAIAssistant';

import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import GenerateTimetable from './pages/GenerateTimetable';
import TimetableView from './pages/TimetableView';
import ConflictCenter from './pages/ConflictCenter';
import ReschedulingCenter from './pages/ReschedulingCenter';
import FacultyManagement from './pages/FacultyManagement';
import StudentManagement from './pages/StudentManagement';
import ClassroomManagement from './pages/ClassroomManagement';
import SubjectManagement from './pages/SubjectManagement';
import FacultyDashboard from './pages/FacultyDashboard';
import StudentDashboard from './pages/StudentDashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import NotificationsPage from './pages/NotificationsPage';
import FindBestFaculty from './pages/FindBestFaculty';
import AdaptiveReoptimizer from './pages/AdaptiveReoptimizer';
import { supabase, fetchCurrentUserProfile } from './lib/supabaseClient';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let isMounted = true;

    // 1. Check for a local (non-Supabase) session first
    const localUser = sessionStorage.getItem('local_user');
    if (localUser) {
      try {
        const user = JSON.parse(localUser);
        if (isMounted) { setCurrentUser(user); setAuthLoading(false); }
        return;
      } catch {}
    }

    // 2. Try Supabase session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const profile = await fetchCurrentUserProfile(session);
      if (isMounted) { setCurrentUser(profile); setAuthLoading(false); }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const profile = await fetchCurrentUserProfile(session);
      if (isMounted) { setCurrentUser(profile); setActiveTab('dashboard'); }
    });

    // 3. Listen for local login events dispatched by Login.jsx
    const handleLocalLogin = (e) => {
      if (isMounted) { setCurrentUser(e.detail); setAuthLoading(false); setActiveTab('dashboard'); }
    };
    window.addEventListener('localLogin', handleLocalLogin);

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
      window.removeEventListener('localLogin', handleLocalLogin);
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => setNotifications(data))
      .catch(() => {});
  }, [currentUser]);

  const handleLogout = async () => {
    sessionStorage.removeItem('local_user');
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const handleUpdateUser = (updatedUser) => {
    setCurrentUser(updatedUser);
    // Keep the locally-persisted session in sync so a refresh doesn't
    // revert the edit (only applies to the non-Supabase demo login path).
    if (sessionStorage.getItem('local_user')) {
      sessionStorage.setItem('local_user', JSON.stringify(updatedUser));
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      <Navbar currentUser={currentUser} onLogout={handleLogout} onUpdateUser={handleUpdateUser} notifications={notifications} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userRole={currentUser.role} />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            currentUser.role === 'ADMIN' ? (
              <AdminDashboard onNavigate={setActiveTab} />
            ) : currentUser.role === 'FACULTY' ? (
              <FacultyDashboard onNavigate={setActiveTab} currentUser={currentUser} />
            ) : (
              <StudentDashboard onNavigate={setActiveTab} />
            )
          )}

          {activeTab === 'find_best_faculty' && <FindBestFaculty />}
          {activeTab === 'generate' && (
            <GenerateTimetable
              onTimetableGenerated={() => setActiveTab('timetables')}
              onPublish={() => setActiveTab('timetables')}
            />
          )}
          {activeTab === 'timetables' && <TimetableView userRole={currentUser.role} currentUser={currentUser} />}
          {activeTab === 'conflicts' && <ConflictCenter />}
          {activeTab === 'rescheduling' && <ReschedulingCenter />}
          {activeTab === 'faculty' && <FacultyManagement />}
          {activeTab === 'students' && <StudentManagement />}
          {activeTab === 'departments' && <StudentManagement />}
          {activeTab === 'classrooms' && <ClassroomManagement />}
          {activeTab === 'subjects' && <SubjectManagement />}
          {activeTab === 'availability' && <FacultyManagement />}
          {activeTab === 'study_planner' && <StudentDashboard onNavigate={setActiveTab} />}
          {activeTab === 'analytics' && <AnalyticsDashboard />}
          {activeTab === 'adaptive_reoptimize' && <AdaptiveReoptimizer />}
          {activeTab === 'notifications' && <NotificationsPage notifications={notifications} />}
        </main>
      </div>

      <CampusAIAssistant currentUser={currentUser} />
    </div>
  );
}
