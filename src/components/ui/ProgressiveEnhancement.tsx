"use client";

import { useState, useEffect, useContext, createContext, ReactNode } from "react";

interface DeviceCapabilities {
  supportsHover: boolean;
  prefersReducedMotion: boolean;
  isHighPerformance: boolean;
  screenSize: 'mobile' | 'tablet' | 'desktop';
  connectionSpeed: 'slow' | 'medium' | 'fast';
  supportsTouch: boolean;
}

interface UserPreferences {
  animationsEnabled: boolean;
  highContrastMode: boolean;
  reduceDataUsage: boolean;
  autoplay: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

interface ProgressiveEnhancementContext {
  capabilities: DeviceCapabilities;
  preferences: UserPreferences;
  updatePreference: (key: keyof UserPreferences, value: any) => void;
  isFeatureEnabled: (feature: string) => boolean;
}

const ProgressiveEnhancementContext = createContext<ProgressiveEnhancementContext | null>(null);

export function useProgressiveEnhancement() {
  const context = useContext(ProgressiveEnhancementContext);
  if (!context) {
    throw new Error('useProgressiveEnhancement must be used within ProgressiveEnhancementProvider');
  }
  return context;
}

interface ProgressiveEnhancementProviderProps {
  children: ReactNode;
}

export function ProgressiveEnhancementProvider({ children }: ProgressiveEnhancementProviderProps) {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    supportsHover: false,
    prefersReducedMotion: false,
    isHighPerformance: true,
    screenSize: 'desktop',
    connectionSpeed: 'fast',
    supportsTouch: false
  });

  const [preferences, setPreferences] = useState<UserPreferences>({
    animationsEnabled: true,
    highContrastMode: false,
    reduceDataUsage: false,
    autoplay: true,
    fontSize: 'medium'
  });

  useEffect(() => {
    // Detect device capabilities
    const detectCapabilities = () => {
      const newCapabilities: DeviceCapabilities = {
        supportsHover: window.matchMedia('(hover: hover)').matches,
        prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        isHighPerformance: navigator.hardwareConcurrency > 4,
        screenSize: getScreenSize(),
        connectionSpeed: getConnectionSpeed(),
        supportsTouch: 'ontouchstart' in window
      };
      
      setCapabilities(newCapabilities);
      
      // Auto-adjust preferences based on capabilities
      setPreferences(prev => ({
        ...prev,
        animationsEnabled: !newCapabilities.prefersReducedMotion && newCapabilities.isHighPerformance,
        reduceDataUsage: newCapabilities.connectionSpeed === 'slow'
      }));
    };

    const getScreenSize = (): 'mobile' | 'tablet' | 'desktop' => {
      const width = window.innerWidth;
      if (width < 768) return 'mobile';
      if (width < 1024) return 'tablet';
      return 'desktop';
    };

    const getConnectionSpeed = (): 'slow' | 'medium' | 'fast' => {
      // @ts-ignore - navigator.connection is experimental
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (!connection) return 'fast';
      
      const effectiveType = connection.effectiveType;
      if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'slow';
      if (effectiveType === '3g') return 'medium';
      return 'fast';
    };

    detectCapabilities();

    // Listen for changes
    const mediaQueryLists = [
      window.matchMedia('(hover: hover)'),
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(max-width: 767px)'),
      window.matchMedia('(max-width: 1023px)')
    ];

    const handleMediaChange = () => detectCapabilities();
    mediaQueryLists.forEach(mql => mql.addListener(handleMediaChange));

    // Load saved preferences
    const savedPreferences = localStorage.getItem('user-preferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        setPreferences(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.warn('Failed to parse saved preferences:', error);
      }
    }

    return () => {
      mediaQueryLists.forEach(mql => mql.removeListener(handleMediaChange));
    };
  }, []);

  const updatePreference = (key: keyof UserPreferences, value: any) => {
    setPreferences(prev => {
      const newPreferences = { ...prev, [key]: value };
      localStorage.setItem('user-preferences', JSON.stringify(newPreferences));
      return newPreferences;
    });
  };

  const isFeatureEnabled = (feature: string): boolean => {
    switch (feature) {
      case 'animations':
        return preferences.animationsEnabled && !capabilities.prefersReducedMotion;
      case 'hover-effects':
        return capabilities.supportsHover;
      case 'touch-gestures':
        return capabilities.supportsTouch;
      case 'high-resolution-images':
        return !preferences.reduceDataUsage && capabilities.connectionSpeed !== 'slow';
      case 'autoplay':
        return preferences.autoplay && capabilities.connectionSpeed !== 'slow';
      case 'heavy-animations':
        return capabilities.isHighPerformance && preferences.animationsEnabled;
      case 'preloading':
        return capabilities.connectionSpeed === 'fast' && !preferences.reduceDataUsage;
      default:
        return true;
    }
  };

  return (
    <ProgressiveEnhancementContext.Provider 
      value={{ capabilities, preferences, updatePreference, isFeatureEnabled }}
    >
      {children}
    </ProgressiveEnhancementContext.Provider>
  );
}

// Smart component wrapper that adapts based on capabilities
interface AdaptiveComponentProps {
  children: ReactNode;
  fallback?: ReactNode;
  requiredFeatures?: string[];
  className?: string;
}

export function AdaptiveComponent({ 
  children, 
  fallback = null, 
  requiredFeatures = [],
  className = "" 
}: AdaptiveComponentProps) {
  const { isFeatureEnabled } = useProgressiveEnhancement();
  
  const allFeaturesEnabled = requiredFeatures.every(feature => isFeatureEnabled(feature));
  
  if (!allFeaturesEnabled && fallback) {
    return <div className={className}>{fallback}</div>;
  }
  
  return allFeaturesEnabled ? <div className={className}>{children}</div> : null;
}

// Feature detection hook
export function useFeatureDetection() {
  const { capabilities, isFeatureEnabled } = useProgressiveEnhancement();
  
  return {
    ...capabilities,
    isFeatureEnabled,
    // Convenience methods
    shouldUseAnimations: () => isFeatureEnabled('animations'),
    shouldPreloadContent: () => isFeatureEnabled('preloading'),
    shouldUseHighResImages: () => isFeatureEnabled('high-resolution-images'),
    canUseHoverEffects: () => isFeatureEnabled('hover-effects'),
    supportsTouchGestures: () => isFeatureEnabled('touch-gestures')
  };
}
