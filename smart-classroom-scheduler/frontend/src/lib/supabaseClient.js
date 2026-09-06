import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Gracefully handle missing env vars — app still loads, auth just won't work
// until VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set in Vercel.
let supabase;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn(
    '[supabaseClient] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. ' +
    'Set these in Vercel → Project Settings → Environment Variables and redeploy.'
  );
  // Stub so the app doesn't crash on import
  supabase = {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ error: new Error('Supabase not configured') }),
      signOut: async () => {},
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: null, error: new Error('Supabase not configured') }) }) }),
    }),
  };
}

export { supabase };

/**
 * Fetches the app-level profile row for the currently authenticated Supabase user.
 */
export async function fetchCurrentUserProfile(session) {
  if (!session?.user) return null;
  if (!supabaseUrl || !supabaseKey) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error || !profile) {
    return {
      id: session.user.id,
      name: session.user.email.split('@')[0],
      email: session.user.email,
      role: session.user.user_metadata?.role || 'STUDENT',
    };
  }

  return {
    id: profile.id,
    name: profile.full_name,
    email: profile.email,
    role: profile.role,
    department_id: profile.department_id,
    faculty_id: profile.faculty_id,
    student_group_id: profile.student_group_id,
    avatar: profile.avatar_url,
  };
}
