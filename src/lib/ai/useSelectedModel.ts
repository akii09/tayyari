import { useAIModel } from './AIModelContext';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { mistral } from '@ai-sdk/mistral';
import { ollama } from './providers/ollama';

/**
 * Hook to get the currently selected AI model for use with AI SDK
 */
export function useSelectedModel() {
  const { selectedModel, getSelectedModelInfo } = useAIModel();
  
  const modelInfo = getSelectedModelInfo();
  
  if (!modelInfo || !modelInfo.isActive) {
    return null;
  }

  // Extract model name from the composite ID
  const modelName = modelInfo.name;
  
  try {
    switch (modelInfo.providerType) {
      case 'openai':
        return openai(modelName);
      
      case 'anthropic':
        return anthropic(modelName);
      
      case 'google':
        return google(modelName);
      
      case 'mistral':
        return mistral(modelName);
      
      case 'ollama':
        return ollama(modelName);
      
      default:
        console.warn(`Unsupported provider type: ${modelInfo.providerType}`);
        return null;
    }
  } catch (error) {
    console.error(`Failed to create model instance for ${modelInfo.name}:`, error);
    return null;
  }
}

/**
 * Hook to get model information for the currently selected model
 */
export function useSelectedModelInfo() {
  const { getSelectedModelInfo } = useAIModel();
  return getSelectedModelInfo();
}