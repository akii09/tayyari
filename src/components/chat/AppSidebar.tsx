"use client";

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SidebarView = 'concepts' | 'progress' | 'analytics' | 'settings';

interface AppSidebarProps {
  currentView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  onClose: () => void;
  children: ReactNode;
}

const viewTitles: Record<SidebarView, string> = {
  concepts: 'Learning Concepts',
  progress: 'Progress Overview',
  analytics: 'Learning Analytics',
  settings: 'Settings',
};

const viewIcons: Record<SidebarView, ReactNode> = {
  concepts: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  progress: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  analytics: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 3v18h18M9 9l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
};

export function AppSidebar({ currentView, onViewChange, onClose, children }: AppSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="text-electric-blue" aria-hidden="true">
            {viewIcons[currentView]}
          </div>
          <h2 className="text-lg font-semibold text-text-primary">
            {viewTitles[currentView]}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-electric-blue"
          aria-label="Close sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-text-secondary" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Navigation tabs */}
      <nav 
        className="flex border-b border-white/10"
        role="tablist"
        aria-label="Sidebar navigation"
      >
        {(Object.keys(viewTitles) as SidebarView[]).map((view) => (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium transition-colors",
              "hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-electric-blue focus:ring-inset",
              currentView === view
                ? "text-electric-blue border-b-2 border-electric-blue bg-electric-blue/5"
                : "text-text-muted"
            )}
            role="tab"
            aria-selected={currentView === view}
            aria-controls={`panel-${view}`}
            id={`tab-${view}`}
          >
            <div className="w-4 h-4" aria-hidden="true">
              {viewIcons[view]}
            </div>
            <span className="hidden sm:inline">
              {viewTitles[view].split(' ')[0]}
            </span>
          </button>
        ))}
      </nav>

      {/* Content */}
      <div 
        className="flex-1 overflow-y-auto p-4"
        role="tabpanel"
        id={`panel-${currentView}`}
        aria-labelledby={`tab-${currentView}`}
      >
        {children}
      </div>
    </div>
  );
}