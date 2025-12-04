export interface Note {
  id: string;
  title: string;
  rawTranscript: string;
  curatedContent: string;
  createdAt: number;
  style: NoteStyle;
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
