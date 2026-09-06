import React, { useState } from 'react';
import { X, User, Mail, Image, Save, Loader2, CheckCircle2 } from 'lucide-react';

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150",
];

export default function EditProfileModal({ currentUser, onClose, onSave }) {
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const updates = { name: name.trim(), email: email.trim(), avatar: avatar.trim() };

    try {
      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error('Could not save changes to the server.');
      const updatedUser = await res.json();

      onSave(updatedUser);
      setSuccess(true);
      setTimeout(() => onClose(), 700);
    } catch (err) {
      // Even if the backend call fails (e.g. offline demo), still apply the
      // edit locally so the UI reflects the change immediately.
      onSave({ ...currentUser, ...updates });
      setError('Saved locally — could not reach the server to persist this change.');
      setTimeout(() => onClose(), 1200);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-indigo-600 to-blue-700 text-white flex items-center justify-between">
          <h3 className="font-bold text-sm">Edit Profile</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="flex justify-center">
            <img
              src={avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"}
              alt="Avatar preview"
              className="w-20 h-20 rounded-2xl object-cover ring-4 ring-indigo-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Avatar URL</label>
            <div className="relative">
              <Image className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="Paste an image URL"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2 mt-2">
              {AVATAR_PRESETS.map((url) => (
                <button
                  type="button"
                  key={url}
                  onClick={() => setAvatar(url)}
                  className={`w-9 h-9 rounded-lg overflow-hidden ring-2 transition-all ${avatar === url ? 'ring-indigo-500' : 'ring-transparent hover:ring-slate-300'}`}
                >
                  <img src={url} alt="preset avatar" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-[11px] text-amber-600 font-medium">{error}</p>}
          {success && !error && (
            <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Profile updated!
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-3.5 h-3.5" /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
