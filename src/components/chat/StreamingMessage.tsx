"use client";

import { useState, useEffect } from "react";
import { CopyIcon, ThumbsUpIcon, ThumbsDownIcon } from "@/components/icons/Icons";
import { MarkdownRenderer } from "./MarkdownRenderer";

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
      <div className="relative">
        <MarkdownRenderer content={displayedContent} />
        {isStreaming && currentIndex >= displayedContent.length && (
          <span className="inline-block w-2 h-5 bg-electric-blue animate-pulse ml-1" />
        )}
      </div>

      {/* Action buttons - Improved UI */}
      {!isStreaming && displayedContent && (
        <div className="flex items-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-all duration-200">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-muted hover:text-text-primary bg-bg-secondary/50 hover:bg-bg-secondary border border-white/5 hover:border-white/10 rounded-lg transition-all duration-200 hover:scale-105"
            title="Copy to clipboard"
          >
            <CopyIcon size={14} />
            <span>Copy</span>
          </button>
          
          {onFeedback && (
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => onFeedback('positive')}
                className="flex items-center justify-center w-8 h-8 text-text-muted hover:text-green-400 bg-bg-secondary/50 hover:bg-green-500/10 border border-white/5 hover:border-green-500/20 rounded-lg transition-all duration-200 hover:scale-105"
                title="Good response"
              >
                <ThumbsUpIcon size={14} />
              </button>
              <button
                onClick={() => onFeedback('negative')}
                className="flex items-center justify-center w-8 h-8 text-text-muted hover:text-red-400 bg-bg-secondary/50 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 rounded-lg transition-all duration-200 hover:scale-105"
                title="Poor response"
              >
                <ThumbsDownIcon size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
