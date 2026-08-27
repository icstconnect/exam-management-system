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
  strokeColor: string;
  leftIndex: number;
}

// Curated 10 high-distinction, accessible color profiles
export interface ConnectionColorStyle {
  name: string;
  lineHex: string;
  // Border colors
  cardBorder: string;
  // Background tint
  cardBg: string;
  // Text color
  cardText: string;
  // Active/selected ring
  ringClass: string;
  // Tag / Badge
  badgeBg: string;
  badgeText: string;
  // Dot border & bg
  dotBorder: string;
  dotBg: string;
}

export const CONNECTION_PALETTE: ConnectionColorStyle[] = [
  {
    name: 'blue',
    lineHex: '#2563eb', // Blue-600
    cardBorder: 'border-blue-500',
    cardBg: 'bg-blue-50/90',
    cardText: 'text-blue-950',
    ringClass: 'ring-blue-400/40',
    badgeBg: 'bg-blue-600',
    badgeText: 'text-white',
    dotBorder: 'border-blue-600',
    dotBg: 'bg-blue-600'
  },
  {
    name: 'orange',
    lineHex: '#ea580c', // Orange-600
    cardBorder: 'border-orange-500',
    cardBg: 'bg-orange-50/90',
    cardText: 'text-orange-950',
    ringClass: 'ring-orange-400/40',
    badgeBg: 'bg-orange-600',
    badgeText: 'text-white',
    dotBorder: 'border-orange-600',
    dotBg: 'bg-orange-600'
  },
  {
    name: 'purple',
    lineHex: '#9333ea', // Purple-600
    cardBorder: 'border-purple-500',
    cardBg: 'bg-purple-50/90',
    cardText: 'text-purple-950',
    ringClass: 'ring-purple-400/40',
    badgeBg: 'bg-purple-600',
    badgeText: 'text-white',
    dotBorder: 'border-purple-600',
    dotBg: 'bg-purple-600'
  },
  {
    name: 'pink',
    lineHex: '#db2777', // Pink-600
    cardBorder: 'border-pink-500',
    cardBg: 'bg-pink-50/90',
    cardText: 'text-pink-950',
    ringClass: 'ring-pink-400/40',
    badgeBg: 'bg-pink-600',
    badgeText: 'text-white',
    dotBorder: 'border-pink-600',
    dotBg: 'bg-pink-600'
  },
  {
    name: 'teal',
    lineHex: '#0d9488', // Teal-600
    cardBorder: 'border-teal-500',
    cardBg: 'bg-teal-50/90',
    cardText: 'text-teal-950',
    ringClass: 'ring-teal-400/40',
    badgeBg: 'bg-teal-600',
    badgeText: 'text-white',
    dotBorder: 'border-teal-600',
    dotBg: 'bg-teal-600'
  },
  {
    name: 'indigo',
    lineHex: '#4f46e5', // Indigo-600
    cardBorder: 'border-indigo-500',
    cardBg: 'bg-indigo-50/90',
    cardText: 'text-indigo-950',
    ringClass: 'ring-indigo-400/40',
    badgeBg: 'bg-indigo-600',
    badgeText: 'text-white',
    dotBorder: 'border-indigo-600',
    dotBg: 'bg-indigo-600'
  },
  {
    name: 'amber',
    lineHex: '#d97706', // Amber-600
    cardBorder: 'border-amber-500',
    cardBg: 'bg-amber-50/90',
    cardText: 'text-amber-950',
    ringClass: 'ring-amber-400/40',
    badgeBg: 'bg-amber-600',
    badgeText: 'text-white',
    dotBorder: 'border-amber-600',
    dotBg: 'bg-amber-600'
  },
  {
    name: 'rose',
    lineHex: '#e11d48', // Rose-600
    cardBorder: 'border-rose-500',
    cardBg: 'bg-rose-50/90',
    cardText: 'text-rose-950',
    ringClass: 'ring-rose-400/40',
    badgeBg: 'bg-rose-600',
    badgeText: 'text-white',
    dotBorder: 'border-rose-600',
    dotBg: 'bg-rose-600'
  },
  {
    name: 'emerald',
    lineHex: '#059669', // Emerald-600
    cardBorder: 'border-emerald-500',
    cardBg: 'bg-emerald-50/90',
    cardText: 'text-emerald-950',
    ringClass: 'ring-emerald-400/40',
    badgeBg: 'bg-emerald-600',
    badgeText: 'text-white',
    dotBorder: 'border-emerald-600',
    dotBg: 'bg-emerald-600'
  },
  {
    name: 'cyan',
    lineHex: '#0891b2', // Cyan-600
    cardBorder: 'border-cyan-500',
    cardBg: 'bg-cyan-50/90',
    cardText: 'text-cyan-950',
    ringClass: 'ring-cyan-400/40',
    badgeBg: 'bg-cyan-600',
    badgeText: 'text-white',
    dotBorder: 'border-cyan-600',
    dotBg: 'bg-cyan-600'
  }
];

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

  const leftCol: any[] = options.left || [];
  const rightCol: any[] = options.right || [];

  const [activeMatchLeft, setActiveMatchLeft] = useState<string | null>(null);
  const [lines, setLines] = useState<LineCoordinates[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const rightRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Helper to get deterministic color style based on the Left item index
  const getColorStyleForLeftIndex = (idx: number): ConnectionColorStyle => {
    const safeIdx = Math.max(0, idx);
    return CONNECTION_PALETTE[safeIdx % CONNECTION_PALETTE.length];
  };

  // Helper to find which Left item a Right item is connected to
  const getConnectedLeftForRight = (rightId: string): { leftId: string; leftIndex: number; style: ConnectionColorStyle } | null => {
    for (const [leftId, connectedRightId] of Object.entries(mapping)) {
      if (connectedRightId === rightId) {
        const leftIndex = leftCol.findIndex(item => {
          const id = typeof item === 'object' && item !== null ? item.id : item;
          return id === leftId;
        });
        return {
          leftId,
          leftIndex: leftIndex >= 0 ? leftIndex : 0,
          style: getColorStyleForLeftIndex(leftIndex >= 0 ? leftIndex : 0)
        };
      }
    }
    return null;
  };

  const calculateLines = () => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLines: LineCoordinates[] = [];

    // Draw completed matches with deterministic unique colors
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

        const leftIdx = leftCol.findIndex(item => {
          const id = typeof item === 'object' && item !== null ? item.id : item;
          return id === leftText;
        });
        const style = getColorStyleForLeftIndex(leftIdx >= 0 ? leftIdx : 0);

        newLines.push({
          id: `line-${leftText}-${rightText}`,
          startX,
          startY,
          endX,
          endY,
          strokeColor: style.lineHex,
          leftIndex: leftIdx >= 0 ? leftIdx : 0
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
      // Toggle / remove on re-clicking the same active left item
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

  // Helper to draw smooth bezier curve for clear connection line
  const drawBezier = (startX: number, startY: number, endX: number, endY: number) => {
    const controlPointOffset = Math.abs(endX - startX) * 0.4;
    return `M ${startX} ${startY} C ${startX + controlPointOffset} ${startY}, ${endX - controlPointOffset} ${endY}, ${endX} ${endY}`;
  };

  return (
    <div className="mt-4 relative select-none" ref={containerRef}>
      {/* SVG Canvas for drawing colored lines */}
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        <defs>
          <filter id="line-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.25"/>
          </filter>
        </defs>

        {lines.map(line => (
          <path
            key={line.id}
            d={drawBezier(line.startX, line.startY, line.endX, line.endY)}
            stroke={line.strokeColor} 
            strokeWidth="4.5"
            fill="none"
            strokeLinecap="round"
            filter="url(#line-shadow)"
            className="transition-all duration-300 animate-[draw_0.4s_ease-out_forwards]"
          />
        ))}

        {/* Draw active connecting pulse dot */}
        {activeMatchLeft && leftRefs.current[activeMatchLeft] && containerRef.current && (
          <circle
            cx={leftRefs.current[activeMatchLeft]!.getBoundingClientRect().right - containerRef.current.getBoundingClientRect().left}
            cy={leftRefs.current[activeMatchLeft]!.getBoundingClientRect().top + leftRefs.current[activeMatchLeft]!.getBoundingClientRect().height / 2 - containerRef.current.getBoundingClientRect().top}
            r="7"
            fill="#3b82f6" 
            className="animate-ping"
          />
        )}
      </svg>

      <p className="text-sm text-slate-500 mb-6 font-bold text-center">
        {lang === 'bn' ? uiText.bn.clickLeftRight : uiText.en.clickLeftRight}
      </p>

      {/* Column Headers */}
      <div className="grid grid-cols-2 gap-12 sm:gap-24 relative z-10 px-2 mb-3">
        <div className="flex items-center justify-between px-3.5 py-2 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs">
          <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-600"></span>
            {lang === 'bn' ? 'বাম কলাম (কলাম ক)' : 'Column A'}
          </span>
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-[#111827] px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
            {Object.keys(mapping).length}/{leftCol.length} {lang === 'bn' ? 'মিলিত' : 'Matched'}
          </span>
        </div>
        <div className="flex items-center justify-between px-3.5 py-2 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs">
          <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
            {lang === 'bn' ? 'ডান কলাম (কলাম খ)' : 'Column B'}
          </span>
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-[#111827] px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
            {rightCol.length} {lang === 'bn' ? 'বিকল্প' : 'Options'}
          </span>
        </div>
      </div>

      {/* Grid with clear gap to separate left and right columns and make colored lines prominent */}
      <div className="grid grid-cols-2 gap-12 sm:gap-24 relative z-10 px-2">
        
        {/* Left Column (Column A) */}
        <div className="flex flex-col gap-4">
          {leftCol.map((item: any, idx) => {
            const itemId = typeof item === 'object' && item !== null ? item.id : item;
            const itemText = typeof item === 'object' && item !== null ? item.text : item;
            const isMatched = mapping[itemId] !== undefined;
            const isActive = activeMatchLeft === itemId;
            const style = getColorStyleForLeftIndex(idx);
            
            return (
              <button
                key={`l-${idx}`}
                ref={el => { leftRefs.current[itemId] = el; }}
                onClick={() => handleLeftClick(itemId)}
                className={`p-4 sm:p-5 text-left rounded-2xl border-2 font-bold transition-all transform hover:scale-[1.01] shadow-sm relative break-words leading-relaxed ${
                  isActive 
                    ? 'border-blue-600 bg-blue-600 text-white ring-4 ring-blue-300 shadow-md scale-[1.02]' 
                    : isMatched 
                      ? `${style.cardBorder} ${style.cardBg} ${style.cardText} ring-2 ${style.ringClass}` 
                      : 'border-slate-200 dark:border-slate-700/80 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-[#151f32] hover:bg-blue-50/30 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 flex-1">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-black flex-shrink-0 mt-0.5 ${
                      isActive 
                        ? 'bg-white text-blue-700' 
                        : isMatched 
                          ? `${style.badgeBg} ${style.badgeText}` 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="flex-1 break-words">{itemText}</span>
                  </div>

                  {isMatched && (
                    <span 
                      className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md self-start text-white shadow-xs"
                      style={{ backgroundColor: style.lineHex }}
                    >
                      ✓ #{idx + 1}
                    </span>
                  )}
                </div>

                {/* Connecting point dot on right edge */}
                <div 
                  className={`absolute -right-[10px] top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-[3px] shadow-sm transition-all ${
                    isActive 
                      ? 'border-blue-600 bg-white ring-2 ring-blue-300 scale-110' 
                      : isMatched 
                        ? `${style.dotBorder} ${style.dotBg} ring-2 ${style.ringClass}` 
                        : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700'
                  }`} 
                />
              </button>
            );
          })}
        </div>

        {/* Right Column (Column B) */}
        <div className="flex flex-col gap-4">
          {rightCol.map((item: any, idx) => {
            const itemId = typeof item === 'object' && item !== null ? item.id : item;
            const itemText = typeof item === 'object' && item !== null ? item.text : item;
            const connectionInfo = getConnectedLeftForRight(itemId);
            const isMatched = connectionInfo !== null;
            const matchedStyle = connectionInfo?.style;
            
            return (
              <button
                key={`r-${idx}`}
                ref={el => { rightRefs.current[itemId] = el; }}
                onClick={() => handleRightClick(itemId)}
                className={`p-4 sm:p-5 text-left rounded-2xl border-2 font-bold transition-all transform hover:scale-[1.01] shadow-sm relative break-words leading-relaxed ${
                  activeMatchLeft 
                    ? 'border-dashed border-primary-500 bg-primary-50/70 dark:bg-primary-950/50 hover:bg-primary-100 dark:hover:bg-primary-900/60 hover:border-primary-600 hover:ring-4 ring-primary-300/30 cursor-pointer text-slate-900 dark:text-white' 
                    : isMatched && matchedStyle
                      ? `${matchedStyle.cardBorder} ${matchedStyle.cardBg} ${matchedStyle.cardText} ring-2 ${matchedStyle.ringClass}` 
                      : 'border-slate-200 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-500 bg-white dark:bg-[#151f32] text-slate-800 dark:text-slate-100'
                }`}
              >
                {/* Connecting point dot on left edge */}
                <div 
                  className={`absolute -left-[10px] top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-[3px] shadow-sm transition-all ${
                    isMatched && matchedStyle
                      ? `${matchedStyle.dotBorder} ${matchedStyle.dotBg} ring-2 ${matchedStyle.ringClass}` 
                      : activeMatchLeft 
                        ? 'border-primary-500 bg-white animate-pulse' 
                        : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700'
                  }`} 
                />
                
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 flex-1">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-black flex-shrink-0 mt-0.5 ${
                      isMatched && matchedStyle
                        ? `${matchedStyle.badgeBg} ${matchedStyle.badgeText}` 
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1 break-words">{itemText}</span>
                  </div>

                  {isMatched && connectionInfo && (
                    <span 
                      className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md self-start text-white shadow-xs"
                      style={{ backgroundColor: connectionInfo.style.lineHex }}
                    >
                      Item #{connectionInfo.leftIndex + 1}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

      </div>
      
      {/* Required CSS for smooth drawing animation */}
      <style>{`
        @keyframes draw {
          from { stroke-dasharray: 2000; stroke-dashoffset: 2000; }
          to { stroke-dasharray: 2000; stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
};
