import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  appState: 'splash' | 'login' | 'main';
  setAppState: (state: 'splash' | 'login' | 'main') => void;
  signIn: (email: string, password: string) => Promise<{ error: any; success: boolean }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any; success: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any; success: boolean }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [appState, setAppState] = useState<'splash' | 'login' | 'main'>('splash');

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setAppState('login');
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session) {
            setAppState('main');
          } else {
            setAppState('login');
          }
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        setAppState('login');
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session) {
            setAppState('main');
          } else if (appState !== 'splash') {
            setAppState('login');
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
          setAppState('login');
        } finally {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { error: error.message, success: false };
      }
      
      return { error: null, success: true };
    } catch (error) {
      return { error: 'Erro ao fazer login. Tente novamente.', success: false };
    }
  };

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || '',
          },
        },
      });
      
      if (error) {
        return { error: error.message, success: false };
      }
      
      return { error: null, success: true };
    } catch (error) {
      return { error: 'Erro ao criar conta. Tente novamente.', success: false };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        return { error: error.message, success: false };
      }
      
      return { error: null, success: true };
    } catch (error) {
      return { error: 'Erro ao enviar email de redefinição. Tente novamente.', success: false };
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    appState,
    setAppState,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
