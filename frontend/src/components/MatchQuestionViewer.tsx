import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';

// Define types based on what ExamWorkspace provides
interface MatchQuestionViewerProps {
  question: any;
  mapping: Record<string, string>;
  onMappingChange: (questionId: string, newMappingStr: string) => void;
  lang: string;
  uiText: any;
}

interface LineCoordinates {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isActive: boolean;
}

export const MatchQuestionViewer: React.FC<MatchQuestionViewerProps> = ({
  question,
  mapping,
  onMappingChange,
  lang,
  uiText
}) => {
  let options: any = { left: [], right: [] };
  try {
    options = question.options_json || { left: [], right: [] };
  } catch (e) {}

  const leftCol: string[] = options.left || [];
  const rightCol: string[] = options.right || [];

  const [activeMatchLeft, setActiveMatchLeft] = useState<string | null>(null);
  const [lines, setLines] = useState<LineCoordinates[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const rightRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const calculateLines = () => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLines: LineCoordinates[] = [];

    // Draw completed matches
    for (const [leftText, rightText] of Object.entries(mapping)) {
      const leftEl = leftRefs.current[leftText];
      const rightEl = rightRefs.current[rightText];

      if (leftEl && rightEl) {
        const leftRect = leftEl.getBoundingClientRect();
        const rightRect = rightEl.getBoundingClientRect();

        // Calculate center-right of left button
        const startX = leftRect.right - containerRect.left;
        const startY = leftRect.top + leftRect.height / 2 - containerRect.top;

        // Calculate center-left of right button
        const endX = rightRect.left - containerRect.left;
        const endY = rightRect.top + rightRect.height / 2 - containerRect.top;

        newLines.push({
          id: `line-${leftText}-${rightText}`,
          startX,
          startY,
          endX,
          endY,
          isActive: false
        });
      }
    }

    setLines(newLines);
  };

  useLayoutEffect(() => {
    calculateLines();
    window.addEventListener('resize', calculateLines);
    return () => window.removeEventListener('resize', calculateLines);
  }, [mapping, leftCol, rightCol, activeMatchLeft]); 

  // Recalculate after a slight delay to ensure fonts/layout shift are settled
  useEffect(() => {
    const timer = setTimeout(calculateLines, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleLeftClick = (leftText: string) => {
    if (activeMatchLeft === leftText) {
      // Double click to remove
      const newMapping = { ...mapping };
      delete newMapping[leftText];
      onMappingChange(question.question_id, JSON.stringify(newMapping));
      setActiveMatchLeft(null);
    } else {
      setActiveMatchLeft(leftText);
    }
  };

  const handleRightClick = (rightText: string) => {
    if (!activeMatchLeft) return;
    const newMapping = { ...mapping };
    // Prevent multiple lefts pointing to the same right (one-to-one)
    for (const k in newMapping) {
      if (newMapping[k] === rightText) delete newMapping[k];
    }
    newMapping[activeMatchLeft] = rightText;
    onMappingChange(question.question_id, JSON.stringify(newMapping));
    setActiveMatchLeft(null);
  };

  // Helper to draw bezier curve instead of straight line for a playful look
  const drawBezier = (startX: number, startY: number, endX: number, endY: number) => {
    const controlPointOffset = Math.abs(endX - startX) * 0.4;
    return `M ${startX} ${startY} C ${startX + controlPointOffset} ${startY}, ${endX - controlPointOffset} ${endY}, ${endX} ${endY}`;
  };

  return (
    <div className="mt-4 relative" ref={containerRef}>
      {/* SVG Canvas for drawing lines */}
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        {lines.map(line => (
          <path
            key={line.id}
            d={drawBezier(line.startX, line.startY, line.endX, line.endY)}
            stroke="#22c55e" 
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            className="animate-[draw_0.5s_ease-out_forwards] drop-shadow-sm"
          />
        ))}
        {/* Draw a subtle indicator on the active left item */}
        {activeMatchLeft && leftRefs.current[activeMatchLeft] && containerRef.current && (
          <circle
            cx={leftRefs.current[activeMatchLeft]!.getBoundingClientRect().right - containerRef.current.getBoundingClientRect().left}
            cy={leftRefs.current[activeMatchLeft]!.getBoundingClientRect().top + leftRefs.current[activeMatchLeft]!.getBoundingClientRect().height / 2 - containerRef.current.getBoundingClientRect().top}
            r="6"
            fill="#3b82f6" 
            className="animate-pulse"
          />
        )}
      </svg>

      <p className="text-sm text-slate-500 mb-8 font-bold text-center">
        {lang === 'bn' ? uiText.bn.clickLeftRight : uiText.en.clickLeftRight}
      </p>

      {/* Grid with massive gap to clearly separate left and right columns and make lines obvious */}
      <div className="grid grid-cols-2 gap-20 sm:gap-32 relative z-10 px-4">
        
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          {leftCol.map((item: any, idx) => {
            const itemId = typeof item === 'object' && item !== null ? item.id : item;
            const itemText = typeof item === 'object' && item !== null ? item.text : item;
            const isMatched = mapping[itemId] !== undefined;
            const isActive = activeMatchLeft === itemId;
            
            return (
              <button
                key={`l-${idx}`}
                ref={el => { leftRefs.current[itemId] = el; }}
                onClick={() => handleLeftClick(itemId)}
                className={`p-5 text-left rounded-2xl border-2 font-bold transition-all transform hover:scale-[1.02] shadow-sm relative ${
                  isActive 
                    ? 'border-blue-500 bg-blue-50 text-blue-700 ring-4 ring-blue-500/20' 
                    : isMatched 
                      ? 'border-green-500 bg-green-50 text-green-700 opacity-90' 
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                {itemText}
                {/* Connecting point dot for kids */}
                <div className={`absolute -right-[10px] top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-[3px] ${isActive ? 'border-blue-500 bg-white' : isMatched ? 'border-green-500 bg-green-500' : 'border-slate-300 bg-slate-100'}`} />
              </button>
            );
          })}
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {rightCol.map((item: any, idx) => {
            const itemId = typeof item === 'object' && item !== null ? item.id : item;
            const itemText = typeof item === 'object' && item !== null ? item.text : item;
            const isMatched = Object.values(mapping).includes(itemId);
            
            return (
              <button
                key={`r-${idx}`}
                ref={el => { rightRefs.current[itemId] = el; }}
                onClick={() => handleRightClick(itemId)}
                className={`p-5 text-left rounded-2xl border-2 font-bold transition-all transform hover:scale-[1.02] shadow-sm relative ${
                  activeMatchLeft 
                    ? 'border-dashed border-blue-400 hover:border-blue-500 hover:bg-blue-50 hover:ring-4 ring-blue-500/10 cursor-pointer text-slate-700 bg-white' 
                    : isMatched 
                      ? 'border-green-500 bg-green-50 text-green-700 opacity-90' 
                      : 'border-slate-200 bg-white text-slate-700 cursor-default'
                }`}
              >
                {/* Connecting point dot for kids */}
                <div className={`absolute -left-[10px] top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-[3px] ${isMatched ? 'border-green-500 bg-green-500' : activeMatchLeft ? 'border-blue-400 bg-white animate-pulse' : 'border-slate-300 bg-slate-100'}`} />
                {itemText}
              </button>
            );
          })}
        </div>

      </div>
      
      {/* Required CSS for drawing animation */}
      <style>{`
        @keyframes draw {
          from { stroke-dasharray: 2000; stroke-dashoffset: 2000; }
          to { stroke-dasharray: 2000; stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
};
