"use client";

interface LoadingSkeletonProps {
  variant?: 'message' | 'code' | 'list' | 'card';
  lines?: number;
  className?: string;
}

export function LoadingSkeleton({ 
  variant = 'message', 
  lines = 3,
  className = '' 
}: LoadingSkeletonProps) {
  
  if (variant === 'message') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="flex items-start gap-3 sm:gap-4 p-4 sm:p-6">
          {/* Avatar skeleton */}
          <div className="h-8 w-8 rounded-full bg-bg-secondary animate-pulse" 
               style={{ animationDelay: '0ms' }} />
          
          <div className="flex-1 min-w-0 space-y-3">
            {/* Header skeleton */}
            <div className="flex items-center gap-2">
              <div className="h-3 w-16 bg-bg-secondary rounded animate-pulse" 
                   style={{ animationDelay: '100ms' }} />
              <div className="h-2 w-2 bg-bg-secondary rounded-full animate-pulse" 
                   style={{ animationDelay: '150ms' }} />
              <div className="h-3 w-12 bg-bg-secondary rounded animate-pulse" 
                   style={{ animationDelay: '200ms' }} />
            </div>
            
            {/* Content skeleton */}
            <div className="space-y-2">
              {Array.from({ length: lines }).map((_, i) => (
                <div 
                  key={i}
                  className="h-4 bg-bg-secondary rounded animate-pulse"
                  style={{ 
                    width: i === lines - 1 ? '60%' : '100%',
                    animationDelay: `${300 + i * 100}ms`
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'code') {
    return (
      <div className={`animate-pulse glass-card rounded-lg p-4 ${className}`}>
        {/* Code header */}
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-16 bg-bg-secondary rounded animate-pulse" />
          <div className="h-6 w-6 bg-bg-secondary rounded animate-pulse" />
        </div>
        
        {/* Code lines */}
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div 
              key={i}
              className="flex items-center gap-3"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="h-3 w-6 bg-bg-secondary rounded animate-pulse" />
              <div 
                className="h-3 bg-bg-secondary rounded animate-pulse"
                style={{ width: `${Math.random() * 40 + 40}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div 
            key={i}
            className="flex items-center gap-3 animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="h-4 w-4 bg-bg-secondary rounded animate-pulse" />
            <div className="h-4 bg-bg-secondary rounded animate-pulse flex-1" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`glass-card rounded-lg p-6 animate-pulse ${className}`}>
        <div className="space-y-4">
          <div className="h-6 w-32 bg-bg-secondary rounded animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: lines }).map((_, i) => (
              <div 
                key={i}
                className="h-4 bg-bg-secondary rounded animate-pulse"
                style={{ 
                  width: i === lines - 1 ? '70%' : '100%',
                  animationDelay: `${i * 100}ms`
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export function TypingIndicator({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-neon-green rounded-full animate-bounce"
            style={{ 
              animationDelay: `${i * 200}ms`,
              animationDuration: '1s'
            }}
          />
        ))}
      </div>
      <span className="text-sm text-text-muted">AI is thinking...</span>
    </div>
  );
}
