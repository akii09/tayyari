/**
 * Example usage of the AI Provider system
 * This demonstrates how to use the multi-AI provider infrastructure
 */

import { 
  createProviderConfig, 
  getEnvironmentConfig, 
  healthChecker, 
  AIProviderFactory 
} from './index';
import type { AIRequest } from './types';

/**
 * Example: Initialize providers and check health
 */
export async function initializeProviders() {
  const envConfig = getEnvironmentConfig();
  const providers = [];

  // Create OpenAI provider if API key is available
  if (envConfig.openai?.apiKey) {
    const openaiConfig = createProviderConfig('openai', {
      apiKey: envConfig.openai.apiKey,
    });
    providers.push(openaiConfig);
    healthChecker.startHealthMonitoring(openaiConfig);
  }

  // Create Anthropic provider if API key is available
  if (envConfig.anthropic?.apiKey) {
    const anthropicConfig = createProviderConfig('anthropic', {
      apiKey: envConfig.anthropic.apiKey,
    });
    providers.push(anthropicConfig);
    healthChecker.startHealthMonitoring(anthropicConfig);
  }

  // Create Ollama provider (always available for local use)
  const ollamaConfig = createProviderConfig('ollama', {
    baseUrl: envConfig.ollama?.baseUrl,
  });
  providers.push(ollamaConfig);
  healthChecker.startHealthMonitoring(ollamaConfig);

  console.log(`Initialized ${providers.length} AI providers`);
  return providers;
}

/**
 * Example: Generate a response using the first healthy provider
 */
export async function generateExampleResponse() {
  const providers = await initializeProviders();
  const healthyProviders = healthChecker.getHealthyProviders(providers);

  if (healthyProviders.length === 0) {
    throw new Error('No healthy providers available');
  }

  const provider = healthyProviders[0];
  const request: AIRequest = {
    userId: 'example-user',
    messages: [
      { role: 'user', content: 'Hello, how are you?' }
    ],
    systemPrompt: 'You are a helpful AI assistant.',
    maxTokens: 100,
    temperature: 0.7,
  };

  try {
    const response = await AIProviderFactory.generateResponse(provider, request);
    console.log('Generated response:', response);
    return response;
  } catch (error) {
    console.error('Failed to generate response:', error);
    throw error;
  }
}

/**
 * Example: Check health of all providers
 */
export async function checkAllProvidersHealth() {
  const providers = await initializeProviders();
  const healthStatuses = [];

  for (const provider of providers) {
    try {
      const status = await healthChecker.checkProviderHealth(provider);
      healthStatuses.push(status);
      console.log(`Provider ${provider.name}: ${status.status}`);
    } catch (error) {
      console.error(`Health check failed for ${provider.name}:`, error);
    }
  }

  return healthStatuses;
}