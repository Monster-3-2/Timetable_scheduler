import React, { useState } from 'react';
import {
  Sparkles, Shield, UserCheck, GraduationCap, ArrowRight, Lock, Mail, User, Loader2, Star
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const roleOptions = [
  { role: 'ADMIN', name: 'Admin / HOD', desc: 'Timetable generator, conflict solver, room manager', icon: Shield, color: 'border-indigo-500 bg-indigo-50/60 text-indigo-700' },
  { role: 'FACULTY', name: 'Faculty', desc: 'Teaching load, weekly timetable, leave requests', icon: UserCheck, color: 'border-emerald-500 bg-emerald-50/60 text-emerald-700' },
  { role: 'STUDENT', name: 'Student', desc: 'Class schedule, next class alert, AI study planner', icon: GraduationCap, color: 'border-sky-500 bg-sky-50/60 text-sky-700' }
];

// Demo credentials that work without Supabase
const DEMO_ACCOUNTS = [
  { email: 'admin@vit.ac.in', password: 'demo', label: 'Admin Demo', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { email: 'dr.sharma@vit.ac.in', password: 'demo', label: 'Faculty Demo', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { email: 'student.aaryan@vit.ac.in', password: 'demo', label: 'Student Demo', color: 'bg-sky-100 text-sky-700 border-sky-200' },
];

export default function Login() {
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('STUDENT');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Try Supabase first; fall back to local API login (works without Supabase)
  const tryLocalLogin = async (emailVal, passwordVal) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailVal, password: passwordVal }),
    });
    if (!res.ok) throw new Error('Invalid credentials');
    const data = await res.json();
    // Persist to sessionStorage so App.jsx can restore the session on reload
    sessionStorage.setItem('local_user', JSON.stringify(data.user));
    // Dispatch a custom event so App.jsx picks it up without page reload
    window.dispatchEvent(new CustomEvent('localLogin', { detail: data.user }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        // Try Supabase signup; fall back to a helpful message
        try {
          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName, role } }
          });
          if (signUpError) throw signUpError;
          setInfo('Account created! Check your inbox to confirm your email, then log in.');
          setMode('login');
        } catch {
          setInfo('Supabase auth is not configured. Use a demo account below to explore the app.');
          setMode('login');
        }
      } else {
        // Try Supabase login first
        try {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (!signInError) return; // success — onAuthStateChange in App.jsx takes over
          throw signInError;
        } catch {
          // Fall back to local API login (always works)
          await tryLocalLogin(email, password);
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (acc) => {
    setLoading(true);
    setError('');
    try {
      await tryLocalLogin(acc.email, acc.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 bg-white rounded-3xl shadow-2xl overflow-hidden z-10 border border-slate-800">

        {/* Left Side: Brand Panel */}
        <div className="md:col-span-5 bg-gradient-to-br from-indigo-900 via-indigo-850 to-slate-900 p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>VIT Bhopal University</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white leading-tight">
              SMART CLASSROOM & TIMETABLE SCHEDULER
            </h1>
            <p className="text-xs text-indigo-200 mt-2 font-normal leading-relaxed">
              AI-driven academic scheduling platform eliminating conflicts, balancing faculty workload, and optimizing university classroom capacity.
            </p>
          </div>

          {/* Demo quick-access */}
          <div className="mt-8 pt-4 border-t border-indigo-800/60">
            <p className="text-[11px] text-indigo-300 font-semibold mb-2 flex items-center gap-1">
              <Star className="w-3 h-3" /> Quick Demo Access
            </p>
            <div className="space-y-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => handleDemoLogin(acc)}
                  disabled={loading}
                  className="w-full text-left px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all disabled:opacity-50"
                >
                  <span className="text-[11px] text-white font-bold block">{acc.label}</span>
                  <span className="text-[10px] text-indigo-300">{acc.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="md:col-span-7 p-8 bg-white flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {mode === 'login' ? 'Log in with your university email' : 'Sign up with your role'}
            </p>
          </div>

          {mode === 'signup' && (
            <div className="grid grid-cols-1 gap-2 mb-5">
              {roleOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = role === opt.role;
                return (
                  <button
                    key={opt.role}
                    type="button"
                    onClick={() => setRole(opt.role)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      isSelected ? `${opt.color} border-2 shadow-xs` : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-white shadow-xs"><Icon className="w-4 h-4" /></div>
                      <div>
                        <p className="text-xs font-bold">{opt.name}</p>
                        <p className="text-[11px] text-slate-500">{opt.desc}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={3}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
            {info && <p className="text-xs text-emerald-600 font-medium">{info}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>
                  <span>{mode === 'login' ? 'Log In' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-slate-500 mt-5 text-center">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              className="font-bold text-indigo-600 hover:underline"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setInfo(''); }}
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}
