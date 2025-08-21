"use client";

import { useState } from "react";
import { 
  SettingsIcon, 
  ClearIcon, 
  ExportIcon, 
  SearchIcon,
  MoreVerticalIcon
} from "@/components/icons/Icons";

interface FloatingActionsProps {
  progress?: number;
  onClear?: () => void;
  onExport?: () => void;
  onSettings?: () => void;
}

export function FloatingActions({ 
  progress = 83, 
  onClear, 
  onExport, 
  onSettings 
}: FloatingActionsProps) {
  const [showMenu, setShowMenu] = useState(false);

  const menuItems = [
    { 
      label: "Clear Chat", 
      icon: <ClearIcon size={16} />, 
      action: onClear, 
      color: "text-red-400 hover:text-red-300" 
    },
    { 
      label: "Export Chat", 
      icon: <ExportIcon size={16} />, 
      action: onExport, 
      color: "text-blue-400 hover:text-blue-300" 
    },
    { 
      label: "Settings", 
      icon: <SettingsIcon size={16} />, 
      action: onSettings, 
      color: "text-gray-400 hover:text-gray-300" 
    },
    { 
      label: "Search", 
      icon: <SearchIcon size={16} />, 
      action: () => {}, 
      color: "text-purple-400 hover:text-purple-300" 
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Options Menu */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 -z-10" 
            onClick={() => setShowMenu(false)}
          />
          
          {/* Menu Items */}
          <div className="flex flex-col gap-2 mb-2">
            {menuItems.map((item, index) => (
              <div
                key={item.label}
                className="glass-card px-4 py-3 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-all transform translate-x-0 opacity-100 animate-in slide-in-from-right duration-200"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => {
                  item.action?.();
                  setShowMenu(false);
                }}
              >
                <span className={item.color}>{item.icon}</span>
                <span className={`text-sm font-medium ${item.color} min-w-max`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Progress Button */}
      <button 
        className="glass-card w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 transition-all relative group"
        title={`Progress: ${progress}%`}
      >
        {/* Progress Ring */}
        <svg className="w-12 h-12 transform -rotate-90 absolute" viewBox="0 0 48 48">
          {/* Background circle */}
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="3"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="url(#progressGradient)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 20}`}
            strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
            className="transition-all duration-500 ease-out"
          />
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--electric-blue)" />
              <stop offset="100%" stopColor="var(--neon-green)" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Progress Text */}
        <span className="text-xs font-bold text-white relative z-10">
          {progress}%
        </span>
        
        {/* Tooltip */}
        <div className="absolute right-full mr-3 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Learning Progress
        </div>
      </button>

      {/* Options Menu Button */}
      <button 
        className={`glass-card w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 transition-all relative group ${
          showMenu ? 'bg-electric-blue/20 scale-105' : ''
        }`}
        onClick={() => setShowMenu(!showMenu)}
        title="More options"
      >
        {/* More Options Icon */}
        <div className={`transition-all duration-200 ${showMenu ? 'rotate-90' : ''}`}>
          <MoreVerticalIcon size={20} className="text-white" />
        </div>
        
        {/* Tooltip */}
        <div className="absolute right-full mr-3 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Options
        </div>
      </button>
    </div>
  );
}
