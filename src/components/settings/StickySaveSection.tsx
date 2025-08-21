"use client";

import { Button } from '@/components/base/Button';
import { CheckIcon, AlertCircleIcon } from '@/components/icons/Icons';

interface SettingsActionBarProps {
  isLoading: boolean;
  onSave: () => void;
  onDiscard?: () => void;
  saveLabel?: string;
  disabled?: boolean;
  hasChanges?: boolean;
  isDirty?: boolean;
  className?: string;
}

export function SettingsActionBar({
  isLoading,
  onSave,
  onDiscard,
  saveLabel = "Save changes",
  disabled = false,
  hasChanges = true,
  isDirty = true,
  className = ""
}: SettingsActionBarProps) {
  if (!hasChanges && !isLoading) {
    return null;
  }

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 ${className}`}>
      {/* Action bar with proper design */}
      <div className="bg-bg-elevated border-t border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Status indicator */}
            <div className="flex items-center gap-3">
              {isDirty && !isLoading && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <AlertCircleIcon size={16} className="text-yellow-400" />
                  <span>Unsaved changes</span>
                </div>
              )}
              
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <div className="w-4 h-4 border-2 border-electric-blue border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              )}
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-3">
              {onDiscard && (
                <Button
                  variant="ghost"
                  onClick={onDiscard}
                  disabled={isLoading}
                  className="text-text-muted hover:text-text-primary"
                >
                  Discard changes
                </Button>
              )}
              <Button
                onClick={onSave}
                isLoading={isLoading}
                disabled={disabled || isLoading}
                className="bg-electric-blue hover:bg-electric-blue/90 text-white px-6 py-2 rounded-lg font-medium"
              >
                <CheckIcon size={16} className="mr-2" />
                {saveLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
