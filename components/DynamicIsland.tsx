import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, ArrowRight, Plus, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DynamicIslandProps {
  isRecording: boolean;
  onStartRecording: (title: string) => void;
  onStopRecording: () => void;
  audioLevel?: number;
}

export const DynamicIsland: React.FC<DynamicIslandProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when expanded
  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [expanded]);

  // Reset state when recording starts/stops
  useEffect(() => {
    if (isRecording) {
      setExpanded(false);
      setTitle('');
    }
  }, [isRecording]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (title.trim()) {
      onStartRecording(title);
    }
  };

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
      <motion.div
        layout
        initial={false}
        animate={{
          width: isRecording ? 340 : (expanded ? 520 : 180),
          height: 60,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30
        }}
        className="relative flex items-center justify-center bg-black/80 backdrop-blur-xl border border-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_20px_40px_-12px_rgba(0,0,0,0.8)] overflow-hidden"
        style={{ borderRadius: 30 }}
      >
        <AnimatePresence mode="wait">
          
          {/* STATE: Idle (Add Note) */}
          {!expanded && !isRecording && (
            <motion.button
              key="idle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
              onClick={() => setExpanded(true)}
              className="absolute inset-0 w-full h-full flex items-center justify-center space-x-2.5 text-white hover:bg-white/5 transition-colors"
            >
              <div className="bg-white text-black p-1 rounded-full flex items-center justify-center">
                <Plus size={16} />
              </div>
              <span className="font-medium text-sm tracking-wide pt-0.5">Add Note</span>
            </motion.button>
          )}

          {/* STATE: Input (Naming) */}
          {expanded && !isRecording && (
            <motion.form
              key="input"
              initial={{ opacity: 0, filter: 'blur(4px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(4px)', transition: { duration: 0.1 } }}
              onSubmit={handleSubmit}
              className="flex items-center w-full px-4 h-full gap-3"
            >
              <div className="w-8 h-8 flex items-center justify-center text-neutral-400 shrink-0">
                <Sparkles size={18} />
              </div>
              
              <input
                ref={inputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Name your note..."
                className="flex-1 bg-transparent border-none outline-none text-white text-lg placeholder-neutral-600 min-w-0 font-light pt-0.5"
                onBlur={() => {
                  if (!title.trim()) setExpanded(false);
                }}
              />

              <div className="w-10 flex justify-center shrink-0">
                <AnimatePresence>
                  {title.trim().length > 0 && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      type="submit"
                      className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                    >
                      <ArrowRight size={18} />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </motion.form>
          )}

          {/* STATE: Recording */}
          {isRecording && (
            <motion.div
              key="recording"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between w-full px-6 h-full"
            >
              <div className="flex items-center space-x-4">
                <div className="relative flex items-center justify-center w-3 h-3">
                  <span className="absolute w-full h-full bg-red-500 rounded-full animate-ping opacity-75" />
                  <span className="relative w-2.5 h-2.5 bg-red-500 rounded-full" />
                </div>
                
                {/* Audio Waveform Simulation */}
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
                <span className="text-neutral-400 text-xs font-mono uppercase tracking-widest pt-0.5">Recording</span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStopRecording();
                }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center"
              >
                <Square size={14} fill="currentColor" />
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
};