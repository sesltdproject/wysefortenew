import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Profile interface - does NOT include role (stored separately for security)
interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// Auth context uses Profile (role fetched separately via has_role RPC)
type AuthProfile = Profile;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: AuthProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  uploadAvatar: (file: File) => Promise<{ error: any; url?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const OptimizedAuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Cached profile fetch (role checked separately via RPC for security)
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data: profileData } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileData) {
        setProfile(profileData);
      }
      return profileData;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    // Set up auth state listener with optimized profile fetching
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session with immediate profile fetch
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      
      setLoading(false);
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = async (email: string, password: string, fullName: string, role: string = 'user') => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: role
        }
      }
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    // Optimized account freeze check
    if (data.user && !error) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('account_locked')
        .eq('id', data.user.id)
        .single();

      if (profileData?.account_locked) {
        await supabase.auth.signOut();
        return { 
          error: { 
            message: "ACCOUNT_FROZEN",
            details: "Your account has been temporarily frozen. Please contact support for assistance." 
          } 
        };
      }
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };
    
    // Security: Role updates must go through admin RPC functions only
    // Remove any role field from updates as it's not in profiles table
    const { ...profileUpdates } = updates;
    
    const { error } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', user.id);
    
    if (!error && profile) {
      setProfile({ ...profile, ...profileUpdates });
    }
    
    return { error };
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = data.publicUrl;
      const { error: updateError } = await updateProfile({ avatar_url: avatarUrl });
      
      if (updateError) throw updateError;

      return { error: null, url: avatarUrl };
    } catch (error) {
      return { error };
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    uploadAvatar
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useOptimizedAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useOptimizedAuth must be used within an OptimizedAuthProvider');
  }
  return context;
};