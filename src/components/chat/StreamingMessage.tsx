"use client";

import { useState, useEffect } from "react";
import { CopyIcon, ThumbsUpIcon, ThumbsDownIcon } from "@/components/icons/Icons";

interface StreamingMessageProps {
  content: string;
  isStreaming?: boolean;
  onCopy?: (content: string) => void;
  onFeedback?: (type: 'positive' | 'negative') => void;
}

export function StreamingMessage({ 
  content, 
  isStreaming = false,
  onCopy,
  onFeedback 
}: StreamingMessageProps) {
  const [displayedContent, setDisplayedContent] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (isStreaming && currentIndex < content.length) {
      const timer = setTimeout(() => {
        setDisplayedContent(content.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 20); // Adjust typing speed here

      return () => clearTimeout(timer);
    } else if (!isStreaming) {
      setDisplayedContent(content);
      setCurrentIndex(content.length);
    }
  }, [content, currentIndex, isStreaming]);

  const handleCopy = async () => {
    if (onCopy) {
      onCopy(content);
    }
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="group relative">
      <div className="prose prose-sm max-w-none">
        <div 
          className="text-text-primary leading-relaxed whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ 
            __html: processMarkdown(displayedContent) 
          }}
        />
        {isStreaming && currentIndex >= displayedContent.length && (
          <span className="inline-block w-2 h-5 bg-electric-blue animate-pulse ml-1" />
        )}
      </div>

      {/* Action buttons */}
      {!isStreaming && displayedContent && (
        <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text-secondary glass-card rounded transition-colors"
            title="Copy to clipboard"
          >
            <CopyIcon size={12} />
            Copy
          </button>
          
          {onFeedback && (
            <>
              <button
                onClick={() => onFeedback('positive')}
                className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-green-400 glass-card rounded transition-colors"
                title="Good response"
              >
                <ThumbsUpIcon size={12} />
              </button>
              <button
                onClick={() => onFeedback('negative')}
                className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-red-400 glass-card rounded transition-colors"
                title="Poor response"
              >
                <ThumbsDownIcon size={12} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Enhanced markdown processor with better formatting
function processMarkdown(text: string): string {
  return text
    // Code blocks with syntax highlighting
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<div class="code-block relative bg-bg-tertiary rounded-lg border border-glass-border p-4 my-4">
        <div class="code-toolbar">
          ${lang ? `<span class="lang text-xs text-text-muted">${lang}</span>` : ''}
          <button class="copy-btn p-1 hover:bg-white/10 rounded" onclick="navigator.clipboard.writeText('${escapeForJs(code.trim())}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
        </div>
        <pre class="text-sm overflow-x-auto"><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>
      </div>`;
    })
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-text-primary mt-6 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold text-text-primary mt-6 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-text-primary mt-6 mb-4">$1</h1>')
    // Bold text with ** 
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-text-primary">$1</strong>')
    // Lists with proper spacing
    .replace(/^[\s]*-[\s]+(.+)$/gm, '<li class="ml-4 mb-1 list-disc">$1</li>')
    .replace(/^[\s]*\d+\.[\s]+(.+)$/gm, '<li class="ml-4 mb-1 list-decimal">$1</li>')
    // Wrap consecutive list items in ul/ol
    .replace(/(<li[^>]*>.*?<\/li>)(?:\s*<li[^>]*>.*?<\/li>)*/g, (match) => {
      if (match.includes('list-disc')) {
        return `<ul class="space-y-1 my-3">${match}</ul>`;
      } else {
        return `<ol class="space-y-1 my-3">${match}</ol>`;
      }
    })
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-bg-tertiary px-1.5 py-0.5 rounded text-sm font-mono text-electric-blue">$1</code>')
    // Line breaks for double newlines (paragraphs)
    .replace(/\n\n/g, '</p><p class="mb-3">')
    // Wrap in paragraph tags
    .replace(/^/, '<p class="mb-3">')
    .replace(/$/, '</p>')
    // Single line breaks
    .replace(/\n/g, '<br>');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function escapeForJs(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
