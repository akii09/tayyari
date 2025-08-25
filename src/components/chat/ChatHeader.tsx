"use client";

import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  onSidebarToggle?: () => void;
  currentConcept?: {
    id: string;
    name: string;
    completionPercentage: number;
  };
  currentProvider?: {
    name: string;
    type: string;
    status: 'healthy' | 'unhealthy' | 'unknown';
  };
  onConceptsClick?: () => void;
  onProgressClick?: () => void;
  onAnalyticsClick?: () => void;
  onSettingsClick?: () => void;
}

export function ChatHeader({
  onSidebarToggle,
  currentConcept,
  currentProvider,
  onConceptsClick,
  onProgressClick,
  onAnalyticsClick,
  onSettingsClick,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 h-16">
      {/* Left section */}
      <div className="flex items-center gap-4">
        {/* Sidebar toggle - always visible on mobile, hidden on desktop when sidebar is open */}
        <button
          onClick={onSidebarToggle}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-electric-blue"
          aria-label="Toggle sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-text-secondary" aria-hidden="true">
            <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* App branding */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-electric-blue to-deep-purple rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold" aria-hidden="true">T</span>
          </div>
          <div>
            <h1 className="text-text-primary font-semibold">TayyarAI</h1>
            {currentConcept && (
              <p className="text-xs text-text-muted">
                Learning: {currentConcept.name} ({currentConcept.completionPercentage}%)
              </p>
            )}
          </div>
        </div>

        {/* Provider status */}
        {currentProvider && (
          <div className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded text-xs">
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                currentProvider.status === 'healthy' && "bg-success",
                currentProvider.status === 'unhealthy' && "bg-error",
                currentProvider.status === 'unknown' && "bg-warning"
              )}
              aria-hidden="true"
            />
            <span className="text-text-muted">{currentProvider.name}</span>
            <span className="sr-only">
              Provider status: {currentProvider.status}
            </span>
          </div>
        )}
      </div>

      {/* Right section - Quick actions */}
      <div className="flex items-center gap-1">
        {/* Hide some buttons on very small screens */}
        <button
          onClick={onConceptsClick}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-electric-blue hidden sm:block"
          title="Learning concepts"
          aria-label="Open learning concepts"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-text-secondary" aria-hidden="true">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        
        <button
          onClick={onProgressClick}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-electric-blue hidden sm:block"
          title="Progress overview"
          aria-label="Open progress overview"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-text-secondary" aria-hidden="true">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        
        <button
          onClick={onAnalyticsClick}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-electric-blue hidden md:block"
          title="Learning analytics"
          aria-label="Open learning analytics"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-text-secondary" aria-hidden="true">
            <path d="M3 3v18h18M9 9l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <button
          onClick={onSettingsClick}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-electric-blue"
          title="Settings"
          aria-label="Open settings"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-text-secondary" aria-hidden="true">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}