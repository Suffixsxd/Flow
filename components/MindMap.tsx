import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, RefreshCcw, Move } from 'lucide-react';

interface MindMapProps {
  code: string;
}

export const MindMap: React.FC<MindMapProps> = ({ code }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [scale, setScale] = useState(0.8); // Start slightly zoomed out for big maps
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: {
              primaryColor: '#111',
              primaryTextColor: '#fff',
              primaryBorderColor: '#444',
              lineColor: '#666',
              secondaryColor: '#222',
              tertiaryColor: '#111'
          },
          securityLevel: 'loose',
          fontFamily: 'Inter, sans-serif',
          flowchart: {
              curve: 'basis',
              padding: 60, // More breathing room inside graph
              nodeSpacing: 80, // More space between nodes horizontally
              rankSpacing: 100, // More space between levels vertically
              useMaxWidth: false,
              htmlLabels: true,
          }
        });
    } catch (e) {
        console.error("Mermaid init error", e);
    }
  }, []);

  useEffect(() => {
    const renderChart = async () => {
      if (!code || !code.trim()) return;
      
      try {
        setError(false);
        const id = `mermaid-${Date.now()}`;
        // Render
        const { svg } = await mermaid.render(id, code);
        setSvg(svg);
        // Reset scale only if it's a fresh render to avoid jumping
        // We rely on user interactions for perfect fit
      } catch (err) {
        console.error("Mermaid render error:", err);
        setError(true);
      }
    };

    renderChart();
  }, [code]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 4));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.2));
  const handleReset = () => setScale(0.8);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY * -0.001;
        setScale(prev => Math.min(Math.max(0.2, prev + delta), 4));
    }
  };

  if (error) {
      return (
          <div className="w-full h-[60vh] flex flex-col items-center justify-center text-red-400 bg-red-900/10 rounded-3xl border border-red-500/20 p-6 text-center">
              <span className="mb-2 font-medium">Failed to visualize Mind Map</span>
              <span className="text-xs text-red-500/70 mb-4">The AI generated complex syntax that could not be rendered.</span>
              <pre className="text-[10px] text-neutral-500 bg-black/50 p-2 rounded max-w-full overflow-hidden text-ellipsis opacity-50">
                  {code.substring(0, 100)}...
              </pre>
          </div>
      )
  }

  return (
    <div 
        ref={containerRef}
        className="relative w-full h-[85vh] bg-[#050505] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl group select-none"
        onWheel={handleWheel}
    >
        {/* Spatial Grid Background */}
        <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ 
                backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', 
                backgroundSize: '40px 40px' 
            }} 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 pointer-events-none" />

        {/* Canvas Area */}
        {svg ? (
            <motion.div
                className="w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center origin-center"
                drag
                dragConstraints={{ left: -2000, right: 2000, top: -2000, bottom: 2000 }}
                dragMomentum={false}
            >
                <motion.div 
                    animate={{ scale }} 
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    dangerouslySetInnerHTML={{ __html: svg }} 
                    className="mermaid-canvas flex items-center justify-center p-20"
                />
            </motion.div>
        ) : (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-3">
                 <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                 <span className="text-neutral-500 text-sm tracking-wide">Drawing neural graph...</span>
            </div>
        )}

        {/* Floating Controls */}
        <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-10">
            <button onClick={handleZoomIn} className="p-3 bg-neutral-800/80 hover:bg-neutral-700 text-white rounded-full border border-white/10 backdrop-blur-md shadow-lg transition-colors" title="Zoom In">
                <ZoomIn size={20} />
            </button>
            <button onClick={handleZoomOut} className="p-3 bg-neutral-800/80 hover:bg-neutral-700 text-white rounded-full border border-white/10 backdrop-blur-md shadow-lg transition-colors" title="Zoom Out">
                <ZoomOut size={20} />
            </button>
            <button onClick={handleReset} className="p-3 bg-neutral-800/80 hover:bg-neutral-700 text-white rounded-full border border-white/10 backdrop-blur-md shadow-lg transition-colors" title="Reset View">
                <RefreshCcw size={20} />
            </button>
        </div>

        {/* Hint */}
        <div className="absolute top-6 left-6 flex items-center space-x-2 text-neutral-500 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 pointer-events-none">
            <Move size={12} />
            <span className="text-[10px] uppercase tracking-wider font-medium">Drag to Pan • Scroll to Zoom</span>
        </div>
    </div>
  );
};