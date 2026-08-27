import React, { useState } from 'react';
import Prism from 'prismjs';

// Import Prism language components
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-markup'; // HTML / XML
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';

import { Copy, Check, Code2 } from 'lucide-react';

interface QuestionTextRendererProps {
  text: string;
  className?: string;
  codeBlockClassName?: string;
  textSize?: string;
}

interface ParsedBlock {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

/**
 * Parses markdown string into non-code text blocks and fenced code blocks (```lang ... ```)
 */
function parseMarkdownBlocks(input: string): ParsedBlock[] {
  if (!input) return [];

  const blocks: ParsedBlock[] = [];
  // Regex to capture ```lang\ncode\n``` or ```code```
  const codeBlockRegex = /```([a-zA-Z0-9_+#-]*)\s*([\s\S]*?)```/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(input)) !== null) {
    // Text before code block
    if (match.index > lastIndex) {
      const textChunk = input.substring(lastIndex, match.index);
      if (textChunk.trim().length > 0 || textChunk.includes('\n')) {
        blocks.push({ type: 'text', content: textChunk });
      }
    }

    const rawLang = match[1]?.trim().toLowerCase() || 'java';
    const codeContent = match[2] || '';

    blocks.push({
      type: 'code',
      language: rawLang || 'java',
      content: codeContent.replace(/^\r?\n|\r?\n$/g, '') // Trim leading/trailing blank lines inside code
    });

    lastIndex = codeBlockRegex.lastIndex;
  }

  // Remaining text after last code block
  if (lastIndex < input.length) {
    const textChunk = input.substring(lastIndex);
    if (textChunk.length > 0) {
      blocks.push({ type: 'text', content: textChunk });
    }
  }

  return blocks;
}

/**
 * Map aliases to Prism languages
 */
function normalizeLanguage(lang?: string): string {
  if (!lang) return 'java';
  const l = lang.toLowerCase();
  if (l === 'js') return 'javascript';
  if (l === 'ts') return 'typescript';
  if (l === 'py') return 'python';
  if (l === 'c++') return 'cpp';
  if (l === 'sh' || l === 'shell') return 'bash';
  if (l === 'html' || l === 'xml') return 'markup';
  return l;
}

/**
 * Custom CodeBlock Component with VS Code Dark+ styling, Copy Button, Language Badge, and Prism Syntax Highlighting
 */
const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const normLang = normalizeLanguage(language);
  const displayLangName = (language || 'java').toUpperCase();

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Safely get Prism highlighted HTML
  const getHighlightedHtml = () => {
    try {
      const prismLang = Prism.languages[normLang] || Prism.languages.java || Prism.languages.clike;
      return Prism.highlight(code, prismLang, normLang);
    } catch (e) {
      // Fallback to HTML escaped code if highlighting fails
      return code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
  };

  const highlightedHtml = getHighlightedHtml();
  const lines = code.split('\n');

  return (
    <div className="my-5 rounded-2xl overflow-hidden border border-slate-800 bg-[#1e1e1e] shadow-xl font-mono text-sm leading-relaxed">
      {/* IDE Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#252526] border-b border-slate-800/80 select-none">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 mr-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>
          <Code2 size={15} className="text-amber-400" />
          <span className="text-xs font-bold tracking-wider text-slate-300 bg-slate-800/80 px-2.5 py-0.5 rounded-md border border-slate-700">
            {displayLangName}
          </span>
        </div>

        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all border border-slate-700 shadow-sm active:scale-95"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check size={14} className="text-green-400" />
              <span className="text-green-400 font-bold">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} className="text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Area with Line Numbers & Horizontal Scroll */}
      <div className="flex overflow-x-auto p-4 text-[#d4d4d4] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {/* Line Numbers */}
        <div className="flex flex-col text-right pr-4 mr-4 text-slate-600 select-none border-r border-slate-800 font-mono text-xs leading-6">
          {lines.map((_, idx) => (
            <span key={idx}>{idx + 1}</span>
          ))}
        </div>

        {/* Code Content */}
        <pre
          className="font-mono text-sm leading-6 tracking-normal flex-1"
          style={{
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, Menlo, Monaco, 'Courier New', monospace",
            whiteSpace: 'pre',
            wordSpacing: 'normal',
            wordBreak: 'normal',
            tabSize: 4,
          }}
        >
          <code
            className={`language-${normLang}`}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </pre>
      </div>
    </div>
  );
};

/**
 * Strips difficulty and category bracket tags from the beginning of question text (e.g. [Practical - Medium], [Theoretical - Easy]).
 */
export function stripDifficultyTags(input: string): string {
  if (!input) return '';
  return input.replace(/^\s*\[[^\]]+\]\s*/gi, '');
}

/**
 * Strips LaTeX dollar math delimiters ($...$) and converts LaTeX math notation to clean readable text.
 */
export function cleanMathDollars(input: string): string {
  if (!input) return '';
  return input
    .replace(/\$\(r_1,\s*c_1\)\$/g, '(r1, c1)')
    .replace(/\$\(r_2,\s*c_2\)\$/g, '(r2, c2)')
    .replace(/\$\(r1,\s*c1\)\$/g, '(r1, c1)')
    .replace(/\$\(r2,\s*c2\)\$/g, '(r2, c2)')
    .replace(/\$\(r,\s*c\)\$/g, '(r, c)')
    .replace(/\$([+-]?\d+)\$/g, '$1')
    .replace(/\$([^\$]+)\$/g, '$1');
}

/**
 * Main QuestionTextRenderer Component
 * Parses question strings and renders formatted text + IDE Code Blocks.
 */
export const QuestionTextRenderer: React.FC<QuestionTextRendererProps> = ({
  text,
  className = '',
  textSize = 'text-xl'
}) => {
  if (!text) return null;

  const cleanedText = stripDifficultyTags(text);
  const blocks = parseMarkdownBlocks(cleanedText);

  return (
    <div className={`question-text-renderer ${className}`}>
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return (
            <CodeBlock
              key={idx}
              code={block.content}
              language={block.language || 'java'}
            />
          );
        }

        return (
          <div
            key={idx}
            className={`${textSize} font-semibold text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap my-2`}
          >
            {cleanMathDollars(block.content)}
          </div>
        );
      })}
    </div>
  );
};

export default QuestionTextRenderer;
