"use client";

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChatLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  header?: ReactNode;
  input?: ReactNode;
  floatingActions?: ReactNode;
  sidebarOpen?: boolean;
  onSidebarToggle?: () => void;
}

export function ChatLayout({
  children,
  sidebar,
  header,
  input,
  floatingActions,
  sidebarOpen = false,
  onSidebarToggle,
}: ChatLayoutProps) {
  return (
    <div className="flex h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-primary overflow-hidden">
      {/* Sidebar */}
      {sidebar && (
        <>
          {/* Mobile backdrop */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={onSidebarToggle}
              aria-hidden="true"
            />
          )}
          
          {/* Sidebar content */}
          <aside
            className={cn(
              // Base styles
              "fixed left-0 top-0 h-full bg-bg-secondary/95 backdrop-blur-xl",
              "border-r border-white/10 z-50 transform transition-transform duration-300 ease-in-out",
              // Mobile: slide in from left, full width on small screens
              "w-full sm:w-80",
              // Desktop: always visible, relative positioning
              "lg:relative lg:z-auto lg:translate-x-0 lg:w-80",
              // Show/hide based on state
              sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}
            aria-label="Learning tools and navigation"
          >
            {sidebar}
          </aside>
        </>
      )}

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        {header && (
          <header className="sticky top-0 z-30 bg-bg-primary/95 backdrop-blur-sm border-b border-white/10">
            {header}
          </header>
        )}

        {/* Messages area */}
        <main 
          className="flex-1 overflow-hidden relative"
          role="main"
          aria-label="Chat conversation"
        >
          {children}
        </main>

        {/* Input area */}
        {input && (
          <div className="sticky bottom-0 z-20 bg-bg-primary/95 backdrop-blur-sm border-t border-white/10">
            {input}
          </div>
        )}
      </div>

      {/* Floating actions */}
      {floatingActions && (
        <div className="fixed bottom-6 right-6 z-50">
          {floatingActions}
        </div>
      )}
    </div>
  );
}