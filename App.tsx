
import React, { useState, useEffect, useRef } from 'react';
import { Settings, ChevronLeft, MoreHorizontal, Copy, Check, Clock, Sparkles, MicOff, Trash2, ArrowRight, Download, ChevronDown, ChevronUp, Network, BookOpen, FileText, Loader2, Wand2, LogIn, LogOut, User as UserIcon, X, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DynamicIsland } from './components/DynamicIsland';
import { FadeText } from './components/FadeText';
import { MindMap } from './components/MindMap';
import { Flashcards } from './components/Flashcards';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { curateNote, refineNote, generateMindMap, generateFlashcards } from './services/openRouter';
import { parseMultipleFiles } from './services/fileParser';
import { Note, NoteStyle, Flashcard, User } from './types';
import { getNotes, addNote, updateNote, updateMindMap, updateFlashcards, deleteNote as deleteNoteDB, createUserDoc, getUserDoc } from './services/db';
import { loginUser, registerUser, logoutUser, subscribeToAuthChanges } from './services/auth';

// Icons for formatting
const FormatIcons = {
  default: Sparkles,
  academic: Clock,
  creative: MoreHorizontal,
  meeting: Check,
};

type ViewMode = 'notes' | 'mindmap' | 'flashcards';

// Custom Audio Frequency Logo
const Logo: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <motion.path 
      initial={{ d: "M4 10V14" }}
      animate={{ d: ["M4 10V14", "M4 8V16", "M4 11V13", "M4 10V14"] }}
      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0 }}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    />
    <motion.path 
      initial={{ d: "M8 8V16" }}
      animate={{ d: ["M8 8V16", "M8 6V18", "M8 9V15", "M8 8V16"] }}
      transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut", delay: 0.2 }}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    />
    <motion.path 
      initial={{ d: "M12 5V19" }}
      animate={{ d: ["M12 5V19", "M12 3V21", "M12 6V18", "M12 5V19"] }}
      transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut", delay: 0.1 }}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    />
    <motion.path 
      initial={{ d: "M16 8V16" }}
      animate={{ d: ["M16 8V16", "M16 5V19", "M16 9V15", "M16 8V16"] }}
      transition={{ repeat: Infinity, duration: 1.3, ease: "easeInOut", delay: 0.3 }}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    />
    <motion.path 
      initial={{ d: "M20 10V14" }}
      animate={{ d: ["M20 10V14", "M20 7V17", "M20 11V13", "M20 10V14"] }}
      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.4 }}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    />
  </svg>
);

// Loading Skeleton for Notes
const LoadingSkeleton = () => (
  <div className="w-full space-y-4 animate-pulse">
    <div className="h-4 bg-white/10 rounded-full w-3/4"></div>
    <div className="space-y-2">
      <div className="h-3 bg-white/5 rounded-full w-full"></div>
      <div className="h-3 bg-white/5 rounded-full w-5/6"></div>
      <div className="h-3 bg-white/5 rounded-full w-4/6"></div>
    </div>
    <div className="h-4 bg-white/10 rounded-full w-1/2 mt-6"></div>
    <div className="space-y-2">
      <div className="h-3 bg-white/5 rounded-full w-full"></div>
      <div className="h-3 bg-white/5 rounded-full w-11/12"></div>
    </div>
  </div>
);

const App: React.FC = () => {
  // State
  const [showLanding, setShowLanding] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<ViewMode>('notes');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferredStyle, setPreferredStyle] = useState<NoteStyle>('default');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  
  // Generation States
  const [isCurating, setIsCurating] = useState(false);
  const [isGeneratingMap, setIsGeneratingMap] = useState(false);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);

  const activeNote = notes.find(n => n.id === activeNoteId);

  const { 
    isListening, 
    isPaused, 
    transcript, 
    startListening, 
    stopListening, 
    togglePause,
    resetTranscript, 
    browserSupportsSpeechRecognition,
    permissionDenied
  } = useSpeechRecognition();
  
  const processingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastProcessedLengthRef = useRef(0);
  const transcriptRef = useRef(transcript);

  // Initialize Auth Listener
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (supabaseUser) => {
      if (supabaseUser) {
        // Fetch full user doc from public DB
        let userDoc = await getUserDoc(supabaseUser.id);
        
        // Lazy Creation: If public doc is missing (e.g. created via link verification flow)
        // create it now using the metadata from the auth user
        if (!userDoc) {
             await createUserDoc(supabaseUser);
             userDoc = await getUserDoc(supabaseUser.id);
        }

        const mergedUser = userDoc ? { ...supabaseUser, ...userDoc } : supabaseUser;
        setCurrentUser(mergedUser);
        setShowLanding(false);
        try {
          const fetchedNotes = await getNotes(mergedUser.id);
          setNotes(fetchedNotes);
        } catch (e) {
          console.error("Error loading notes", e);
        }
      } else {
        setCurrentUser(null);
        setShowLanding(true);
        setNotes([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Reset view mode when switching notes
  useEffect(() => {
    setActiveViewMode('notes');
    setIsCurating(false);
    setIsTranscriptExpanded(false);
  }, [activeNoteId]);

  // Sync transcript ref
  useEffect(() => {
    transcriptRef.current = transcript;
    if (activeNoteId && isListening) {
        setNotes(prev => prev.map(n => 
          n.id === activeNoteId ? { ...n, rawTranscript: transcript } : n
        ));
    }
  }, [transcript, activeNoteId, isListening]);

  // Handle live curation loop
  useEffect(() => {
    if (isListening && !isPaused && activeNoteId && currentUser) {
        const interval = setInterval(async () => {
            const currentTranscript = transcriptRef.current;
            const newChars = currentTranscript.length - lastProcessedLengthRef.current;
            
            if (newChars > 20) {
                lastProcessedLengthRef.current = currentTranscript.length;
                let currentCuratedContent = "";
                setNotes(currentNotes => {
                     const n = currentNotes.find(n => n.id === activeNoteId);
                     currentCuratedContent = n?.curatedContent || "";
                     return currentNotes;
                });

                await updateNote(activeNoteId, currentTranscript, currentCuratedContent);
                setIsCurating(true); // Indicate live update

                try {
                  const curated = await curateNote(currentTranscript, preferredStyle, currentCuratedContent);
                  setNotes(prev => prev.map(n => 
                      n.id === activeNoteId ? { ...n, curatedContent: curated } : n
                  ));
                  await updateNote(activeNoteId, currentTranscript, curated);
                  setApiError(false);
                } catch (err: any) {
                   console.error("Curation error", err);
                   if (err.message && err.message.includes('401')) setApiError(true);
                } finally {
                   setIsCurating(false);
                }
            }
        }, 5000);
        processingRef.current = interval;
    } else {
        if (processingRef.current) clearInterval(processingRef.current);
    }
    return () => { if (processingRef.current) clearInterval(processingRef.current); };
  }, [isListening, isPaused, activeNoteId, preferredStyle, currentUser]);

  // Auth Functions
  const handleLogout = async () => {
      await logoutUser();
      setActiveNoteId(null);
  };

  const startNewNote = async (title: string) => {
    if (!currentUser) {
        setShowAuthModal(true);
        return;
    }
    const newNote: Note = {
      id: Date.now().toString(),
      userId: currentUser.id,
      title,
      rawTranscript: '',
      curatedContent: '',
      createdAt: Date.now(),
      style: preferredStyle
    };
    
    // Optimistic Update
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    resetTranscript();
    lastProcessedLengthRef.current = 0;
    transcriptRef.current = "";
    setIsTranscriptExpanded(false); 
    startListening();

    // Persist
    await addNote(newNote);
  };

  const handleStopRecording = async () => {
    stopListening();
    if (activeNoteId && transcript.length > 0) {
         setIsCurating(true);
         try {
            const curated = await curateNote(transcript, preferredStyle, activeNote?.curatedContent);
            setNotes(prev => prev.map(n => 
                n.id === activeNoteId ? { ...n, curatedContent: curated, rawTranscript: transcript } : n
            ));
            await updateNote(activeNoteId, transcript, curated);
            setApiError(false);
         } catch (err: any) {
            console.error("Final curation error", err);
            if (err.message && err.message.includes('401')) setApiError(true);
         } finally {
            setIsCurating(false);
         }
    }
  };

  const handleTextSubmit = async (title: string, text: string) => {
    if (!currentUser) {
        setShowAuthModal(true);
        return;
    }
    const newNote: Note = {
      id: Date.now().toString(),
      userId: currentUser.id,
      title,
      rawTranscript: text,
      curatedContent: '',
      createdAt: Date.now(),
      style: preferredStyle
    };
    
    // Optimistic UI
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    setIsProcessingFile(true);
    setIsTranscriptExpanded(false);
    setIsCurating(true);

    try {
      await addNote(newNote); // Save initial empty note
      const curated = await curateNote(text, preferredStyle);
      const updatedNote = { ...newNote, curatedContent: curated };
      setNotes(prev => prev.map(n => n.id === newNote.id ? updatedNote : n));
      await updateNote(newNote.id, text, curated);
      setApiError(false);
    } catch (err: any) {
      console.error("Manual text curation error", err);
      if (err.message && err.message.includes('401')) setApiError(true);
    } finally {
      setIsProcessingFile(false);
      setIsCurating(false);
    }
  };
  
  const handleRefine = async (instructions: string) => {
      if (!activeNoteId || !activeNote) return;
      setIsProcessingFile(true);
      setIsCurating(true);
      try {
          const refinedContent = await refineNote(activeNote.curatedContent, instructions);
          const updatedNote = { ...activeNote, curatedContent: refinedContent };
          setNotes(prev => prev.map(n => n.id === activeNote.id ? updatedNote : n));
          await updateNote(activeNote.id, activeNote.rawTranscript, refinedContent);
          setApiError(false);
      } catch (err: any) {
          console.error("Refinement error", err);
          if (err.message && err.message.includes('401')) setApiError(true);
      } finally {
          setIsProcessingFile(false);
          setIsCurating(false);
      }
  };

  const handleFileUpload = async (title: string, files: File[]) => {
    if (!currentUser) {
        setShowAuthModal(true);
        return;
    }
    setIsProcessingFile(true);
    setIsCurating(true);
    try {
        const text = await parseMultipleFiles(files);
        const newNote: Note = {
            id: Date.now().toString(),
            userId: currentUser.id,
            title,
            rawTranscript: text,
            curatedContent: '',
            createdAt: Date.now(),
            style: preferredStyle
        };
        
        setNotes(prev => [newNote, ...prev]);
        setActiveNoteId(newNote.id);
        setIsTranscriptExpanded(false);
        await addNote(newNote);

        const curated = await curateNote(text, preferredStyle);
        const updatedNote = { ...newNote, curatedContent: curated };
        setNotes(prev => prev.map(n => n.id === newNote.id ? updatedNote : n));
        await updateNote(newNote.id, text, curated);
        setApiError(false);
    } catch (error) {
        console.error("File processing failed:", error);
        alert("Failed to process file. Please try again.");
    } finally {
        setIsProcessingFile(false);
        setIsCurating(false);
    }
  };

  const deleteNote = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotes(prev => prev.filter(n => n.id !== id)); // Optimistic delete
    if (activeNoteId === id) setActiveNoteId(null);
    await deleteNoteDB(id);
  };

  const handleCopy = (content: string, id: string) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = (note: Note) => {
    const content = `# ${note.title}\nDate: ${new Date(note.createdAt).toLocaleString()}\n\n## AI Notes\n${note.curatedContent}\n\n---\n\n## Raw Transcript\n${note.rawTranscript}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- View Switching Logic ---
  const switchToMindMap = async () => {
    if (!activeNote) return;
    setActiveViewMode('mindmap');
    if (!activeNote.mindMapMermaid && !isGeneratingMap && activeNote.curatedContent) {
        setIsGeneratingMap(true);
        try {
            const mermaidCode = await generateMindMap(activeNote.curatedContent);
            setNotes(prev => prev.map(n => n.id === activeNote.id ? { ...n, mindMapMermaid: mermaidCode } : n));
            await updateMindMap(activeNote.id, mermaidCode);
        } catch (e) {
            console.error("Failed to gen map", e);
        } finally {
            setIsGeneratingMap(false);
        }
    }
  };

  const switchToFlashcards = async () => {
      if (!activeNote) return;
      setActiveViewMode('flashcards');
      if (!activeNote.flashcards && !isGeneratingCards && activeNote.curatedContent) {
          setIsGeneratingCards(true);
          try {
              const cards = await generateFlashcards(activeNote.curatedContent);
              const json = JSON.stringify(cards);
              setNotes(prev => prev.map(n => n.id === activeNote.id ? { ...n, flashcards: json } : n));
              await updateFlashcards(activeNote.id, json);
          } catch (e) {
              console.error("Failed to gen cards", e);
          } finally {
              setIsGeneratingCards(false);
          }
      }
  };

  // Helper to render Markdown-like content
  const renderFormattedContent = (content: string) => {
    if (!content) return null;
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let listBuffer: React.ReactNode[] = [];
    let tableBuffer: string[] = [];
    
    const flushList = (keyPrefix: number) => {
        if (listBuffer.length > 0) {
            elements.push(<div key={`list-group-${keyPrefix}`} className="space-y-2 mb-4">{listBuffer}</div>);
            listBuffer = [];
        }
    };
    const flushTable = (keyPrefix: number) => {
        if (tableBuffer.length === 0) return;
        const rows = tableBuffer.map(row => row.split('|').filter(() => true)).map(row => {
             const cells = [...row];
             if (cells.length > 0 && cells[0].trim() === '') cells.shift();
             if (cells.length > 0 && cells[cells.length-1].trim() === '') cells.pop();
             return cells;
        });
        if (rows.length > 1) {
            const hasSeparator = rows.length > 1 && rows[1].some(c => c.includes('-'));
            const header = rows[0];
            const body = hasSeparator ? rows.slice(2) : rows.slice(1);
            elements.push(
                <div key={`table-${keyPrefix}`} className="my-6 overflow-x-auto rounded-xl border border-white/10 bg-white/5 shadow-sm">
                    <table className="w-full border-collapse text-sm text-left">
                        <thead><tr>{header.map((cell, idx) => <th key={idx} className="p-4 border-b border-white/10 font-semibold text-white bg-white/5 whitespace-nowrap"><FadeText text={cell.trim()} /></th>)}</tr></thead>
                        <tbody>{body.map((row, rIdx) => <tr key={rIdx} className="group hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">{row.map((cell, cIdx) => <td key={cIdx} className="p-4 text-neutral-300 min-w-[120px]"><FadeText text={cell.trim()} /></td>)}</tr>)}</tbody>
                    </table>
                </div>
            );
        }
        tableBuffer = [];
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.startsWith('```')) {
            flushList(i); flushTable(i);
            if (inCodeBlock) {
                elements.push(<div key={`code-${i}`} className="bg-[#0A0A0A] p-4 rounded-xl font-mono text-sm text-neutral-300 my-4 border border-white/5 shadow-inner overflow-x-auto"><pre>{codeBlockContent.join('\n')}</pre></div>);
                codeBlockContent = []; inCodeBlock = false;
            } else { inCodeBlock = true; }
            continue;
        }
        if (inCodeBlock) { codeBlockContent.push(line); continue; }
        if (trimmed.startsWith('|')) { flushList(i); tableBuffer.push(line); continue; }
        if (tableBuffer.length > 0) flushTable(i);
        if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
            flushList(i); elements.push(<div key={`hr-${i}`} className="py-4"><hr className="border-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" /></div>); continue;
        }
        if (trimmed.startsWith('#')) {
            flushList(i);
            const level = trimmed.match(/^#+/)?.[0].length || 1;
            const text = trimmed.replace(/^#+\s*/, '');
            const styles = { 
                1: "text-2xl md:text-3xl font-light text-white mt-8 mb-4 tracking-tight", 
                2: "text-xl md:text-2xl font-light text-white mt-6 mb-3 tracking-tight", 
                3: "text-lg md:text-xl font-medium text-white/90 mt-4 mb-2" 
            };
            elements.push(<div key={`head-${i}`} className={styles[level as keyof typeof styles] || styles[3]}><FadeText text={text} speed={5} /></div>); continue;
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
            const text = trimmed.replace(/^[-*•]\s*/, '');
            listBuffer.push(<div key={`li-${i}`} className="flex items-start space-x-3 ml-1 group"><span className="text-neutral-500 mt-[8px] w-1.5 h-1.5 rounded-full bg-neutral-600 group-hover:bg-neutral-400 transition-colors shrink-0" /><div className="flex-1 text-neutral-300 leading-relaxed"><FadeText text={text} speed={5} /></div></div>); continue;
        }
        if (trimmed.startsWith('> ')) {
            flushList(i); elements.push(<div key={`quote-${i}`} className="border-l-2 border-white/20 pl-4 py-1 my-4 italic text-neutral-400"><FadeText text={trimmed.replace(/^>\s*/, '')} speed={5} /></div>); continue;
        }
        if (trimmed === '') { flushList(i); elements.push(<div key={`spacer-${i}`} className="h-2" />); } else {
            flushList(i); elements.push(<div key={`p-${i}`} className="text-neutral-300 mb-2 leading-relaxed text-sm md:text-base"><FadeText text={line} speed={5} /></div>);
        }
    }
    flushList(lines.length); flushTable(lines.length);
    return elements;
  };

  const AuthModal = () => {
      const [isSignUp, setIsSignUp] = useState(false);
      const [email, setEmail] = useState('');
      const [username, setUsername] = useState('');
      const [password, setPassword] = useState('');
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState('');
      const [isLinkSent, setIsLinkSent] = useState(false);

      const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          setError('');
          setLoading(true);
          try {
              if (isSignUp) {
                  if (!username.trim()) throw new Error("Username is required.");
                  
                  // Register (Sends Verification Link automatically via Supabase)
                  try {
                      await registerUser(email, password, username);
                      setIsLinkSent(true);
                  } catch (regError: any) {
                      if (regError.message.includes("User already registered")) {
                           setError("Email already registered. Please sign in.");
                      } else {
                          throw regError;
                      }
                  }
              } else {
                  await loginUser(email, password);
                  setShowAuthModal(false);
              }
          } catch (e: any) {
              console.error("Auth error:", e);
              setError(e.message || "Authentication failed");
          } finally {
              setLoading(false);
          }
      };
      
      if (isLinkSent) {
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
                <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-3xl p-8 text-center">
                    <Mail className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-light text-white mb-2">Check your email</h2>
                    <p className="text-neutral-400 text-sm mb-6">We sent a verification link to <strong>{email}</strong>.<br/>Click the link to activate your account and sign in.</p>
                    <button onClick={() => { setIsLinkSent(false); setShowAuthModal(false); }} className="text-sm text-neutral-500 hover:text-white">Close</button>
                </div>
            </motion.div>
          );
      }

      return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-md bg-[#111] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                   <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 p-2 text-neutral-500 hover:text-white"><X size={20} /></button>
                   <div className="flex flex-col items-center mb-6">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4"><Logo className="w-6 h-6 text-white" /></div>
                        <h2 className="text-2xl font-light text-white">{isSignUp ? "Create Account" : "Welcome Back"}</h2>
                        <p className="text-neutral-500 text-sm mt-1">Sign in to sync your notes across devices</p>
                   </div>
                   
                   {error && <div className="mb-4 p-3 bg-red-900/20 text-red-400 text-sm rounded-xl text-center border border-red-500/20">{error}</div>}

                   <form onSubmit={handleSubmit} className="space-y-4">
                       {isSignUp && (
                           <div>
                               <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Username</label>
                               <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-white/30 transition-colors" placeholder="Choose a username" required />
                           </div>
                       )}
                       <div>
                           <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Email</label>
                           <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-white/30 transition-colors" placeholder="Enter email" required />
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Password</label>
                           <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-white/30 transition-colors" placeholder="Enter password" required minLength={6} />
                       </div>

                       <button type="submit" disabled={loading} className="w-full bg-white text-black font-medium py-3 rounded-xl hover:bg-neutral-200 transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                           {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (isSignUp ? "Sign Up" : "Sign In")}
                       </button>
                   </form>
                   
                   <div className="mt-6 text-center">
                       <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }} className="text-sm text-neutral-400 hover:text-white transition-colors">
                           {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                       </button>
                   </div>
              </motion.div>
          </motion.div>
      )
  };

  if (!browserSupportsSpeechRecognition) {
      return <div className="h-screen w-full flex items-center justify-center text-white">Browser not supported. Please use Chrome.</div>
  }

  // --- LANDING PAGE ---
  if (showLanding) {
      return (
          <div className="h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
               {/* Header Login Button */}
               {!currentUser && (
                   <div className="absolute top-6 right-6 z-20">
                       <button onClick={() => setShowAuthModal(true)} className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 backdrop-blur-md text-sm font-medium transition-colors">Sign In</button>
                   </div>
               )}

              <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3], rotate: [0, 90, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[-20%] left-[-10%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-purple-600/30 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
              <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2], x: [0, 50, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-[-10%] right-[-10%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-blue-600/30 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
              
              <div className="relative z-10 flex flex-col items-center p-8 text-center">
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, type: "spring" }} className="mb-8 p-5 md:p-6 rounded-[2rem] bg-gradient-to-tr from-white/5 to-transparent border border-white/10 backdrop-blur-2xl shadow-2xl"><Logo className="w-12 h-12 md:w-16 md:h-16 text-white/90" /></motion.div>
                  <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }} className="text-5xl sm:text-6xl md:text-8xl font-thin tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40 mb-6">Flow</motion.h1>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }} className="text-neutral-400 font-light text-base md:text-lg tracking-wide mb-12 max-w-xs md:max-w-md">Capture thoughts. Curated by AI.<br /><span className="text-neutral-600 text-sm mt-2 block">Voice, text, or file.</span></motion.p>
                  
                  <motion.button 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ delay: 0.8, type: "spring" }} 
                    onClick={() => {
                        if (currentUser) {
                            setShowLanding(false);
                        } else {
                            setShowAuthModal(true);
                        }
                    }} 
                    className="group relative flex items-center space-x-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 px-8 py-4 rounded-full transition-all"
                  >
                      <span className="text-white font-medium tracking-wide">Enter Flow</span>
                      <ArrowRight className="w-4 h-4 text-white/70 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
              </div>

              <AnimatePresence>
                  {showAuthModal && <AuthModal />}
              </AnimatePresence>
          </div>
      );
  }

  // --- MAIN APP ---
  return (
    <div className="min-h-screen text-white relative selection:bg-white/20">
      <header className="fixed top-0 left-0 right-0 h-20 md:h-24 z-40 flex items-center justify-center px-4 md:px-6 pointer-events-none">
        <div className="w-full max-w-2xl flex items-center justify-between pointer-events-auto">
            <div className="flex items-center space-x-2">
                <AnimatePresence mode="wait">
                    {activeNoteId ? (
                        <motion.button key="back" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} onClick={() => setActiveNoteId(null)} className="p-2 md:p-3 -ml-2 rounded-full hover:bg-white/10 transition-colors backdrop-blur-md"><ChevronLeft className="w-5 h-5 text-neutral-200" /></motion.button>
                    ) : (
                        <motion.div key="logo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center space-x-3 px-2"><div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-lg"><Logo className="w-4 h-4 md:w-5 md:h-5 text-white/90" /></div><span className="font-medium tracking-tight text-white/90 text-lg">Flow</span></motion.div>
                    )}
                </AnimatePresence>
                <AnimatePresence mode="wait">
                    {activeNoteId && <motion.h1 initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="font-medium text-base md:text-lg tracking-tight backdrop-blur-md px-2 py-1 rounded-lg truncate max-w-[150px] sm:max-w-xs">{activeNote?.title}</motion.h1>}
                </AnimatePresence>
            </div>
            <div className="flex items-center space-x-2">
                {activeNoteId && activeNote && (
                  <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} onClick={() => handleExport(activeNote)} className="p-2 md:p-3 rounded-full hover:bg-white/10 transition-colors backdrop-blur-md text-neutral-300 hover:text-white" title="Export Note"><Download className="w-5 h-5" /></motion.button>
                )}
                <button onClick={() => setSettingsOpen(true)} className="p-2 md:p-3 rounded-full transition-colors backdrop-blur-md hover:text-white hover:bg-white/10 text-neutral-300"><Settings className="w-5 h-5" /></button>
            </div>
        </div>
      </header>

      {/* Main container logic expanded here: width changes based on activeViewMode */}
      <main className={`pt-24 md:pt-28 pb-32 px-4 mx-auto min-h-screen transition-all duration-500 ease-in-out ${activeViewMode === 'mindmap' ? 'max-w-full md:max-w-[95vw]' : 'max-w-2xl'}`}>
        <AnimatePresence>
            {permissionDenied && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6 p-4 rounded-3xl bg-red-900/20 border border-red-500/20 backdrop-blur-xl text-red-200 flex items-center space-x-3 overflow-hidden"><MicOff className="w-5 h-5 flex-shrink-0" /><span className="text-xs md:text-sm">Microphone access denied. Check your browser settings.</span></motion.div>
            )}
        </AnimatePresence>

        {!activeNoteId && (
            <div className="space-y-4">
                {notes.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} className="flex flex-col items-center justify-center h-[60vh] relative">
                        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3], rotate: [0, 90, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute top-1/4 -left-10 w-48 h-48 md:w-64 md:h-64 bg-purple-600/30 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
                        <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2], x: [0, 30, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-1/3 -right-10 w-48 h-48 md:w-64 md:h-64 bg-blue-600/30 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", duration: 0.8 }} className="z-10 flex flex-col items-center text-center"><h2 className="text-3xl md:text-4xl font-light tracking-tighter text-neutral-300">No notes yet</h2><p className="mt-4 text-neutral-500 font-light tracking-wide text-sm max-w-[200px]">Tap the + button to start capturing.</p></motion.div>
                    </motion.div>
                ) : (
                    <div className="grid gap-4">
                        <AnimatePresence>
                            {notes.map((note, i) => (
                                <motion.div key={note.id} layoutId={note.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 30 }} onClick={() => setActiveNoteId(note.id)} className="group relative p-5 md:p-6 rounded-[2rem] bg-neutral-900/40 backdrop-blur-xl border border-white/5 hover:border-white/10 transition-all cursor-pointer hover:bg-neutral-800/40 shadow-lg hover:shadow-2xl hover:shadow-black/20">
                                    <div className="flex justify-between items-start mb-3"><h3 className="font-medium text-base md:text-lg text-neutral-100 tracking-tight group-hover:text-white transition-colors">{note.title}</h3><span className="text-[10px] uppercase tracking-wider text-neutral-600 font-medium bg-white/5 px-2 py-1 rounded-full border border-white/5 whitespace-nowrap ml-2">{new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></div>
                                    <p className="text-xs md:text-sm text-neutral-400 line-clamp-2 leading-relaxed font-light">{note.curatedContent || note.rawTranscript || "Empty note..."}</p>
                                    <div className="absolute top-5 right-4 flex space-x-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => deleteNote(e, note.id)} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-full transition-colors" title="Delete"><Trash2 size={14} /></button></div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        )}

        {activeNote && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-6">
                
                {/* View Tabs */}
                <div className="flex justify-center bg-white/5 rounded-full p-1 border border-white/5 self-center mx-auto w-full sm:w-fit mb-4 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'notes', label: 'Notes', icon: FileText },
                        { id: 'mindmap', label: 'Mind Map', icon: Network },
                        { id: 'flashcards', label: 'Study', icon: BookOpen },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => tab.id === 'mindmap' ? switchToMindMap() : tab.id === 'flashcards' ? switchToFlashcards() : setActiveViewMode('notes')}
                            className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all flex-1 sm:flex-initial whitespace-nowrap ${activeViewMode === tab.id ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}
                        >
                            <tab.icon size={16} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Status Bar */}
                {(isListening || isProcessingFile) && !isGeneratingMap && !isGeneratingCards && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
                        <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-medium border shadow-[0_0_20px_-5px_rgba(239,68,68,0.4)] ${isPaused ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${isPaused ? 'bg-yellow-500' : 'bg-red-500'}`} />
                            {isProcessingFile ? 'Processing...' : isPaused ? 'Recording Paused' : 'Live Transcribing'}
                        </span>
                    </motion.div>
                )}

                {/* Views */}
                {activeViewMode === 'notes' && (
                    <div className="grid gap-6">
                        <AnimatePresence>
                        {/* Always show card if content exists OR if curating */}
                        {activeNote.curatedContent || isCurating ? (
                             <motion.div layout className="relative p-6 md:p-8 rounded-[2.5rem] bg-[#0A0A0A] border border-white/10 shadow-2xl overflow-hidden min-h-[400px]">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
                                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                                    <div className="flex items-center space-x-2 text-neutral-400">
                                        {isCurating ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Sparkles size={14} className="text-white" />}
                                        <span className="text-xs font-bold tracking-widest uppercase">{isCurating ? 'Curating...' : 'AI Curated Note'}</span>
                                    </div>
                                    <button onClick={() => handleCopy(activeNote.curatedContent, activeNote.id)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-neutral-400 hover:text-white" title="Copy to clipboard">
                                        {copiedId === activeNote.id ? <Check size={16} /> : <Copy size={16} />}
                                    </button>
                                </div>
                                {activeNote.curatedContent ? (
                                    <div className="prose prose-invert prose-p:text-neutral-300 prose-headings:text-white max-w-none">
                                        {renderFormattedContent(activeNote.curatedContent)}
                                    </div>
                                ) : (
                                    <LoadingSkeleton />
                                )}
                             </motion.div>
                        ) : null}
                        </AnimatePresence>

                        {/* Collapsible Live Transcript */}
                        <div className="mt-4">
                            <button 
                                onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                                className="flex items-center space-x-2 text-xs font-bold tracking-widest text-neutral-500 uppercase hover:text-neutral-300 transition-colors mb-3"
                            >
                                <MoreHorizontal size={14} />
                                <span>{isTranscriptExpanded ? 'Hide' : 'Show'} Live Transcript</span>
                                {isTranscriptExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            
                            <AnimatePresence>
                                {(isTranscriptExpanded || isListening) && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-6 md:p-8 rounded-[2.5rem] bg-[#0A0A0A]/50 border border-white/5 border-dashed">
                                            <p className="font-mono text-sm md:text-base text-neutral-500 leading-relaxed whitespace-pre-wrap">
                                                {activeNote.rawTranscript}
                                                {transcriptRef.current && transcriptRef.current !== activeNote.rawTranscript && (
                                                    <span className="text-white">{transcriptRef.current.replace(activeNote.rawTranscript, '')}</span>
                                                )}
                                                {isListening && !isPaused && <span className="inline-block w-2 h-4 bg-white/50 ml-1 animate-pulse align-middle" />}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}

                {activeViewMode === 'mindmap' && (
                    <div className="w-full">
                        {isGeneratingMap ? (
                             <div className="w-full h-[60vh] flex flex-col items-center justify-center space-y-4 bg-[#0A0A0A] rounded-[2.5rem] border border-white/10">
                                 <div className="relative">
                                     <div className="w-16 h-16 rounded-full border-2 border-white/10 border-t-white animate-spin" />
                                     <div className="absolute inset-0 flex items-center justify-center"><Network size={20} className="text-white/50" /></div>
                                 </div>
                                 <span className="text-neutral-400 font-light tracking-wide animate-pulse">Generating neural map...</span>
                             </div>
                        ) : (
                             <MindMap code={activeNote.mindMapMermaid || ''} />
                        )}
                    </div>
                )}

                {activeViewMode === 'flashcards' && (
                    <div className="w-full flex justify-center">
                        <div className="w-full max-w-3xl">
                             {isGeneratingCards ? (
                                <div className="w-full aspect-[16/9] flex flex-col items-center justify-center space-y-4 bg-[#0A0A0A] rounded-[2.5rem] border border-white/10">
                                     <div className="relative">
                                         <div className="w-16 h-16 rounded-full border-2 border-white/10 border-t-white animate-spin" />
                                         <div className="absolute inset-0 flex items-center justify-center"><BookOpen size={20} className="text-white/50" /></div>
                                     </div>
                                     <span className="text-neutral-400 font-light tracking-wide animate-pulse">Creating study deck...</span>
                                 </div>
                             ) : (
                                <Flashcards cards={activeNote.flashcards ? JSON.parse(activeNote.flashcards) : []} />
                             )}
                        </div>
                    </div>
                )}
            </motion.div>
        )}
      </main>

      {/* Dynamic Island Input */}
      <DynamicIsland 
        isRecording={isListening}
        isPaused={isPaused}
        onStartRecording={startNewNote} 
        onStopRecording={handleStopRecording}
        onTogglePause={togglePause}
        onSubmitText={handleTextSubmit}
        onSubmitFile={handleFileUpload}
        isLoading={isProcessingFile || isCurating}
        activeNoteId={activeNoteId}
        onRefine={handleRefine}
      />
      
      {/* Settings Modal */}
      <AnimatePresence>
        {settingsOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSettingsOpen(false)}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#111] border border-white/10 p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-light text-white">Settings</h2>
                        <button onClick={() => setSettingsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} className="text-neutral-400" /></button>
                    </div>

                    <div className="space-y-6">
                        {/* User Profile Section */}
                        {currentUser && (
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center space-x-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                                    {currentUser.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-white font-medium truncate">{currentUser.username}</h3>
                                        {currentUser.isVerified && <Check size={14} className="text-green-400" />}
                                    </div>
                                    <p className="text-xs text-neutral-400 truncate">{currentUser.email}</p>
                                </div>
                                <button onClick={handleLogout} className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Log Out">
                                    <LogOut size={18} />
                                </button>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3 block">Note Style</label>
                            <div className="grid grid-cols-2 gap-3">
                                {(['default', 'academic', 'creative', 'meeting'] as NoteStyle[]).map(style => (
                                    <button
                                        key={style}
                                        onClick={() => setPreferredStyle(style)}
                                        className={`p-3 rounded-xl border text-sm font-medium flex items-center space-x-2 transition-all ${preferredStyle === style ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'}`}
                                    >
                                        {React.createElement(FormatIcons[style], { size: 16 })}
                                        <span className="capitalize">{style}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {apiError && (
                             <div className="p-4 bg-red-900/20 border border-red-500/20 rounded-xl">
                                 <p className="text-red-400 text-xs leading-relaxed">
                                     <strong>API Error:</strong> The system is currently experiencing high traffic or the key is invalid. Please try again later.
                                 </p>
                             </div>
                        )}
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
