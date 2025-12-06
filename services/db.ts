import { Note } from '../types';

declare var alasql: any;

const DB_NAME = 'aura_db';
const TABLE_NAME = 'notes';

export const initDB = () => {
  try {
    // Check if alasql is loaded
    if (typeof alasql === 'undefined') {
      console.warn("Alasql not loaded, falling back to non-persistent storage.");
      return;
    }

    // Try to create the database if it doesn't exist
    alasql(`CREATE LOCALSTORAGE DATABASE IF NOT EXISTS ${DB_NAME}`);
    
    // Attach and Use. Note: CREATE might succeed but ATTACH might throw if already attached.
    try {
        alasql(`ATTACH LOCALSTORAGE DATABASE ${DB_NAME}`);
    } catch (e) {
        // Ignored: Database likely already attached
    }
    
    alasql(`USE ${DB_NAME}`);
    
    // Create table with new columns if it doesn't exist
    // Note: If table exists from old version, alasql won't alter it automatically in this simple setup.
    // For a robust app, we'd check columns and ALTER TABLE.
    // For this prototype, we assume fresh start or rely on flexible INSERT (Alasql is loose with schema if not strict)
    alasql(`CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      id STRING PRIMARY KEY,
      title STRING,
      rawTranscript STRING,
      curatedContent STRING,
      createdAt NUMBER,
      style STRING,
      mindMapMermaid STRING,
      flashcards STRING
    )`);

    // Hacky migration for existing tables: try to add columns if missing
    try { alasql(`ALTER TABLE ${TABLE_NAME} ADD COLUMN mindMapMermaid STRING`); } catch(e){}
    try { alasql(`ALTER TABLE ${TABLE_NAME} ADD COLUMN flashcards STRING`); } catch(e){}

  } catch (e) {
    console.error("Failed to initialize SQL database:", e);
  }
};

export const getNotes = (): Note[] => {
  try {
    if (typeof alasql === 'undefined') return [];
    return alasql(`SELECT * FROM ${TABLE_NAME} ORDER BY createdAt DESC`) || [];
  } catch (e) {
    console.error("Failed to fetch notes:", e);
    return [];
  }
};

export const addNote = (note: Note) => {
  try {
    if (typeof alasql === 'undefined') return;
    alasql(`INSERT INTO ${TABLE_NAME} VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
      [note.id, note.title, note.rawTranscript, note.curatedContent, note.createdAt, note.style, note.mindMapMermaid || "", note.flashcards || ""]
    );
  } catch (e) {
    console.error("Failed to add note:", e);
  }
};

export const updateNote = (id: string, rawTranscript: string, curatedContent: string) => {
  try {
    if (typeof alasql === 'undefined') return;
    alasql(`UPDATE ${TABLE_NAME} SET rawTranscript = ?, curatedContent = ? WHERE id = ?`, 
      [rawTranscript, curatedContent, id]
    );
  } catch (e) {
    console.error("Failed to update note:", e);
  }
};

export const updateMindMap = (id: string, mermaid: string) => {
  try {
    if (typeof alasql === 'undefined') return;
    alasql(`UPDATE ${TABLE_NAME} SET mindMapMermaid = ? WHERE id = ?`, [mermaid, id]);
  } catch (e) {
    console.error("Failed to update mind map:", e);
  }
};

export const updateFlashcards = (id: string, flashcardsJson: string) => {
  try {
    if (typeof alasql === 'undefined') return;
    alasql(`UPDATE ${TABLE_NAME} SET flashcards = ? WHERE id = ?`, [flashcardsJson, id]);
  } catch (e) {
    console.error("Failed to update flashcards:", e);
  }
};

export const deleteNote = (id: string) => {
  try {
    if (typeof alasql === 'undefined') return;
    alasql(`DELETE FROM ${TABLE_NAME} WHERE id = ?`, [id]);
  } catch (e) {
    console.error("Failed to delete note:", e);
  }
};