import React, { useState, useEffect, useRef } from 'react';
import { Settings, ChevronLeft, MoreHorizontal, Copy, Check, Clock, Sparkles, MicOff, Trash2, ArrowRight, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DynamicIsland } from './components/DynamicIsland';
import { FadeText } from './components/FadeText';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { curateNote } from './services/openRouter';
import { Note, NoteStyle } from './types';
import { initDB, getNotes, addNote, updateNote, deleteNote as deleteNoteDB } from './services/db';

// Icons for formatting
const FormatIcons = {
  default: Sparkles,
  academic: Clock,
  creative: MoreHorizontal,
  meeting: Check,
};

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

const App: React.FC = () => {
  // State
  const [showLanding, setShowLanding] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferredStyle, setPreferredStyle] = useState<NoteStyle>('default');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript, 
    browserSupportsSpeechRecognition,
    permissionDenied
  } = useSpeechRecognition();
  
  // Refs to handle processing intervals
  const processingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastProcessedLengthRef = useRef(0);

  // Initialize DB and load notes
  useEffect(() => {
    initDB();
    const savedNotes = getNotes();
    setNotes(savedNotes);
  }, []);

  // Derived state
  const activeNote = notes.find(n => n.id === activeNoteId);

  // Handle live curation loop
  useEffect(() => {
    if (isListening && activeNoteId) {
        // Start an interval to check for new text to curate every 5 seconds
        // only if there is significant new text
        const interval = setInterval(async () => {
            const currentTranscript = transcript;
            const newChars = currentTranscript.length - lastProcessedLengthRef.current;
            
            // Only curate if we have > 30 chars of new content
            if (newChars > 30) {
                lastProcessedLengthRef.current = currentTranscript.length;
                
                // Optimistic UI update for transcript
                setNotes(prev => prev.map(n => 
                    n.id === activeNoteId ? { ...n, rawTranscript: currentTranscript } : n
                ));
                updateNote(activeNoteId, currentTranscript, activeNote?.curatedContent || "");

                // Call API
                const curated = await curateNote(currentTranscript, preferredStyle, activeNote?.curatedContent);
                
                setNotes(prev => prev.map(n => 
                    n.id === activeNoteId ? { ...n, curatedContent: curated } : n
                ));
                updateNote(activeNoteId, currentTranscript, curated);
            }
        }, 5000);
        
        processingRef.current = interval;
    } else {
        if (processingRef.current) clearInterval(processingRef.current);
    }

    return () => {
        if (processingRef.current) clearInterval(processingRef.current);
    };
  }, [isListening, activeNoteId, transcript, preferredStyle]);

  // Handle transcript updates specifically for the raw view when not hitting API
  useEffect(() => {
      if (activeNoteId && isListening) {
          setNotes(prev => prev.map(n => 
            n.id === activeNoteId ? { ...n, rawTranscript: transcript } : n
        ));
      }
  }, [transcript, activeNoteId, isListening]);


  const startNewNote = (title: string) => {
    const newNote: Note = {
      id: Date.now().toString(),
      title,
      rawTranscript: '',
      curatedContent: '',
      createdAt: Date.now(),
      style: preferredStyle
    };
    
    // DB Insert
    addNote(newNote);
    
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    resetTranscript();
    lastProcessedLengthRef.current = 0;
    
    // Directly start listening - NO TIMEOUT to preserve user gesture
    startListening();
  };

  const handleStopRecording = async () => {
    stopListening();
    // Final curation pass
    if (activeNoteId && transcript.length > 0) {
         const curated = await curateNote(transcript, preferredStyle, activeNote?.curatedContent);
         setNotes(prev => prev.map(n => 
            n.id === activeNoteId ? { ...n, curatedContent: curated, rawTranscript: transcript } : n
        ));
        updateNote(activeNoteId, transcript, curated);
    }
  };

  const deleteNote = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNoteDB(id);
    setNotes(prev => prev.filter(n => n.id !== id));
    if (activeNoteId === id) setActiveNoteId(null);
  };

  const handleCopy = (content: string, id: string) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = (note: Note) => {
    const content = `# ${note.title}
Date: ${new Date(note.createdAt).toLocaleString()}

## AI Notes
${note.curatedContent}

---

## Raw Transcript
${note.rawTranscript}
`;

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

  // Helper to render Markdown-like content
  const renderFormattedContent = (content: string) => {
    if (!content) return null;
    
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let listBuffer: React.ReactNode[] = [];
    
    const flushList = (keyPrefix: number) => {
        if (listBuffer.length > 0) {
            elements.push(
                <div key={`list-group-${keyPrefix}`} className="space-y-2 mb-4">
                    {listBuffer}
                </div>
            );
            listBuffer = [];
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // --- Code Block Handling ---
        if (trimmed.startsWith('```')) {
            if (inCodeBlock) {
                // Close block
                flushList(i);
                elements.push(
                    <div key={`code-${i}`} className="bg-[#0A0A0A] p-4 rounded-xl font-mono text-sm text-neutral-300 my-4 border border-white/5 shadow-inner overflow-x-auto">
                        <pre>{codeBlockContent.join('\n')}</pre>
                    </div>
                );
                codeBlockContent = [];
                inCodeBlock = false;
            } else {
                // Open block
                flushList(i);
                inCodeBlock = true;
            }
            continue;
        }
        
        if (inCodeBlock) {
            codeBlockContent.push(line);
            continue;
        }

        // --- Horizontal Rule (New) ---
        if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
            flushList(i);
            elements.push(
                <div key={`hr-${i}`} className="py-4">
                    <hr className="border-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>
            );
            continue;
        }

        // --- Headers ---
        if (trimmed.startsWith('#')) {
            flushList(i);
            const level = trimmed.match(/^#+/)?.[0].length || 1;
            const text = trimmed.replace(/^#+\s*/, '');
            
            const styles = {
                1: "text-3xl font-light text-white mt-8 mb-4 tracking-tight",
                2: "text-2xl font-light text-white mt-6 mb-3 tracking-tight",
                3: "text-xl font-medium text-white/90 mt-4 mb-2"
            };
            
            elements.push(
                <div key={`head-${i}`} className={styles[level as keyof typeof styles] || styles[3]}>
                    <FadeText text={text} speed={5} />
                </div>
            );
            continue;
        }

        // --- Lists (Bullets) ---
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
            const text = trimmed.replace(/^[-*•]\s*/, '');
            listBuffer.push(
                <div key={`li-${i}`} className="flex items-start space-x-3 ml-1 group">
                    <span className="text-neutral-500 mt-[6px] w-1.5 h-1.5 rounded-full bg-neutral-600 group-hover:bg-neutral-400 transition-colors shrink-0" />
                    <div className="flex-1 text-neutral-300 leading-relaxed">
                        <FadeText text={text} speed={5} />
                    </div>
                </div>
            );
            continue;
        }

        // --- Blockquotes ---
        if (trimmed.startsWith('> ')) {
            flushList(i);
            elements.push(
                <div key={`quote-${i}`} className="border-l-2 border-white/20 pl-4 py-1 my-4 italic text-neutral-400">
                    <FadeText text={trimmed.replace(/^>\s*/, '')} speed={5} />
                </div>
            );
            continue;
        }

        // --- Normal Paragraph ---
        if (trimmed === '') {
            flushList(i);
            elements.push(<div key={`spacer-${i}`} className="h-2" />);
        } else {
            flushList(i);
            elements.push(
                <div key={`p-${i}`} className="text-neutral-300 mb-2 leading-relaxed">
                    <FadeText text={line} speed={5} />
                </div>
            );
        }
    }
    
    // Flush any remaining list items
    flushList(lines.length);
    
    return elements;
  };

  if (!browserSupportsSpeechRecognition) {
      return <div className="h-screen w-full flex items-center justify-center text-white">Browser not supported. Please use Chrome.</div>
  }

  // --- Landing Page View ---
  if (showLanding) {
      return (
          <div className="h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
               {/* Background Effects */}
              <motion.div 
                  animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.5, 0.3], 
                      rotate: [0, 90, 0]
                  }}
                  transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" 
              />
               <motion.div 
                  animate={{ 
                      scale: [1, 1.1, 1],
                      opacity: [0.2, 0.4, 0.2],
                      x: [0, 50, 0]
                  }}
                  transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" 
              />

              <div className="relative z-10 flex flex-col items-center p-8">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, type: "spring" }}
                    className="mb-8 p-6 rounded-[2rem] bg-gradient-to-tr from-white/5 to-transparent border border-white/10 backdrop-blur-2xl shadow-2xl"
                  >
                     <Logo className="w-16 h-16 text-white/90" />
                  </motion.div>

                  <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className="text-6xl md:text-8xl font-thin tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40 mb-6 text-center"
                  >
                    Flow
                  </motion.h1>

                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                    className="text-neutral-400 font-light text-lg tracking-wide mb-12 text-center max-w-md"
                  >
                    Capture thoughts. Curated by AI.<br />
                    <span className="text-neutral-600 text-sm mt-2 block">Voice-first note taking for the modern mind.</span>
                  </motion.p>

                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ delay: 0.8, type: "spring" }}
                    onClick={() => setShowLanding(false)}
                    className="group relative flex items-center space-x-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 px-8 py-4 rounded-full transition-all"
                  >
                      <span className="text-white font-medium tracking-wide">Enter Flow</span>
                      <ArrowRight className="w-4 h-4 text-white/70 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
              </div>
          </div>
      );
  }

  // --- Main App View ---
  return (
    <div className="min-h-screen text-white relative selection:bg-white/20">
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-24 z-40 flex items-center justify-center px-6 pointer-events-none">
        <div className="w-full max-w-2xl flex items-center justify-between pointer-events-auto">
            <div className="flex items-center space-x-2">
                <AnimatePresence mode="wait">
                    {activeNoteId ? (
                        <motion.button 
                            key="back"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            onClick={() => setActiveNoteId(null)}
                            className="p-3 -ml-2 rounded-full hover:bg-white/10 transition-colors backdrop-blur-md"
                        >
                            <ChevronLeft className="w-5 h-5 text-neutral-200" />
                        </motion.button>
                    ) : (
                        <motion.div 
                            key="logo"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center space-x-3 px-2"
                        >
                            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-lg">
                                <Logo className="w-5 h-5 text-white/90" />
                            </div>
                            <span className="font-medium tracking-tight text-white/90 text-lg">Flow</span>
                        </motion.div>
                    )}
                </AnimatePresence>
                <AnimatePresence mode="wait">
                    {activeNoteId && (
                         <motion.h1 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="font-medium text-lg tracking-tight backdrop-blur-md px-2 py-1 rounded-lg"
                         >
                            {activeNote?.title}
                        </motion.h1>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex items-center space-x-2">
                {activeNoteId && activeNote && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => handleExport(activeNote)}
                    className="p-3 rounded-full hover:bg-white/10 transition-colors backdrop-blur-md text-neutral-300 hover:text-white"
                    title="Export Note"
                  >
                    <Download className="w-5 h-5" />
                  </motion.button>
                )}
                <button 
                    onClick={() => setSettingsOpen(true)}
                    className="p-3 rounded-full hover:bg-white/10 transition-colors backdrop-blur-md text-neutral-300 hover:text-white"
                >
                    <Settings className="w-5 h-5" />
                </button>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-28 pb-32 px-4 max-w-2xl mx-auto min-h-screen">
        
        {/* Permission Error */}
        <AnimatePresence>
            {permissionDenied && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 p-4 rounded-3xl bg-red-900/20 border border-red-500/20 backdrop-blur-xl text-red-200 flex items-center space-x-3 overflow-hidden"
                >
                    <MicOff className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">Microphone access denied. Check your browser settings.</span>
                </motion.div>
            )}
        </AnimatePresence>

        {/* View: Note List */}
        {!activeNoteId && (
            <div className="space-y-4">
                {notes.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1 }}
                        className="flex flex-col items-center justify-center h-[60vh] relative"
                    >
                         {/* Empty State Ambient Orbs */}
                        <motion.div 
                            animate={{ 
                                scale: [1, 1.2, 1],
                                opacity: [0.3, 0.5, 0.3], 
                                rotate: [0, 90, 0]
                            }}
                            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-1/4 -left-10 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none" 
                        />
                         <motion.div 
                            animate={{ 
                                scale: [1, 1.1, 1],
                                opacity: [0.2, 0.4, 0.2],
                                x: [0, 30, 0]
                            }}
                            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute bottom-1/3 -right-10 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" 
                        />

                        <motion.div
                             initial={{ scale: 0.9, opacity: 0, y: 20 }}
                             animate={{ scale: 1, opacity: 1, y: 0 }}
                             transition={{ type: "spring", duration: 0.8 }}
                             className="z-10 flex flex-col items-center"
                        >
                            <h2 className="text-4xl font-light tracking-tighter text-neutral-300 text-center">
                                No notes yet
                            </h2>
                            <p className="mt-4 text-neutral-500 font-light tracking-wide text-sm text-center max-w-[200px]">
                                Tap the + button to start capturing.
                            </p>
                        </motion.div>
                    </motion.div>
                ) : (
                    <div className="grid gap-4">
                        <AnimatePresence>
                            {notes.map((note, i) => (
                                <motion.div 
                                    key={note.id}
                                    layoutId={note.id}
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 30 }}
                                    onClick={() => setActiveNoteId(note.id)}
                                    className="group relative p-6 rounded-[2rem] bg-neutral-900/40 backdrop-blur-xl border border-white/5 hover:border-white/10 transition-all cursor-pointer hover:bg-neutral-800/40 shadow-lg hover:shadow-2xl hover:shadow-black/20"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-medium text-lg text-neutral-100 tracking-tight group-hover:text-white transition-colors">{note.title}</h3>
                                        <span className="text-[10px] uppercase tracking-wider text-neutral-600 font-medium bg-white/5 px-2 py-1 rounded-full border border-white/5">
                                            {new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-neutral-400 line-clamp-2 leading-relaxed font-light">
                                        {note.curatedContent || note.rawTranscript || "Empty note..."}
                                    </p>
                                    <div className="absolute top-6 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={(e) => deleteNote(e, note.id)}
                                            className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-full transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        )}

        {/* View: Active Note */}
        {activeNote && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="space-y-8"
            >
                {/* Status Indicator */}
                {isListening && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-center"
                    >
                        <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20 animate-pulse shadow-[0_0_20px_-5px_rgba(239,68,68,0.4)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2" />
                            Live Transcribing
                        </span>
                    </motion.div>
                )}

                {/* The Content */}
                <div className="grid gap-6">
                    {/* If we have curated content, show it prominently */}
                    <AnimatePresence>
                    {activeNote.curatedContent && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-neutral-800/50 to-neutral-900/50 backdrop-blur-2xl border border-white/5 p-8 shadow-2xl"
                        >
                            {/* Decorative gradient blob */}
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-[80px] pointer-events-none" />
                            
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center space-x-2 text-neutral-400 text-xs uppercase tracking-widest font-bold">
                                    <div className="p-1 bg-white/10 rounded-md"><Sparkles className="w-3 h-3 text-white" /></div>
                                    <span>AI Curated Note</span>
                                </div>
                                <button
                                    onClick={() => handleCopy(activeNote.curatedContent, 'curated')}
                                    className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                                    title="Copy Text"
                                >
                                    {copiedId === 'curated' ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                            </div>
                            
                            <div className="relative z-10">
                                {renderFormattedContent(activeNote.curatedContent || "")}
                            </div>
                        </motion.div>
                    )}
                    </AnimatePresence>

                    {/* Raw Transcript (Secondary) */}
                    <motion.div 
                        layout
                        className={`p-8 rounded-[2.5rem] border border-dashed border-neutral-800 bg-neutral-900/20 backdrop-blur-sm ${activeNote.curatedContent ? 'opacity-60 hover:opacity-100 transition-opacity' : ''}`}
                    >
                         <div className="flex items-center justify-between mb-4 text-neutral-500 text-xs uppercase tracking-widest font-bold">
                            <div className="flex items-center space-x-2">
                                <MoreHorizontal className="w-3 h-3" />
                                <span>Live Transcript</span>
                            </div>
                            <button
                                onClick={() => handleCopy(activeNote.rawTranscript, 'raw')}
                                className="p-2 rounded-full hover:bg-white/10 text-neutral-500 hover:text-white transition-colors"
                                title="Copy Text"
                            >
                                {copiedId === 'raw' ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                        </div>
                        <div className="text-neutral-400 text-base leading-relaxed font-mono">
                            {activeNote.rawTranscript ? (
                                <FadeText text={activeNote.rawTranscript} />
                            ) : (
                                <span className="italic opacity-30">Listening for your voice...</span>
                            )}
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        )}

      </main>

      {/* Dynamic Island Control (Only show in App View) */}
      <DynamicIsland 
        isRecording={isListening}
        onStartRecording={startNewNote}
        onStopRecording={handleStopRecording}
      />

      {/* Settings Modal */}
      <AnimatePresence>
      {settingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-4"
            onClick={() => setSettingsOpen(false)}
          >
              <motion.div 
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-sm bg-[#111] border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden relative"
                onClick={(e) => e.stopPropagation()}
              >
                  {/* Glass highlight */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-medium text-white">Curation Style</h2>
                      <button onClick={() => setSettingsOpen(false)} className="text-neutral-500 hover:text-white transition-colors">Close</button>
                  </div>
                  
                  <div className="space-y-2">
                      {(['default', 'academic', 'creative', 'meeting'] as NoteStyle[]).map((style) => {
                          const Icon = FormatIcons[style];
                          const isActive = preferredStyle === style;
                          return (
                              <button
                                key={style}
                                onClick={() => setPreferredStyle(style)}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                                    isActive 
                                    ? 'bg-white text-black border-white shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]' 
                                    : 'bg-neutral-900/50 text-neutral-400 border-transparent hover:bg-neutral-800'
                                }`}
                              >
                                  <div className="flex items-center space-x-3">
                                      <Icon className={`w-5 h-5 ${isActive ? 'text-black' : 'text-neutral-500'}`} />
                                      <span className="capitalize font-medium">{style}</span>
                                  </div>
                                  {isActive && (
                                    <motion.div 
                                        layoutId="activeDot"
                                        className="w-2 h-2 rounded-full bg-black" 
                                    />
                                  )}
                              </button>
                          )
                      })}
                  </div>
              </motion.div>
          </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default App;