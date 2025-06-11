import { supabase } from '@/lib/supabase';
import { AuthError, Session, User } from '@supabase/supabase-js';

// Enhanced error formatting with more specific cases
function formatError(error: AuthError | null) {
  if (!error) return null;
  
  // Map Supabase error codes/messages to user-friendly messages
  switch (error.message) {
    case 'Invalid login credentials':
      return 'Incorrect email or password.';
    case 'User already registered':
      return 'This email is already registered.';
    case 'Email not confirmed':
      return 'Please verify your email before logging in.';
    case 'JWT expired':
      return 'Your session has expired. Please log in again.';
    case 'Invalid JWT':
      return 'Invalid session. Please log in again.';
    default:
      return error.message || 'An unexpected error occurred.';
  }
}

export const authService = {
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error: formatError(error) };
  },
  
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error: formatError(error) };
  },
  
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error: formatError(error) };
  },
  
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    return { data, error: formatError(error) };
  },

  getUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    return { data, error: formatError(error) };
  },

  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    return { data, error: formatError(error) };
  },

  // Helper to check if user's email is verified
  isEmailVerified: (user: User | null) => {
    return !!user?.email_confirmed_at;
  },

  // Enhanced session management functions
  refreshSession: async () => {
    const { data, error } = await supabase.auth.refreshSession();
    return { data, error: formatError(error) };
  },

  // Get current session with auto-refresh if needed
  getCurrentSession: async (): Promise<{ data: { session: Session | null }, error: string | null }> => {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      return { data: { session: null }, error: formatError(error) };
    }

    // If session exists but is close to expiry (within 5 minutes), refresh it
    if (session) {
      const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : null;
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
      
      if (expiresAt && expiresAt < fiveMinutesFromNow) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        return { 
          data: { session: refreshData.session },
          error: formatError(refreshError)
        };
      }
    }

    return { data: { session }, error: null };
  },

  // Listen for auth state changes (for session persistence)
  onAuthStateChange: (callback: (event: any, session: Session | null) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },

  // Get session data from storage
  getPersistedSession: () => {
    return supabase.auth.getSession();
  },

  // Set session data in storage
  setPersistedSession: async (session: Session) => {
    // Supabase handles session storage internally
    // This is a placeholder for any additional session-related logic
    return { error: null };
  },

  // Clear persisted session data
  clearPersistedSession: async () => {
    await supabase.auth.signOut();
    return { error: null };
  }
};

export default authService; 