"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SearchIcon, CommandIcon, ArrowRightIcon } from "@/components/icons/Icons";

interface Command {
  id: string;
  title: string;
  description: string;
  shortcut?: string;
  icon?: React.ComponentType<{ className?: string }>;
  category: 'navigation' | 'actions' | 'tools' | 'ai';
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
}

export function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredCommands, setFilteredCommands] = useState<Command[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter commands based on query
  useEffect(() => {
    if (!query.trim()) {
      setFilteredCommands(commands);
    } else {
      const filtered = commands.filter(command =>
        command.title.toLowerCase().includes(query.toLowerCase()) ||
        command.description.toLowerCase().includes(query.toLowerCase()) ||
        command.category.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredCommands(filtered);
    }
    setSelectedIndex(0);
  }, [query, commands]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
        break;
    }
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const groupedCommands = filteredCommands.reduce((acc, command) => {
    if (!acc[command.category]) {
      acc[command.category] = [];
    }
    acc[command.category].push(command);
    return acc;
  }, {} as Record<string, Command[]>);

  const categoryLabels = {
    navigation: 'Navigation',
    actions: 'Actions',
    tools: 'Tools',
    ai: 'AI Assistant'
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[20vh]">
      <div 
        className="bg-bg-secondary/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 animate-slide-in-fade"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-white/5">
          <CommandIcon className="w-5 h-5 text-text-muted" />
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or search..."
              className="w-full pl-10 pr-4 py-2 bg-bg-tertiary rounded-lg border border-white/10 focus:border-electric-blue outline-none text-text-primary placeholder:text-text-muted"
            />
          </div>
          <kbd className="px-2 py-1 bg-bg-tertiary rounded text-xs text-text-muted border border-white/10">
            ESC
          </kbd>
        </div>

        {/* Commands List */}
        <div 
          ref={listRef}
          className="max-h-96 overflow-y-auto p-2"
        >
          {filteredCommands.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <SearchIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No commands found</p>
              <p className="text-sm">Try different keywords</p>
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, categoryCommands]) => (
              <div key={category} className="mb-4">
                <h3 className="text-xs font-medium text-text-muted uppercase tracking-wide px-3 py-2">
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </h3>
                {categoryCommands.map((command, index) => {
                  const globalIndex = filteredCommands.indexOf(command);
                  const isSelected = globalIndex === selectedIndex;
                  const IconComponent = command.icon;

                  return (
                    <button
                      key={command.id}
                      onClick={() => {
                        command.action();
                        onClose();
                      }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-150
                        ${isSelected 
                          ? 'bg-electric-blue/10 border border-electric-blue/20' 
                          : 'hover:bg-bg-secondary border border-transparent'
                        }
                      `}
                    >
                      {IconComponent && (
                        <IconComponent className={`w-4 h-4 ${isSelected ? 'text-electric-blue' : 'text-text-muted'}`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium ${isSelected ? 'text-electric-blue' : 'text-text-primary'}`}>
                          {command.title}
                        </div>
                        <div className="text-sm text-text-muted truncate">
                          {command.description}
                        </div>
                      </div>
                      {command.shortcut && (
                        <kbd className="px-2 py-1 bg-bg-tertiary rounded text-xs text-text-muted border border-white/10">
                          {command.shortcut}
                        </kbd>
                      )}
                      {isSelected && (
                        <ArrowRightIcon className="w-4 h-4 text-electric-blue" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-glass-border text-xs text-text-muted">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded border border-white/10">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded border border-white/10">↵</kbd>
              Select
            </span>
          </div>
          <span>
            {filteredCommands.length} commands
          </span>
        </div>
      </div>
    </div>
  );
}

// Default commands for the application
export const defaultCommands: Command[] = [
  {
    id: 'new-chat',
    title: 'New Chat',
    description: 'Start a fresh conversation',
    shortcut: 'Cmd+N',
    category: 'actions',
    action: () => console.log('New chat')
  },
  {
    id: 'clear-chat',
    title: 'Clear Chat',
    description: 'Clear current conversation',
    shortcut: 'Cmd+K',
    category: 'actions',
    action: () => console.log('Clear chat')
  },
  {
    id: 'export-chat',
    title: 'Export Chat',
    description: 'Export conversation as markdown',
    shortcut: 'Cmd+E',
    category: 'actions',
    action: () => console.log('Export chat')
  },
  {
    id: 'toggle-theme',
    title: 'Toggle Theme',
    description: 'Switch between light and dark mode',
    shortcut: 'Cmd+T',
    category: 'actions',
    action: () => console.log('Toggle theme')
  },
  {
    id: 'search-messages',
    title: 'Search Messages',
    description: 'Search through conversation history',
    shortcut: 'Cmd+F',
    category: 'navigation',
    action: () => console.log('Search messages')
  },
  {
    id: 'code-review',
    title: 'Code Review',
    description: 'Request AI code review',
    category: 'ai',
    action: () => console.log('Code review')
  },
  {
    id: 'explain-code',
    title: 'Explain Code',
    description: 'Get code explanation from AI',
    category: 'ai',
    action: () => console.log('Explain code')
  },
  {
    id: 'generate-docs',
    title: 'Generate Documentation',
    description: 'Create documentation for code',
    category: 'ai',
    action: () => console.log('Generate docs')
  },
  {
    id: 'optimize-performance',
    title: 'Optimize Performance',
    description: 'Get performance optimization suggestions',
    category: 'ai',
    action: () => console.log('Optimize performance')
  }
];
