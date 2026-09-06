import React, { useState, useEffect } from 'react';
import { 
  Calendar, Filter, Building2, User, Clock, BookOpen, 
  CheckCircle2, X, Sparkles, Layers, Info 
} from 'lucide-react';

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const VIT_TIME_SLOTS = [
  { id: "08:30", label: "08:30 - 10:00" },
  { id: "10:05", label: "10:05 - 11:35" },
  { id: "11:40", label: "11:40 - 13:10" },
  { id: "LUNCH", label: "Lunch (13:10 - 13:15)", isLunch: true },
  { id: "13:15", label: "13:15 - 14:45" },
  { id: "14:50", label: "14:50 - 16:20" },
  { id: "16:25", label: "16:25 - 17:55" },
  { id: "18:00", label: "18:00 - 19:30" }
];

const VIT_SLOT_GRID = {
  "Monday":    {"08:30": "A11", "10:05": "B11", "11:40": "C11", "13:15": "A21", "14:50": "A14", "16:25": "B21", "18:00": "C21"},
  "Tuesday":   {"08:30": "D11", "10:05": "E11", "11:40": "F11", "13:15": "D21", "14:50": "E14", "16:25": "E21", "18:00": "F21"},
  "Wednesday": {"08:30": "A12", "10:05": "B12", "11:40": "C12", "13:15": "A22", "14:50": "B14", "16:25": "B22", "18:00": "A24"},
  "Thursday":  {"08:30": "D12", "10:05": "E12", "11:40": "F12", "13:15": "D22", "14:50": "F14", "16:25": "E22", "18:00": "F22"},
  "Friday":    {"08:30": "A13", "10:05": "B13", "11:40": "C13", "13:15": "A23", "14:50": "C14", "16:25": "B23", "18:00": "B24"},
  "Saturday":  {"08:30": "D13", "10:05": "E13", "11:40": "F13", "13:15": "D23", "14:50": "D14", "16:25": "D24", "18:00": "E23"}
};

export default function TimetableView({ userRole, currentUser }) {
  const [timetables, setTimetables] = useState([]);
  const [selectedTimetableId, setSelectedTimetableId] = useState('');
  const [selectedSection, setSelectedSection] = useState('sg_cse_4a');
  const [selectedSlotDetails, setSelectedSlotDetails] = useState(null);

  useEffect(() => {
    fetch('/api/timetables')
      .then(res => res.json())
      .then(data => {
        setTimetables(data);
        if (data.length > 0) {
          const published = data.find(t => t.status === 'Published');
          setSelectedTimetableId(published ? published.id : data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const activeTT = timetables.find(t => t.id === selectedTimetableId) || timetables[0];
  const allSlots = activeTT?.slots || [];

  const filteredSlots = allSlots.filter(s => {
    if (userRole === 'STUDENT') return s.student_group_id === 'sg_cse_4a';
    if (userRole === 'FACULTY') return s.faculty_id === 'fac_rahul';
    if (selectedSection && selectedSection !== 'all') return s.student_group_id === selectedSection;
    return true;
  });

  const getSlotForDayAndTime = (day, slotTime) => {
    return filteredSlots.find(s => s.day === day && s.time_slot === slotTime);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Schedule Metadata Bar */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" />
            <span>VIT Official Slot Matrix</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">
            {activeTT?.name || "VIT Academic Timetable"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Status: <span className="font-bold text-emerald-600 uppercase">{activeTT?.status || "Published"}</span> • Optimization Score: <span className="font-bold text-indigo-600">{activeTT?.optimization_score || 96.5}%</span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-700">Filter Section:</span>
            <select
              value={selectedSection}
              onChange={e => setSelectedSection(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="all">All Sections</option>
              <option value="sg_cse_4a">B.Tech CSE Sem 4 Sec A</option>
              <option value="sg_cse_4b">B.Tech CSE Sem 4 Sec B</option>
              <option value="sg_ece_4a">B.Tech ECE Sem 4 Sec A</option>
            </select>
          </div>
        </div>
      </div>

      {/* VIT Official Weekly Grid Calendar */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-x-auto">
        <table className="w-full min-w-[950px] border-collapse text-xs">
          <thead>
            <tr>
              <th className="p-3 w-32 bg-indigo-900 text-white font-extrabold uppercase tracking-wider text-[11px] rounded-tl-2xl border-b border-indigo-800 text-center">
                Theory Slot / Time
              </th>
              {DAYS.map(day => (
                <th key={day} className="p-3 bg-slate-100 text-slate-900 font-extrabold text-center uppercase tracking-wider text-xs border-b border-slate-200 border-l border-slate-200/60">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {VIT_TIME_SLOTS.map(slotObj => {
              if (slotObj.isLunch) {
                return (
                  <tr key="LUNCH" className="bg-indigo-50/60 border-y border-indigo-100">
                    <td className="p-2.5 font-extrabold text-indigo-700 text-center bg-indigo-100/60 text-xs">
                      {slotObj.label}
                    </td>
                    <td colSpan={6} className="p-2.5 text-center font-extrabold text-indigo-600 text-xs uppercase tracking-widest bg-indigo-50/80">
                      🍱 Lunch Break (13:10 - 13:15)
                    </td>
                  </tr>
                );
              }

              const slotTime = slotObj.id;

              return (
                <tr key={slotTime} className="border-b border-slate-100 hover:bg-slate-50/40">
                  <td className="p-3 font-extrabold text-slate-700 text-center bg-slate-50 border-r border-slate-200/60 text-[11px]">
                    <div>{slotObj.label}</div>
                  </td>
                  {DAYS.map(day => {
                    const slotCode = VIT_SLOT_GRID[day]?.[slotTime] || '';
                    const classItem = getSlotForDayAndTime(day, slotTime);

                    return (
                      <td key={day} className="p-2 border-l border-slate-100 min-h-[90px] h-24 vertical-top relative">
                        {/* Background Slot Code Badge */}
                        <span className="absolute top-2 right-2 text-[10px] font-black text-slate-300 pointer-events-none select-none">
                          {slotCode}
                        </span>

                        {classItem ? (
                          <div
                            onClick={() => setSelectedSlotDetails({ ...classItem, slotCode })}
                            className={`h-full p-3 rounded-2xl border text-left cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md flex flex-col justify-between relative z-10 ${
                              classItem.is_lab
                                ? 'bg-amber-50/90 border-amber-300 text-amber-900'
                                : 'bg-indigo-50/90 border-indigo-300 text-indigo-900'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-black text-xs text-indigo-700 bg-white/90 px-1.5 py-0.5 rounded border border-indigo-200 shadow-2xs">
                                  {slotCode}
                                </span>
                                {classItem.is_lab && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded font-extrabold bg-amber-200 text-amber-900">
                                    LAB
                                  </span>
                                )}
                              </div>
                              <p className="font-extrabold text-xs text-slate-900 line-clamp-1 mt-1">{classItem.subject_name}</p>
                              <p className="text-[10px] text-slate-600 font-medium line-clamp-1">{classItem.faculty_name}</p>
                            </div>

                            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/40 text-[10px]">
                              <span className="font-extrabold text-indigo-800 bg-white/90 px-2 py-0.5 rounded-md shadow-2xs">
                                {classItem.classroom_name}
                              </span>
                              <span className="text-slate-500 font-bold">{classItem.subject_code.split(' ')[0]}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full rounded-2xl border border-dashed border-slate-200/70 bg-slate-50/20 flex items-center justify-center text-[11px] text-slate-400 font-bold">
                            {slotCode} (Free)
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Class Detail Drawer Modal */}
      {selectedSlotDetails && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-base text-slate-900">VIT Slot Information</h3>
              </div>
              <button onClick={() => setSelectedSlotDetails(null)} className="p-1 rounded-full hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 uppercase font-bold text-[10px]">Subject</p>
                  <p className="font-extrabold text-sm text-slate-900">{selectedSlotDetails.subject_name}</p>
                </div>
                <span className="text-xs font-black px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full border border-indigo-300">
                  Slot: {selectedSlotDetails.slotCode}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-slate-400 font-bold text-[10px]">FACULTY MEMBER</p>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedSlotDetails.faculty_name}</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-slate-400 font-bold text-[10px]">CLASSROOM LOCATION</p>
                  <p className="font-bold text-indigo-600 mt-0.5">{selectedSlotDetails.classroom_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-slate-400 font-bold text-[10px]">DAY & TIME WINDOW</p>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedSlotDetails.day} @ {selectedSlotDetails.time_slot}</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-slate-400 font-bold text-[10px]">STUDENT GROUP</p>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedSlotDetails.student_group_name}</p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedSlotDetails(null)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
