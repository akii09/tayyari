import { useState, useEffect } from "react";
import Image from "next/image";
import { StreamingMessage } from "./StreamingMessage";

interface MessageProps {
  role: "assistant" | "user";
  content: string;
  isStreaming?: boolean;
  files?: File[];
  timestamp?: Date;
  onCopy?: (content: string) => void;
  onFeedback?: (type: 'positive' | 'negative') => void;
}

export function ChatMessage({ 
  role, 
  content, 
  isStreaming = false,
  files = [],
  timestamp,
  onCopy,
  onFeedback 
}: MessageProps) {
  const isUser = role === "user";
  
  // Prevent hydration mismatch by only showing time after client hydration
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const displayTime = isClient && timestamp ? 
    timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
    '';

  return (
    <article className={`p-4 sm:p-6 ${!isUser ? "glass-card" : ""}`}>
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Avatar */}
        {isUser ? (
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-electric-blue to-deep-purple flex items-center justify-center text-white text-sm font-medium">
            U
          </div>
        ) : (
          <div className="relative">
            <Image 
              src="/img/logo.png" 
              alt="NymbleUp AI" 
              width={32} 
              height={32} 
              className="rounded-full ring-2 ring-electric-blue/20" 
            />
            {isStreaming && (
              <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-neon-green animate-pulse" />
            )}
          </div>
        )}

        {/* Message Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header */}
          <header className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              {isUser ? "You" : "NymbleUp AI"}
            </span>
            {displayTime && (
              <>
                <span className="text-text-muted">•</span>
                <span className="text-xs text-text-muted">{displayTime}</span>
              </>
            )}
            {isStreaming && (
              <>
                <span className="text-text-muted">•</span>
                <div className="flex items-center gap-1">
                  <div className="typing-dots flex gap-1">
                    <span className="w-1 h-1 bg-neon-green rounded-full"></span>
                    <span className="w-1 h-1 bg-neon-green rounded-full"></span>
                    <span className="w-1 h-1 bg-neon-green rounded-full"></span>
                  </div>
                  <span className="text-xs text-neon-green">Typing</span>
                </div>
              </>
            )}
          </header>

          {/* Files Preview */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 glass-card px-3 py-2 rounded-lg text-sm"
                >
                  <div className="w-4 h-4 bg-electric-blue/20 rounded flex items-center justify-center">
                    📎
                  </div>
                  <span className="text-text-secondary truncate max-w-32">
                    {file.name}
                  </span>
                  <span className="text-xs text-text-muted">
                    {(file.size / 1024).toFixed(1)}KB
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Message Text */}
          {isUser ? (
            <div className="leading-relaxed text-[15px] text-text-primary whitespace-pre-wrap">
              {content}
            </div>
          ) : (
            <StreamingMessage
              content={content}
              isStreaming={isStreaming}
              onCopy={onCopy}
              onFeedback={onFeedback}
            />
          )}
        </div>
      </div>
    </article>
  );
}


