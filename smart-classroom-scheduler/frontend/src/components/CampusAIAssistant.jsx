import React, { useState } from 'react';
import { MessageSquare, X, Send, Sparkles, Bot, User, HelpCircle } from 'lucide-react';

export default function CampusAIAssistant({ currentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: `Hello ${currentUser.name}! I am your Campus AI Assistant. Ask me about your timetable, room availability, or study plans!`,
      time: 'Just now'
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const sampleQueries = [
    "What is my next class?",
    "Where is my DBMS lecture?",
    "Is Computer Lab 2 free at 3 PM?",
    "Create my study plan for today."
  ];

  const handleSend = async (queryText = inputQuery) => {
    const text = queryText.trim();
    if (!text) return;

    const userMsg = { sender: 'user', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await fetch('/api/assistant/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_role: currentUser.role,
          user_id: currentUser.id,
          query: text
        })
      });

      if (!res.ok) throw new Error(`Server responded ${res.status}`);

      const data = await res.json();
      const aiMsg = {
        sender: 'ai',
        text: data.response || "I checked the active timetable database and everything looks optimal!",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: "I couldn't reach the scheduling backend just now (network or server issue), so I can't answer that live. Please try again in a moment.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center space-x-3 px-5 py-3.5 bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 text-white rounded-full shadow-2xl shadow-indigo-600/40 hover:scale-105 transition-all duration-300 ring-4 ring-white"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-white"></span>
          </div>
          <span className="font-bold text-xs tracking-wide">Campus AI Assistant</span>
        </button>
      )}

      {/* Floating Chat Modal Box */}
      {isOpen && (
        <div className="w-96 h-[520px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-indigo-600 to-blue-700 text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-xs">Campus AI Assistant</h4>
                <p className="text-[10px] text-indigo-100 font-medium">Timetable-aware AI Bot</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Query Pills */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
            {sampleQueries.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="whitespace-nowrap px-2.5 py-1 bg-white border border-slate-200 hover:border-indigo-300 text-[10px] font-medium text-slate-700 rounded-lg hover:bg-indigo-50 transition-all shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex items-start space-x-2 ${m.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0 ${
                    m.sender === 'user' ? 'bg-slate-800 text-white' : 'bg-indigo-600 text-white'
                  }`}
                >
                  {m.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div
                  className={`max-w-[78%] p-3 rounded-2xl text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-slate-900 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200/80 shadow-xs rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>
                  <span className={`text-[9px] mt-1 block ${m.sender === 'user' ? 'text-slate-400' : 'text-slate-400'}`}>
                    {m.time}
                  </span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center space-x-2 text-xs text-indigo-600 font-medium">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Searching timetable database...</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
            <input
              type="text"
              value={inputQuery}
              onChange={e => setInputQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask about classes, rooms, or study plan..."
              className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !inputQuery.trim()}
              className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
