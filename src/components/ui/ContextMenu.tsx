"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { CopyIcon, EditIcon, ShareIcon, BookmarkIcon, ReplyIcon, SettingsIcon } from "@/components/icons/Icons";

export interface ContextMenuAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  action: () => void;
}

interface ContextMenuProps {
  trigger: ReactNode;
  actions: ContextMenuAction[];
  disabled?: boolean;
  className?: string;
}

export function ContextMenu({ trigger, actions, disabled = false, className = "" }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      // Calculate optimal position to prevent overflow
      const menuWidth = 240; // Approximate menu width
      const menuHeight = actions.length * 40 + 16; // Approximate menu height
      
      let x = e.clientX;
      let y = e.clientY;
      
      // Prevent horizontal overflow
      if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 8;
      }
      
      // Prevent vertical overflow
      if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - 8;
      }
      
      setPosition({ x, y });
      setIsOpen(true);
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('contextmenu', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('contextmenu', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleActionClick = (action: ContextMenuAction) => {
    if (!action.disabled) {
      action.action();
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div 
        ref={triggerRef}
        onContextMenu={handleContextMenu}
        className="cursor-context-menu"
      >
        {trigger}
      </div>
      
      {isOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[240px] bg-bg-secondary/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl animate-slide-in-fade"
          style={{ 
            left: position.x,
            top: position.y,
          }}
        >
          <div className="py-2">
            {actions.map((action, index) => {
              const IconComponent = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  disabled={action.disabled}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150
                    ${action.disabled 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-bg-secondary active:bg-bg-tertiary'
                    }
                    ${action.danger 
                      ? 'text-red-400 hover:text-red-300' 
                      : 'text-text-primary hover:text-text-accent'
                    }
                  `}
                  style={{ 
                    animationDelay: `${index * 30}ms`,
                  }}
                >
                  {IconComponent && (
                    <IconComponent className="w-4 h-4 text-current" />
                  )}
                  <span className="flex-1 font-medium">{action.label}</span>
                  {action.shortcut && (
                    <kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded text-xs text-text-muted border border-white/10">
                      {action.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Predefined context menu actions for messages
export function createMessageContextActions(messageId: string, isUser: boolean, content: string) {
  const actions: ContextMenuAction[] = [
    {
      id: 'copy',
      label: 'Copy Message',
      icon: CopyIcon,
      shortcut: 'Cmd+C',
      action: () => navigator.clipboard.writeText(content)
    },
    {
      id: 'reply',
      label: 'Reply',
      icon: ReplyIcon,
      action: () => console.log(`Reply to ${messageId}`)
    }
  ];

  if (isUser) {
    actions.splice(1, 0, {
      id: 'edit',
      label: 'Edit Message',
      icon: EditIcon,
      shortcut: 'E',
      action: () => console.log(`Edit ${messageId}`)
    });
  } else {
    actions.push(
      {
        id: 'bookmark',
        label: 'Bookmark',
        icon: BookmarkIcon,
        shortcut: 'B',
        action: () => console.log(`Bookmark ${messageId}`)
      },
      {
        id: 'share',
        label: 'Share',
        icon: ShareIcon,
        action: () => console.log(`Share ${messageId}`)
      }
    );
  }

  return actions;
}

// Bulk operations context menu
export function createBulkContextActions(selectedIds: string[]) {
  const actions: ContextMenuAction[] = [
    {
      id: 'copy-all',
      label: `Copy ${selectedIds.length} Messages`,
      icon: CopyIcon,
      action: () => console.log(`Copy ${selectedIds.length} messages`)
    },
    {
      id: 'export-selected',
      label: 'Export Selected',
      icon: ShareIcon,
      action: () => console.log(`Export ${selectedIds.length} messages`)
    },
    {
      id: 'delete-selected',
      label: `Delete ${selectedIds.length} Messages`,
      icon: SettingsIcon, // Using as delete icon placeholder
      danger: true,
      action: () => console.log(`Delete ${selectedIds.length} messages`)
    }
  ];

  return actions;
}
