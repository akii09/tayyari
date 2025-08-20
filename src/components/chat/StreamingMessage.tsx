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
