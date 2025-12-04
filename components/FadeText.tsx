import React, { useMemo } from 'react';

interface FadeTextProps {
  text: string;
  className?: string;
  speed?: number; // ms per word
}

interface WordToken {
  text: string;
  bold: boolean;
  italic: boolean;
}

export const FadeText: React.FC<FadeTextProps> = ({ text, className = "", speed = 30 }) => {
  
  const tokens = useMemo(() => {
    // Safety check for undefined/null text
    const safeText = text || "";
    const rawWords = safeText.split(' ');
    const result: WordToken[] = [];
    
    let activeBold = false;
    let activeItalic = false;

    for (const rawWord of rawWords) {
        let cleanWord = rawWord;
        let currentBold = activeBold;
        let currentItalic = activeItalic;

        // Check start markers
        if (cleanWord.startsWith('**')) {
            currentBold = true;
            activeBold = true;
            cleanWord = cleanWord.substring(2);
        } else if (cleanWord.startsWith('*')) {
            currentItalic = true;
            activeItalic = true;
            cleanWord = cleanWord.substring(1);
        }

        // Check end markers (handle simple case where start/end are on same word first)
        // Re-check string content because we might have modified it above
        
        let processed = false;
        
        if (cleanWord.endsWith('**')) {
            // If it was a single word bold like "**Word**", activeBold is true, we want to turn it off for NEXT word
            if (activeBold) {
                activeBold = false;
            }
            cleanWord = cleanWord.substring(0, cleanWord.length - 2);
            processed = true;
        } 
        
        if (!processed && cleanWord.endsWith('*')) {
            if (activeItalic) {
                 activeItalic = false;
            }
            cleanWord = cleanWord.substring(0, cleanWord.length - 1);
        }
        
        // Edge case: empty string after stripping (e.g. just "**")
        if (cleanWord.length === 0 && rawWord.length > 0) continue;

        result.push({
            text: cleanWord,
            bold: currentBold,
            italic: currentItalic
        });
    }
    return result;
  }, [text]);

  return (
    <span className={`leading-relaxed ${className}`}>
      {tokens.map((token, index) => (
        <span
          key={index}
          className={`inline-block mr-1 opacity-0 animate-fade-in ${token.bold ? 'font-bold text-white' : ''} ${token.italic ? 'italic text-neutral-300' : ''}`}
          style={{
            animationName: 'fadeIn',
            animationDuration: '0.5s',
            animationFillMode: 'forwards',
            animationDelay: `${Math.min(index * 0.03, 2)}s`, // Faster delay for smoother reading
            animationTimingFunction: 'ease-out'
          }}
        >
          {token.text}
        </span>
      ))}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); filter: blur(2px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
      `}</style>
    </span>
  );
};