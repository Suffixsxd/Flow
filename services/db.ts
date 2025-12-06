
import { supabase } from './supabase';
import { Note, User } from '../types';

// --- NOTES (Scoped by User) ---

export const getNotes = async (userId: string): Promise<Note[]> => {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Failed to fetch notes:", error);
    return [];
  }

  return (data || []).map((n: any) => ({
    id: n.id,
    userId: n.user_id,
    title: n.title,
    rawTranscript: n.raw_transcript,
    curatedContent: n.curated_content,
    createdAt: n.created_at,
    style: n.style,
    mindMapMermaid: n.mind_map_mermaid,
    flashcards: n.flashcards
  }));
};

export const addNote = async (note: Note) => {
  const dbNote = {
    id: note.id,
    user_id: note.userId,
    title: note.title,
    raw_transcript: note.rawTranscript,
    curated_content: note.curatedContent,
    created_at: note.createdAt,
    style: note.style,
    mind_map_mermaid: note.mindMapMermaid,
    flashcards: note.flashcards
  };

  const { error } = await supabase.from('notes').insert(dbNote);
  if (error) console.error("Failed to add note:", error);
};

export const updateNote = async (id: string, rawTranscript: string, curatedContent: string) => {
  const { error } = await supabase
    .from('notes')
    .update({ 
      raw_transcript: rawTranscript, 
      curated_content: curatedContent 
    })
    .eq('id', id);

  if (error) console.error("Failed to update note:", error);
};

export const updateMindMap = async (id: string, mermaid: string) => {
  const { error } = await supabase
    .from('notes')
    .update({ mind_map_mermaid: mermaid })
    .eq('id', id);

  if (error) console.error("Failed to update mind map:", error);
};

export const updateFlashcards = async (id: string, flashcardsJson: string) => {
  const { error } = await supabase
    .from('notes')
    .update({ flashcards: flashcardsJson })
    .eq('id', id);

  if (error) console.error("Failed to update flashcards:", error);
};

export const deleteNote = async (id: string) => {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id);

  if (error) console.error("Failed to delete note:", error);
};

// --- USERS ---

export const createUserDoc = async (user: User) => {
  const dbUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    is_verified: user.isVerified, // This will be false initially
    created_at: user.createdAt
  };

  try {
      // Try to create the user profile in public table
      const { error } = await supabase.from('users').upsert(dbUser, { onConflict: 'id' });
      
      if (error) {
          // If we hit the Foreign Key race condition (Auth user not yet propagated),
          // we SWALLOW the error. 
          // We rely on the Auth Listener in App.tsx to create this doc when the user actually logs in.
          if (error.code === '23503') {
              console.info("User doc creation deferred (FK race condition) - will be created on login.");
              return; 
          }
          throw error;
      }

  } catch (error: any) {
       console.error("Failed to create user doc:", JSON.stringify(error, null, 2));
  }
};

export const getUserDoc = async (userId: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    username: data.username,
    email: data.email,
    isVerified: data.is_verified,
    createdAt: data.created_at
  };
};
