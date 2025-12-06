import { Note, User } from '../types';

declare var alasql: any;

const DB_NAME = 'aura_db';
const TABLE_NOTES = 'notes';
const TABLE_USERS = 'users';
const TABLE_CODES = 'verification_codes';

export const initDB = () => {
  try {
    if (typeof alasql === 'undefined') {
      console.warn("Alasql not loaded.");
      return;
    }

    alasql(`CREATE LOCALSTORAGE DATABASE IF NOT EXISTS ${DB_NAME}`);
    try { alasql(`ATTACH LOCALSTORAGE DATABASE ${DB_NAME}`); } catch (e) {}
    alasql(`USE ${DB_NAME}`);
    
    // Create Users Table (Updated with email and verified status)
    alasql(`CREATE TABLE IF NOT EXISTS ${TABLE_USERS} (
      id STRING PRIMARY KEY,
      username STRING UNIQUE,
      email STRING UNIQUE,
      password STRING,
      isVerified BOOLEAN,
      createdAt NUMBER
    )`);

    // Create Verification Codes Table
    alasql(`CREATE TABLE IF NOT EXISTS ${TABLE_CODES} (
      email STRING,
      code STRING,
      createdAt NUMBER
    )`);

    // Create Notes Table
    alasql(`CREATE TABLE IF NOT EXISTS ${TABLE_NOTES} (
      id STRING PRIMARY KEY,
      userId STRING,
      title STRING,
      rawTranscript STRING,
      curatedContent STRING,
      createdAt NUMBER,
      style STRING,
      mindMapMermaid STRING,
      flashcards STRING
    )`);

    // Migrations
    try { alasql(`ALTER TABLE ${TABLE_NOTES} ADD COLUMN userId STRING`); } catch(e){}
    try { alasql(`ALTER TABLE ${TABLE_NOTES} ADD COLUMN mindMapMermaid STRING`); } catch(e){}
    try { alasql(`ALTER TABLE ${TABLE_NOTES} ADD COLUMN flashcards STRING`); } catch(e){}
    try { alasql(`ALTER TABLE ${TABLE_USERS} ADD COLUMN email STRING`); } catch(e){}
    try { alasql(`ALTER TABLE ${TABLE_USERS} ADD COLUMN isVerified BOOLEAN`); } catch(e){}

  } catch (e) {
    console.error("Failed to initialize SQL database:", e);
  }
};

// --- AUTHENTICATION ---

export const registerUser = (username: string, email: string, password: string): string => {
    if (typeof alasql === 'undefined') throw new Error("DB Error");
    
    // Check if user exists (username or email)
    const existing = alasql(`SELECT * FROM ${TABLE_USERS} WHERE username = ? OR email = ?`, [username, email]);
    if (existing.length > 0) {
        throw new Error("Username or Email already taken");
    }

    const newUser: User = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        username,
        email,
        isVerified: false,
        createdAt: Date.now()
    };

    alasql(`INSERT INTO ${TABLE_USERS} VALUES (?, ?, ?, ?, ?, ?)`, 
      [newUser.id, newUser.username, newUser.email, password, false, newUser.createdAt]
    );

    // Generate Verification Code (6 digits)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Clean old codes for this email
    alasql(`DELETE FROM ${TABLE_CODES} WHERE email = ?`, [email]);
    alasql(`INSERT INTO ${TABLE_CODES} VALUES (?, ?, ?)`, [email, code, Date.now()]);

    return code; // Return code to simulation UI
};

export const verifyUser = (email: string, code: string): boolean => {
    if (typeof alasql === 'undefined') throw new Error("DB Error");

    const record = alasql(`SELECT * FROM ${TABLE_CODES} WHERE email = ? AND code = ?`, [email, code]);
    
    if (record.length === 0) {
        throw new Error("Invalid verification code");
    }

    // Verify User
    alasql(`UPDATE ${TABLE_USERS} SET isVerified = TRUE WHERE email = ?`, [email]);
    // Clean up code
    alasql(`DELETE FROM ${TABLE_CODES} WHERE email = ?`, [email]);

    return true;
};

export const loginUser = (identifier: string, password: string): User => {
    if (typeof alasql === 'undefined') throw new Error("DB Error");
    
    // Allow login by username OR email
    const users = alasql(`SELECT * FROM ${TABLE_USERS} WHERE (username = ? OR email = ?) AND password = ?`, [identifier, identifier, password]);
    
    if (users.length === 0) {
        throw new Error("Invalid credentials");
    }

    const user = users[0];

    if (!user.isVerified) {
        throw new Error("Account not verified. Please verify your email.");
    }
    
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        isVerified: user.isVerified,
        createdAt: user.createdAt
    };
};

// --- NOTES (Scoped by User) ---

export const getNotes = (userId: string): Note[] => {
  try {
    if (typeof alasql === 'undefined') return [];
    return alasql(`SELECT * FROM ${TABLE_NOTES} WHERE userId = ? ORDER BY createdAt DESC`, [userId]) || [];
  } catch (e) {
    console.error("Failed to fetch notes:", e);
    return [];
  }
};

export const addNote = (note: Note) => {
  try {
    if (typeof alasql === 'undefined') return;
    alasql(`INSERT INTO ${TABLE_NOTES} VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
      [note.id, note.userId, note.title, note.rawTranscript, note.curatedContent, note.createdAt, note.style, note.mindMapMermaid || "", note.flashcards || ""]
    );
  } catch (e) {
    console.error("Failed to add note:", e);
  }
};

export const updateNote = (id: string, rawTranscript: string, curatedContent: string) => {
  try {
    if (typeof alasql === 'undefined') return;
    alasql(`UPDATE ${TABLE_NOTES} SET rawTranscript = ?, curatedContent = ? WHERE id = ?`, 
      [rawTranscript, curatedContent, id]
    );
  } catch (e) {
    console.error("Failed to update note:", e);
  }
};

export const updateMindMap = (id: string, mermaid: string) => {
  try {
    if (typeof alasql === 'undefined') return;
    alasql(`UPDATE ${TABLE_NOTES} SET mindMapMermaid = ? WHERE id = ?`, [mermaid, id]);
  } catch (e) {
    console.error("Failed to update mind map:", e);
  }
};

export const updateFlashcards = (id: string, flashcardsJson: string) => {
  try {
    if (typeof alasql === 'undefined') return;
    alasql(`UPDATE ${TABLE_NOTES} SET flashcards = ? WHERE id = ?`, [flashcardsJson, id]);
  } catch (e) {
    console.error("Failed to update flashcards:", e);
  }
};

export const deleteNote = (id: string) => {
  try {
    if (typeof alasql === 'undefined') return;
    alasql(`DELETE FROM ${TABLE_NOTES} WHERE id = ?`, [id]);
  } catch (e) {
    console.error("Failed to delete note:", e);
  }
};