"use client";

import { useState, useEffect, useRef, ReactNode } from "react";

interface AccessibilitySettings {
  highContrastMode: boolean;
  reducedMotion: boolean;
  screenReaderMode: boolean;
  keyboardNavigation: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  focusVisible: boolean;
}

interface AccessibilityEnhancerProps {
  children: ReactNode;
}

export function AccessibilityEnhancer({ children }: AccessibilityEnhancerProps) {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    highContrastMode: false,
    reducedMotion: false,
    screenReaderMode: false,
    keyboardNavigation: false,
    fontSize: 'medium',
    focusVisible: true
  });

  const [isKeyboardUser, setIsKeyboardUser] = useState(false);
  const focusTrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Detect user preferences from system
    const detectSystemPreferences = () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
      
      setSettings(prev => ({
        ...prev,
        reducedMotion: prefersReducedMotion,
        highContrastMode: prefersHighContrast
      }));
    };

    // Detect keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsKeyboardUser(true);
        setSettings(prev => ({ ...prev, keyboardNavigation: true }));
      }
    };

    const handleMouseMove = () => {
      if (isKeyboardUser) {
        setIsKeyboardUser(false);
        setSettings(prev => ({ ...prev, keyboardNavigation: false }));
      }
    };

    // Screen reader detection
    const detectScreenReader = () => {
      // Basic screen reader detection
      const hasScreenReader = window.navigator.userAgent.includes('NVDA') ||
                              window.navigator.userAgent.includes('JAWS') ||
                              window.speechSynthesis.getVoices().length > 0;
      
      if (hasScreenReader) {
        setSettings(prev => ({ ...prev, screenReaderMode: true }));
      }
    };

    detectSystemPreferences();
    detectScreenReader();

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousemove', handleMouseMove);

    // Media query listeners
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setSettings(prev => ({ ...prev, reducedMotion: e.matches }));
    };

    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setSettings(prev => ({ ...prev, highContrastMode: e.matches }));
    };

    reducedMotionQuery.addListener(handleReducedMotionChange);
    highContrastQuery.addListener(handleHighContrastChange);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousemove', handleMouseMove);
      reducedMotionQuery.removeListener(handleReducedMotionChange);
      highContrastQuery.removeListener(handleHighContrastChange);
    };
  }, [isKeyboardUser]);

  // Apply accessibility classes
  useEffect(() => {
    const root = document.documentElement;
    
    // High contrast mode
    if (settings.highContrastMode) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // Keyboard navigation
    if (settings.keyboardNavigation) {
      root.classList.add('keyboard-navigation');
    } else {
      root.classList.remove('keyboard-navigation');
    }

    // Font size
    root.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large');
    root.classList.add(`font-${settings.fontSize}`);

    // Screen reader mode
    if (settings.screenReaderMode) {
      root.classList.add('screen-reader-mode');
    } else {
      root.classList.remove('screen-reader-mode');
    }
  }, [settings]);

  return (
    <div 
      ref={focusTrapRef}
      className="accessibility-enhanced"
    >
      {children}
      
      {/* Live region for announcements */}
      <div
        id="live-region"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      
      {/* Status region for immediate updates */}
      <div
        id="status-region"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </div>
  );
}

// Hook for announcing content to screen readers
export function useScreenReaderAnnouncement() {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const regionId = priority === 'assertive' ? 'status-region' : 'live-region';
    const region = document.getElementById(regionId);
    
    if (region) {
      region.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        region.textContent = '';
      }, 1000);
    }
  };

  return { announce };
}

// Focus management hook
export function useFocusManagement() {
  const focusElement = (element: HTMLElement | null, delay = 0) => {
    if (!element) return;
    
    setTimeout(() => {
      element.focus();
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }, delay);
  };

  const trapFocus = (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  };

  return { focusElement, trapFocus };
}

// Keyboard navigation component
interface KeyboardNavigableProps {
  children: ReactNode;
  onNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  className?: string;
}

export function KeyboardNavigable({ children, onNavigate, className = "" }: KeyboardNavigableProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!onNavigate) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        onNavigate('up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        onNavigate('down');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        onNavigate('left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        onNavigate('right');
        break;
    }
  };

  return (
    <div 
      className={`keyboard-navigable ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="navigation"
      aria-label="Keyboard navigable content"
    >
      {children}
    </div>
  );
}
