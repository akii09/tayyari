"use client";

import { useState } from "react";
import { CopyIcon, EditIcon, ShareIcon, HeartIcon, BookmarkIcon, ReplyIcon } from "@/components/icons/Icons";

interface MessageActionsProps {
  isVisible: boolean;
  onCopy?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  onReact?: () => void;
  onBookmark?: () => void;
  onReply?: () => void;
  isUser?: boolean;
}

export function MessageActions({
  isVisible,
  onCopy,
  onEdit,
  onShare,
  onReact,
  onBookmark,
  onReply,
  isUser = false
}: MessageActionsProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const actions = [
    { 
      id: 'copy', 
      icon: CopyIcon, 
      label: 'Copy', 
      onClick: onCopy,
      showFor: 'both'
    },
    { 
      id: 'edit', 
      icon: EditIcon, 
      label: 'Edit', 
      onClick: onEdit,
      showFor: 'user'
    },
    { 
      id: 'reply', 
      icon: ReplyIcon, 
      label: 'Reply', 
      onClick: onReply,
      showFor: 'ai'
    },
    { 
      id: 'react', 
      icon: HeartIcon, 
      label: 'React', 
      onClick: onReact,
      showFor: 'both'
    },
    { 
      id: 'bookmark', 
      icon: BookmarkIcon, 
      label: 'Save', 
      onClick: onBookmark,
      showFor: 'ai'
    },
    { 
      id: 'share', 
      icon: ShareIcon, 
      label: 'Share', 
      onClick: onShare,
      showFor: 'both'
    },
  ];

  const filteredActions = actions.filter(action => 
    action.showFor === 'both' || 
    (action.showFor === 'user' && isUser) || 
    (action.showFor === 'ai' && !isUser)
  );

  return (
    <div
      className={`
        absolute top-2 right-2 flex items-center gap-1 transition-all duration-200 ease-out
        ${isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-1 pointer-events-none'
        }
      `}
    >
      <div className="glass-card rounded-lg p-1 flex items-center gap-0.5 shadow-lg">
        {filteredActions.map((action, index) => {
          const IconComponent = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => {
                setActiveAction(action.id);
                action.onClick?.();
                setTimeout(() => setActiveAction(null), 150);
              }}
              className={`
                p-2 rounded-md transition-all duration-150 ease-out
                hover:bg-white/10 hover:scale-105 active:scale-95
                ${activeAction === action.id ? 'bg-electric-blue/20 scale-95' : ''}
                group relative
              `}
              title={action.label}
              style={{ 
                animationDelay: `${index * 30}ms`,
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateX(0)' : 'translateX(8px)',
                transition: `all 200ms ease-out ${index * 30}ms`
              }}
            >
              <IconComponent className="w-4 h-4 text-text-secondary group-hover:text-text-primary transition-colors" />
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-bg-tertiary text-xs text-text-primary rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                {action.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
