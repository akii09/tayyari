"use client";

import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  files?: File[];
  conceptId?: string;
  model?: string;
  provider?: string;
}

interface MessagesAreaProps {
  messages: Message[];
  isLoading: boolean;
  selectedConcept?: {
    id: string;
    name: string;
    completionPercentage: number;
  };
  selectedProvider?: {
    name: string;
    type: string;
    status: 'healthy' | 'unhealthy' | 'unknown';
  };
  onCopyMessage: (content: string) => void;
  onFeedback: (messageId: string, feedback: 'positive' | 'negative') => void;
  onEditMessage: (messageId: string) => void;
  onShareMessage: (messageId: string) => void;
  onReactToMessage: (messageId: string) => void;
  onBookmarkMessage: (messageId: string) => void;
  onReplyToMessage: (messageId: string) => void;
  onConceptsClick: () => void;
  onProgressClick: () => void;
}

export function MessagesArea({
  messages,
  isLoading,
  selectedConcept,
  selectedProvider,
  onCopyMessage,
  onFeedback,
  onEditMessage,
  onShareMessage,
  onReactToMessage,
  onBookmarkMessage,
  onReplyToMessage,
  onConceptsClick,
  onProgressClick,
}: MessagesAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-2xl">
          {/* Welcome icon */}
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-electric-blue to-neon-green rounded-full mx-auto mb-6 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white" aria-hidden="true">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Welcome message */}
          <h2 className="text-2xl font-bold text-text-primary mb-4">
            {selectedConcept ? `Learning ${selectedConcept.name}` : 'Welcome to TayyarAI'}
          </h2>
          <p className="text-text-muted mb-8 text-lg">
            {selectedConcept 
              ? `Ask questions about ${selectedConcept.name} to continue your learning journey.`
              : 'Your AI-powered learning companion. Choose a concept to get started or ask me anything!'
            }
          </p>
          
          {/* Quick start actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={onConceptsClick}
              className="glass-card p-4 sm:p-6 rounded-xl hover:bg-white/5 transition-all group text-left flex flex-col items-start gap-3 focus:outline-none focus:ring-2 focus:ring-electric-blue min-h-[44px]"
            >
              <div className="text-2xl group-hover:scale-110 transition-transform" aria-hidden="true">📚</div>
              <div>
                <h3 className="font-semibold text-text-primary mb-1">Choose Learning Concept</h3>
                <p className="text-sm text-text-muted">Select what you want to learn about</p>
              </div>
            </button>
            
            <button
              onClick={onProgressClick}
              className="glass-card p-4 sm:p-6 rounded-xl hover:bg-white/5 transition-all group text-left flex flex-col items-start gap-3 focus:outline-none focus:ring-2 focus:ring-electric-blue min-h-[44px]"
            >
              <div className="text-2xl group-hover:scale-110 transition-transform" aria-hidden="true">📊</div>
              <div>
                <h3 className="font-semibold text-text-primary mb-1">View Progress</h3>
                <p className="text-sm text-text-muted">Check your learning progress</p>
              </div>
            </button>
          </div>

          {/* Current status */}
          {selectedConcept && (
            <div className="mt-8 p-4 bg-electric-blue/10 rounded-lg border border-electric-blue/20">
              <div className="flex items-center justify-center gap-2 text-sm">
                <div className="w-2 h-2 bg-electric-blue rounded-full animate-pulse" aria-hidden="true" />
                <span className="text-text-primary">
                  Currently learning: <strong>{selectedConcept.name}</strong>
                </span>
                <span className="text-text-muted">
                  ({selectedConcept.completionPercentage}% complete)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {messages.map((message, index) => (
          <div key={message.id} className="animate-message-appear">
            <ChatMessage
              role={message.role}
              content={message.content}
              isStreaming={message.isStreaming}
              files={message.files}
              timestamp={message.timestamp}
              onCopy={onCopyMessage}
              onFeedback={(feedback) => onFeedback(message.id, feedback)}
              onEdit={() => onEditMessage(message.id)}
              onShare={() => onShareMessage(message.id)}
              onReact={() => onReactToMessage(message.id)}
              onBookmark={() => onBookmarkMessage(message.id)}
              onReply={() => onReplyToMessage(message.id)}
            />
            
            {/* Message metadata */}
            {message.role === 'assistant' && (message.model || message.provider || selectedConcept) && (
              <div className="flex items-center gap-2 mt-2 ml-12">
                {message.provider && message.provider !== 'unknown' && message.provider !== 'fallback' && (
                  <span className="px-2 py-1 bg-white/5 rounded text-xs text-text-muted">
                    {message.provider}
                  </span>
                )}
                {message.model && message.model !== 'unknown' && message.model !== 'fallback-v1' && (
                  <span className="px-2 py-1 bg-white/5 rounded text-xs text-text-muted">
                    {message.model}
                  </span>
                )}
                {selectedConcept && (
                  <span className="px-2 py-1 bg-electric-blue/20 text-electric-blue rounded text-xs">
                    {selectedConcept.name}
                  </span>
                )}
                {message.provider === 'fallback' && (
                  <div className="px-3 py-2 bg-warning/20 text-warning rounded-lg text-xs flex items-center gap-2 mt-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-warning flex-shrink-0" aria-hidden="true">
                      <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div>
                      <div className="font-medium">Fallback mode active</div>
                      <div className="text-xs opacity-80">Configure AI providers in Settings for better responses</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Loading state */}
        {isLoading && (
          <div className="animate-message-appear">
            <LoadingSkeleton variant="message" lines={3} />
            <div className="flex items-center gap-2 mt-2 ml-12 text-xs text-text-muted">
              <div className="w-2 h-2 bg-electric-blue rounded-full animate-pulse" aria-hidden="true" />
              <span>
                {selectedProvider && selectedProvider.status === 'healthy' 
                  ? `Using ${selectedProvider.name}...`
                  : selectedProvider && selectedProvider.status === 'unhealthy'
                  ? `Trying ${selectedProvider.name} (may be slow)...`
                  : 'Processing your message...'
                }
              </span>
            </div>
          </div>
        )}
        
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Bottom padding for input */}
      <div className="h-4" />
    </div>
  );
}