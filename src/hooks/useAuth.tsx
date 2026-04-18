import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
  account_locked?: boolean;
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
  accountLockedDuringSignIn: boolean;
  clearAccountLockedState: () => void;
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

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);
  const [accountLockedDuringSignIn, setAccountLockedDuringSignIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        // For sign out events, clear everything immediately
        if (event === 'SIGNED_OUT' || !session) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          setInitialCheckComplete(true);
          // Don't clear accountLockedDuringSignIn here - let it persist
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch profile and verify portal access
          setTimeout(async () => {
            if (!mounted) return;
            try {
            const { data: profileData } = await (supabase as any)
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
              
              // Fetch role from user_roles table
              const { data: roleData } = await (supabase as any)
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id)
                .single();
              
          if (mounted && profileData) {
                const userRole = roleData?.role || 'user';
                
                // Portal isolation logic removed from auth hook
                // Each portal page (AdminDashboard, Dashboard) handles its own access control
                // This prevents race conditions during 2FA re-authentication
                
                setProfile({ ...profileData, role: userRole });
                setLoading(false);
                setInitialCheckComplete(true);
              }
            } catch (error) {
              console.error('Error fetching profile:', error);
              if (mounted) {
                setLoading(false);
                setInitialCheckComplete(true);
              }
            }
          }, 0);
        }
      }
    );

    // Check for existing session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Fetch user profile
        setTimeout(async () => {
          if (!mounted) return;
          try {
            const { data: profileData } = await (supabase as any)
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            // Fetch role from user_roles table
            const { data: roleData } = await (supabase as any)
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .single();
            
            if (mounted) {
              const userRole = roleData?.role || 'user';
              setProfile(profileData ? { ...profileData, role: userRole } : null);
              setLoading(false);
              setInitialCheckComplete(true);
            }
          } catch (error) {
            console.error('Error fetching profile:', error);
            if (mounted) {
              setLoading(false);
              setInitialCheckComplete(true);
            }
          }
        }, 0);
      } else {
        setLoading(false);
        setInitialCheckComplete(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
    try {
      // Clear any previous locked account state
      setAccountLockedDuringSignIn(false);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAccountLockedDuringSignIn(false);
  };

  const clearAccountLockedState = () => {
    setAccountLockedDuringSignIn(false);
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
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = data.publicUrl;

      // Update profile with new avatar URL
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
    loading: loading || !initialCheckComplete,
    accountLockedDuringSignIn,
    clearAccountLockedState,
    signUp,
    signIn,
    signOut,
    updateProfile,
    uploadAvatar
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};