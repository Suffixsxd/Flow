import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Mic, Square, ArrowRight, Plus, Sparkles, Keyboard, Upload, X, Pause, Play, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DynamicIslandProps {
  isRecording: boolean;
  isPaused: boolean;
  onStartRecording: (title: string) => void;
  onStopRecording: () => void;
  onTogglePause: () => void;
  onSubmitText: (title: string, text: string) => void;
  onSubmitFile: (title: string, file: File) => void;
  isLoading?: boolean;
  activeNoteId?: string | null;
  onRefine?: (instruction: string) => void;
}

type InputMode = 'voice' | 'text' | 'file';

export const DynamicIsland: React.FC<DynamicIslandProps> = ({
  isRecording,
  isPaused,
  onStartRecording,
  onStopRecording,
  onTogglePause,
  onSubmitText,
  onSubmitFile,
  isLoading = false,
  activeNoteId,
  onRefine
}) => {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<InputMode>('voice');
  const [textInput, setTextInput] = useState('');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!activeNoteId;

  // Reset state when active note changes
  useEffect(() => {
    setExpanded(false);
    setTitle('');
    setTextInput('');
    setMode('voice');
  }, [activeNoteId]);

  // Focus input when expanded
  useEffect(() => {
    if (expanded && !isRecording) {
      if (isEditMode) {
          // Small delay to allow animation to start opening
          setTimeout(() => textAreaRef.current?.focus(), 100);
      } else {
          setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  }, [expanded, isRecording, isEditMode]);

  // Focus textarea when text mode active
  useEffect(() => {
    if (mode === 'text' && textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, [mode]);

  // Reset state when recording starts
  useEffect(() => {
    if (isRecording) {
      setExpanded(false);
    }
  }, [isRecording]);

  // Close when loading finishes
  useLayoutEffect(() => {
    if (!isLoading && !isRecording && expanded) {
        // If we have content in inputs, it means we just finished a submission
        // We reset regardless to ensure clean state
        setExpanded(false);
        setTitle('');
        setTextInput('');
        setMode('voice');
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [isLoading, isRecording]);


  const handleStart = () => {
    if (!isEditMode && !title.trim()) return;
    if (isEditMode && !textInput.trim() && mode === 'text') return;

    if (isEditMode && onRefine) {
        // Refine Mode
        if (mode === 'text' || mode === 'voice') {
            onRefine(textInput);
        }
    } else {
        // Add Mode
        if (mode === 'voice') {
            onStartRecording(title);
        } else if (mode === 'text') {
            if (textInput.trim()) {
                onSubmitText(title, textInput);
            }
        } else if (mode === 'file') {
            fileInputRef.current?.click();
        }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && title.trim()) {
      onSubmitFile(title, file);
    }
  };

  const closeIsland = () => {
      setExpanded(false);
      setTitle('');
      setTextInput('');
      setMode('voice');
  };

  // Calculate dynamic dimensions based on state
  const getDimensions = () => {
      if (isRecording) return { width: 340, height: 60 };
      if (isLoading) return { width: 220, height: 60 };
      if (!expanded) {
          return { width: isEditMode ? 160 : 180, height: 60 };
      }
      
      // Expanded Dimensions
      if (isEditMode) {
           return { width: 500, height: 200 }; // Compact for edit instructions
      }
      
      if (mode === 'text') return { width: 550, height: 280 };
      return { width: 520, height: 140 }; 
  };

  const dimensions = getDimensions();

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
      <style>{`
        /* Force hide content when not expanded to prevent layout issues and click blocking */
        [data-expanded="false"] .island-content,
        [data-recording="true"] .island-content,
        [data-loading="true"] .island-content {
          display: none !important;
          opacity: 0 !important;
          pointer-events: none !important;
          visibility: hidden !important;
        }
      `}</style>

      <motion.div
        layout
        initial={false}
        animate={dimensions}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30
        }}
        data-loading={isLoading ? "true" : "false"}
        data-recording={isRecording ? "true" : "false"}
        data-expanded={expanded ? "true" : "false"}
        className="relative flex flex-col items-center justify-center bg-black/90 backdrop-blur-2xl border border-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_20px_40px_-12px_rgba(0,0,0,0.8)] overflow-hidden"
        style={{ borderRadius: 32 }}
      >
        <AnimatePresence>
          
          {/* STATE: Loading */}
          {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                className="flex items-center space-x-3 absolute inset-0 justify-center z-20 pointer-events-none"
              >
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span className="text-sm font-medium text-neutral-300">
                      {isEditMode ? 'Refining...' : 'Analyzing...'}
                  </span>
              </motion.div>
          )}

          {/* STATE: Idle Button */}
          {!expanded && !isRecording && !isLoading && (
            <motion.button
              key="idle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
              onClick={() => {
                  setExpanded(true);
                  if (isEditMode) setMode('text'); // Default to text for refine
              }}
              className="absolute inset-0 w-full h-full flex items-center justify-center space-x-2.5 text-white hover:bg-white/5 transition-colors z-10"
            >
              <div className="bg-white text-black p-1 rounded-full flex items-center justify-center">
                {isEditMode ? <Sparkles size={16} /> : <Plus size={16} />}
              </div>
              <span className="font-medium text-sm tracking-wide pt-0.5">
                  {isEditMode ? "Refine" : "Add Note"}
              </span>
            </motion.button>
          )}

          {/* STATE: Recording */}
          {isRecording && !isLoading && (
            <motion.div
              key="recording"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between w-full px-6 h-full absolute inset-0 z-20"
            >
              <div className="flex items-center space-x-4">
                <div className="relative flex items-center justify-center w-3 h-3">
                  {!isPaused && <span className="absolute w-full h-full bg-red-500 rounded-full animate-ping opacity-75" />}
                  <span className={`relative w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500'}`} />
                </div>
                
                {isPaused ? (
                    <span className="text-neutral-400 text-xs font-mono uppercase tracking-widest pt-0.5">Paused</span>
                ) : (
                    <div className="flex items-center gap-1 h-6">
                    {[...Array(5)].map((_, i) => (
                        <motion.div
                        key={i}
                        animate={{
                            height: [8, 16, 6, 20, 8],
                        }}
                        transition={{
                            repeat: Infinity,
                            duration: 0.5 + Math.random() * 0.5,
                            ease: "easeInOut",
                            delay: i * 0.1
                        }}
                        className="w-1 bg-white/80 rounded-full"
                        />
                    ))}
                    </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                 <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePause();
                    }}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center"
                  >
                    {isPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStopRecording();
                    }}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center"
                  >
                    <Square size={14} fill="currentColor" />
                  </button>
              </div>
            </motion.div>
          )}

          {/* STATE: Expanded */}
          {expanded && !isRecording && !isLoading && (
            <motion.div
                key="expanded-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0 } }}
                className="w-full h-full flex flex-col p-2 island-content z-30"
            >
                {/* Header Section */}
                <div className="flex items-center w-full px-4 pt-3 pb-2 gap-3 h-[60px] shrink-0">
                    <div className="w-8 h-8 flex items-center justify-center text-neutral-400 shrink-0">
                        {isEditMode ? <Wand2 size={18} /> : <Sparkles size={18} />}
                    </div>
                    
                    {isEditMode ? (
                        <div className="flex-1 text-neutral-500 text-sm font-medium tracking-wide">
                            Refine Note
                        </div>
                    ) : (
                        <input
                            ref={inputRef}
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Name your note..."
                            className="flex-1 bg-transparent border-none outline-none text-white text-lg placeholder-neutral-600 min-w-0 font-light pt-0.5"
                        />
                    )}

                    <button 
                        onClick={closeIsland}
                        className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-neutral-400 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body Section */}
                <motion.div 
                    layout
                    className="flex-1 w-full px-4 flex flex-col"
                >
                    {/* Text Input Area */}
                    {(mode === 'text' || isEditMode) && (
                        <motion.textarea
                            ref={textAreaRef}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder={isEditMode ? "How should I change this? (e.g. 'Make it shorter')" : "Type your notes here..."}
                            className="w-full flex-1 bg-white/5 rounded-xl p-4 text-neutral-300 placeholder-neutral-600 resize-none outline-none border border-white/5 mb-3 text-sm font-light leading-relaxed scrollbar-hide"
                        />
                    )}

                    <div className="flex items-center justify-between mt-auto pb-2">
                        {/* Mode Toggles (Hidden in Edit Mode if simplistic) */}
                        <div className="flex items-center space-x-1 bg-white/5 rounded-full p-1 border border-white/5">
                            {/* In Edit mode, we focus on Text instructions for simplicity, but could allow Voice instructions later */}
                            {!isEditMode && (
                                <>
                                <button 
                                    onClick={() => setMode('voice')}
                                    className={`p-2 rounded-full transition-all ${mode === 'voice' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                                >
                                    <Mic size={16} />
                                </button>
                                </>
                            )}
                            
                            <button 
                                onClick={() => setMode('text')}
                                className={`p-2 rounded-full transition-all ${mode === 'text' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                            >
                                <Keyboard size={16} />
                            </button>

                            {!isEditMode && (
                                <button 
                                    onClick={() => setMode('file')}
                                    className={`p-2 rounded-full transition-all ${mode === 'file' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                                >
                                    <Upload size={16} />
                                </button>
                            )}
                        </div>

                        {/* Action Button */}
                        <AnimatePresence mode="wait">
                            {(isEditMode ? textInput.trim().length > 0 : title.trim().length > 0) && (
                                <motion.button
                                    key="submit"
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.5 }}
                                    onClick={handleStart}
                                    className="h-10 px-5 rounded-full bg-white text-black flex items-center space-x-2 font-medium text-sm hover:scale-105 active:scale-95 transition-transform"
                                >
                                    <span>
                                        {isEditMode ? 'Refine' : mode === 'voice' ? 'Record' : mode === 'text' ? 'Curate' : 'Upload'}
                                    </span>
                                    {mode !== 'voice' && <ArrowRight size={14} />}
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".txt,.md,.pdf,.docx"
        onChange={handleFileChange}
      />
    </div>
  );
};