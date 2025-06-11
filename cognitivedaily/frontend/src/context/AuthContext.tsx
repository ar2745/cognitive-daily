import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext } from 'react';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  updateProfile: (data: { full_name?: string; email?: string }) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  const updateProfile = async (data: { full_name?: string; email?: string }) => {
    if (!auth.user) throw new Error("No user logged in");

    try {
      const { data: updatedUser, error } = await supabase.auth.updateUser({
        email: data.email,
        data: {
          full_name: data.full_name,
        },
      });

      if (error) throw error;
      auth.setUser(updatedUser.user);
    } catch (error: any) {
      throw new Error(error.message || "Failed to update profile");
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    if (!auth.user) throw new Error("No user logged in");

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
    } catch (error: any) {
      throw new Error(error.message || "Failed to update password");
    }
  };

  const value: AuthContextType = {
    user: auth.user,
    session: auth.session,
    loading: auth.loading,
    signIn: auth.signIn,
    signUp: auth.signUp,
    signOut: auth.signOut,
    signInWithGoogle: auth.signInWithGoogle,
    updateProfile,
    updatePassword,
    refreshSession: auth.refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
} 