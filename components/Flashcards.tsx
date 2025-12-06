import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Flashcard } from '../types';

interface FlashcardsProps {
  cards: Flashcard[];
}

export const Flashcards: React.FC<FlashcardsProps> = ({ cards }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCard = cards[currentIndex];

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleReset = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsFlipped(false);
      setCurrentIndex(0);
  };

  if (!cards || cards.length === 0) {
      return <div className="text-center text-neutral-500 py-10">No flashcards available.</div>
  }

  return (
    <div className="flex flex-col items-center w-full">
        <div className="w-full aspect-[4/3] sm:aspect-[16/9] perspective-1000 relative cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
            <motion.div
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                className="w-full h-full relative preserve-3d"
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* Front */}
                <div 
                    className="absolute inset-0 backface-hidden bg-neutral-900 border border-white/10 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center shadow-2xl"
                    style={{ backfaceVisibility: 'hidden' }}
                >
                     <span className="absolute top-6 left-6 text-xs font-bold tracking-widest text-neutral-500 uppercase">Question</span>
                     <p className="text-2xl font-medium text-white leading-relaxed">{currentCard.front}</p>
                     <span className="absolute bottom-6 text-xs text-neutral-600 font-medium">Click to flip</span>
                </div>

                {/* Back */}
                <div 
                    className="absolute inset-0 backface-hidden bg-white text-black rounded-[2rem] p-8 flex flex-col items-center justify-center text-center shadow-2xl"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                    <span className="absolute top-6 left-6 text-xs font-bold tracking-widest text-neutral-400 uppercase">Answer</span>
                    <p className="text-xl font-medium leading-relaxed">{currentCard.back}</p>
                    <span className="absolute bottom-6 text-xs text-neutral-400 font-medium">Click to flip back</span>
                </div>
            </motion.div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between w-full mt-8 px-4">
            <button 
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="p-3 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
                <ChevronLeft className="w-6 h-6" />
            </button>
            
            <div className="flex flex-col items-center">
                <span className="text-sm font-medium text-neutral-400">Card {currentIndex + 1} of {cards.length}</span>
                <div className="flex gap-1 mt-2">
                    {cards.map((_, idx) => (
                        <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentIndex ? 'bg-white' : 'bg-white/20'}`} />
                    ))}
                </div>
            </div>

            <button 
                onClick={currentIndex === cards.length - 1 ? handleReset : handleNext}
                className="p-3 rounded-full hover:bg-white/10 transition-colors"
            >
                {currentIndex === cards.length - 1 ? <RotateCcw className="w-5 h-5" /> : <ChevronRight className="w-6 h-6" />}
            </button>
        </div>
    </div>
  );
};