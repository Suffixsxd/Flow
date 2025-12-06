export interface Note {
  id: string;
  title: string;
  rawTranscript: string;
  curatedContent: string;
  createdAt: number;
  style: NoteStyle;
  mindMapMermaid?: string;
  flashcards?: string; // JSON string of Flashcard[]
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export type NoteStyle = 'default' | 'academic' | 'creative' | 'meeting';

export interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
      reasoning_details?: any;
    };
  }[];
}

export type AppState = 'home' | 'recording' | 'viewing';