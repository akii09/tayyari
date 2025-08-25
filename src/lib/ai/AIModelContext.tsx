"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  providerType: string;
  isActive: boolean;
  isHealthy: boolean;
  priority: number;
  lastChecked?: Date;
  errorMessage?: string;
}

interface AIModelContextType {
  selectedModel: string | null;
  setSelectedModel: (modelId: string) => void;
  availableModels: ModelInfo[];
  isLoading: boolean;
  refreshModels: () => Promise<void>;
  getSelectedModelInfo: () => ModelInfo | null;
}

const AIModelContext = createContext<AIModelContextType | undefined>(undefined);

export function useAIModel() {
  const context = useContext(AIModelContext);
  if (context === undefined) {
    throw new Error('useAIModel must be used within an AIModelProvider');
  }
  return context;
}

interface AIModelProviderProps {
  children: ReactNode;
}

export function AIModelProvider({ children }: AIModelProviderProps) {
  const [selectedModel, setSelectedModelState] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load selected model from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('selectedAIModel');
    if (saved) {
      setSelectedModelState(saved);
    }
  }, []);

  // Save selected model to localStorage when it changes
  const setSelectedModel = (modelId: string) => {
    setSelectedModelState(modelId);
    localStorage.setItem('selectedAIModel', modelId);
  };

  // Fetch available models
  const refreshModels = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/ai/models');
      const data = await response.json();
      
      if (data.success) {
        setAvailableModels(data.models);
        
        // Auto-select first healthy model if none selected
        if (!selectedModel && data.models.length > 0) {
          const healthyModel = data.models.find((m: ModelInfo) => m.isHealthy && m.isActive);
          const activeModel = data.models.find((m: ModelInfo) => m.isActive);
          const firstModel = data.models[0];
          
          const modelToSelect = healthyModel || activeModel || firstModel;
          if (modelToSelect) {
            setSelectedModel(modelToSelect.id);
          }
        }
        
        // Validate current selection is still available
        if (selectedModel && !data.models.find((m: ModelInfo) => m.id === selectedModel)) {
          const fallbackModel = data.models.find((m: ModelInfo) => m.isHealthy && m.isActive) || data.models[0];
          if (fallbackModel) {
            setSelectedModel(fallbackModel.id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch AI models:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get info about currently selected model
  const getSelectedModelInfo = (): ModelInfo | null => {
    if (!selectedModel) return null;
    return availableModels.find(m => m.id === selectedModel) || null;
  };

  // Initial load and periodic refresh
  useEffect(() => {
    refreshModels();
    
    // Refresh every 60 seconds
    const interval = setInterval(refreshModels, 60000);
    return () => clearInterval(interval);
  }, []);

  const value: AIModelContextType = {
    selectedModel,
    setSelectedModel,
    availableModels,
    isLoading,
    refreshModels,
    getSelectedModelInfo,
  };

  return (
    <AIModelContext.Provider value={value}>
      {children}
    </AIModelContext.Provider>
  );
}