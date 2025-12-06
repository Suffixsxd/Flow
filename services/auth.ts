
import { supabase } from './supabase';
import { User } from '../types';

export const mapSupabaseUser = (u: any): User => {
  return {
    id: u.id,
    username: u.user_metadata?.username || u.email?.split('@')[0] || 'User',
    email: u.email || '',
    // Use native Supabase field for verification status
    isVerified: !!u.email_confirmed_at, 
    createdAt: new Date(u.created_at || Date.now()).getTime()
  };
};

export const registerUser = async (email: string, password: string, username: string): Promise<User> => {
  // We include the username in metadata so it's available immediately
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { 
        username
      }
    }
  });

  if (error) throw error;
  if (!data.user) throw new Error("User creation failed: No user data returned.");
  
  return mapSupabaseUser(data.user);
};

export const loginUser = async (email: string, password: string): Promise<User> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  if (!data.user) throw new Error("Login failed");

  return mapSupabaseUser(data.user);
};

export const logoutUser = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) console.error("Error signing out:", error);
};

export const subscribeToAuthChanges = (callback: (user: any | null) => void) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      callback(mapSupabaseUser(session.user));
    } else {
      callback(null);
    }
  });

  return () => subscription.unsubscribe();
};
