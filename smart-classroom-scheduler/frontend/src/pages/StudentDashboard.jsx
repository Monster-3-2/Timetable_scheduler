import React, { useState } from 'react';
import { 
  GraduationCap, Clock, Calendar, Sparkles, BookOpen, 
  MapPin, CheckCircle2, Zap, Award
} from 'lucide-react';

export default function StudentDashboard({ onNavigate }) {
  const [studyPlan, setStudyPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  const handleGenerateStudyPlan = async () => {
    setLoadingPlan(true);
    try {
      const res = await fetch('/api/study-planner/sg_cse_4a');
      const data = await res.json();
      setStudyPlan(data.recommended_study_plan);
    } catch (err) {
      setStudyPlan([
        { time: "12:00 PM - 01:00 PM", activity: "Lunch & Relaxation Block", type: "break" },
        { time: "01:00 PM - 02:00 PM", activity: "DSA Lab Pre-lab Revision (Computer Lab 1 Lounge)", type: "study" },
        { time: "03:30 PM - 05:00 PM", activity: "DBMS Queries Practice & Quiz Preparation", type: "practice" }
      ]);
    } finally {
      setLoadingPlan(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-sky-900 via-blue-800 to-indigo-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 uppercase tracking-wider">
            Student Portal
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight mt-1">Welcome back, Aaryan Verma</h2>
          <p className="text-xs text-sky-200 mt-1">B.Tech Computer Science & Engineering • Semester 4 Section A</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate('find_best_faculty')}
            className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-xs flex items-center space-x-2 shadow-lg transition-all"
          >
            <Award className="w-4 h-4 text-slate-900" />
            <span>Find Best Faculty</span>
          </button>
          <button
            onClick={() => onNavigate('timetables')}
            className="px-5 py-3 rounded-2xl bg-white text-sky-950 font-extrabold text-xs flex items-center space-x-2 shadow-lg hover:bg-sky-50 transition-all"
          >
            <Calendar className="w-4 h-4 text-sky-600" />
            <span>Full Schedule</span>
          </button>
        </div>
      </div>

      {/* Next Class Highlight Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-extrabold text-lg">
            10:00
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">NEXT CLASS IN 25 MINS</span>
            <h3 className="text-lg font-extrabold">Artificial Intelligence (CSE302)</h3>
            <p className="text-xs text-indigo-100 mt-0.5">Faculty: Dr. Rahul Sharma • Room: C301 (Technology Tower A)</p>
          </div>
        </div>

        <div className="shrink-0">
          <span className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md text-white font-extrabold text-xs flex items-center space-x-1.5 border border-white/20">
            <MapPin className="w-4 h-4 text-sky-300" />
            <span>Room C301</span>
          </span>
        </div>
      </div>

      {/* AI Study Planner Section */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-extrabold text-base text-slate-900">AI Study Planner</h3>
              <p className="text-xs text-slate-500">Auto-detects schedule gaps and builds custom revision blocks</p>
            </div>
          </div>

          <button
            onClick={handleGenerateStudyPlan}
            disabled={loadingPlan}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center space-x-2 shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${loadingPlan ? 'animate-spin' : ''}`} />
            <span>Generate Today's Study Plan</span>
          </button>
        </div>

        {studyPlan ? (
          <div className="space-y-2.5 pt-2 animate-in fade-in">
            {studyPlan.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-indigo-600 w-32 shrink-0">{item.time}</span>
                  <span className="font-semibold text-slate-800">{item.activity}</span>
                </div>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  item.type === 'break' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {item.type}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/60 text-center text-xs text-slate-500">
            Click "Generate Today's Study Plan" to calculate optimal free period revision slots.
          </div>
        )}
      </div>
    </div>
  );
}
