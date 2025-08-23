/**
 * AI Provider Factory
 * Creates and manages AI-SDK provider instances
 */

import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { mistral } from '@ai-sdk/mistral';
import { generateText } from 'ai';
import type { ProviderConfig, AIRequest, AIResponse, ProviderError } from './types';

export class AIProviderFactory {
  /**
   * Create an AI-SDK provider model based on configuration
   */
  static createModel(config: ProviderConfig, modelName?: string) {
    const model = modelName || config.models[0];
    if (!model) {
      throw new Error(`No model specified for provider ${config.type}`);
    }

    switch (config.type) {
      case 'openai':
        if (!config.apiKey) {
          throw new Error('OpenAI API key is required');
        }
        const openaiClient = openai({
          apiKey: config.apiKey,
        });
        return openaiClient(model);

      case 'anthropic':
        if (!config.apiKey) {
          throw new Error('Anthropic API key is required');
        }
        const anthropicClient = anthropic({
          apiKey: config.apiKey,
        });
        return anthropicClient(model);

      case 'google':
        if (!config.apiKey) {
          throw new Error('Google API key is required');
        }
        const googleClient = google({
          apiKey: config.apiKey,
        });
        return googleClient(model);

      case 'mistral':
        if (!config.apiKey) {
          throw new Error('Mistral API key is required');
        }
        const mistralClient = mistral({
          apiKey: config.apiKey,
        });
        return mistralClient(model);

      case 'ollama':
        // Ollama uses a different approach - we'll handle it separately
        return null;

      default:
        throw new Error(`Unsupported provider type: ${config.type}`);
    }
  }

  /**
   * Generate a response using the specified provider
   */
  static async generateResponse(config: ProviderConfig, request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      let result;
      
      if (config.type === 'ollama') {
        result = await this.generateOllamaResponse(config, request);
      } else {
        const model = this.createModel(config, request.model);
        if (!model) {
          throw new Error(`Failed to create model for ${config.type}`);
        }

        // Convert messages to the format expected by AI-SDK
        const messages = request.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

        // Add system prompt if provided
        if (request.systemPrompt) {
          messages.unshift({
            role: 'system' as const,
            content: request.systemPrompt,
          });
        }

        result = await generateText({
          model,
          messages,
          maxTokens: request.maxTokens || 1000,
          temperature: request.temperature || 0.7,
        });
      }

      const processingTime = Date.now() - startTime;

      return {
        content: result.text,
        provider: config.type,
        model: request.model || config.models[0],
        tokens: {
          prompt: result.usage?.promptTokens || 0,
          completion: result.usage?.completionTokens || 0,
          total: result.usage?.totalTokens || 0,
        },
        cost: this.estimateCost(config, result.usage?.totalTokens || 0),
        processingTime,
        requestId,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Convert error to ProviderError
      const providerError: ProviderError = {
        name: 'ProviderError',
        message: error instanceof Error ? error.message : 'Unknown error',
        type: this.categorizeError(error),
        provider: config.type,
        retryable: this.isRetryableError(error),
      };

      // Add retry delay for rate limit errors
      if (providerError.type === 'RATE_LIMIT') {
        providerError.retryAfter = this.extractRetryAfter(error);
      }

      throw providerError;
    }
  }

  /**
   * Generate response using Ollama (different API)
   */
  private static async generateOllamaResponse(config: ProviderConfig, request: AIRequest) {
    const baseUrl = config.baseUrl || 'http://localhost:11434';
    const model = request.model || config.models[0];

    // Convert messages to Ollama format
    let prompt = '';
    if (request.systemPrompt) {
      prompt += `System: ${request.systemPrompt}\n\n`;
    }
    
    for (const message of request.messages) {
      prompt += `${message.role === 'user' ? 'Human' : 'Assistant'}: ${message.content}\n\n`;
    }
    prompt += 'Assistant: ';

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: request.temperature || 0.7,
          num_predict: request.maxTokens || 1000,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      text: data.response,
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
    };
  }

  /**
   * Estimate cost based on provider and token usage
   */
  private static estimateCost(config: ProviderConfig, tokens: number): number {
    // Rough cost estimates per 1K tokens (as of 2024)
    const costPer1KTokens: Record<string, number> = {
      'gpt-4o': 0.005,
      'gpt-4o-mini': 0.00015,
      'gpt-3.5-turbo': 0.0015,
      'claude-3-5-sonnet-20241022': 0.003,
      'claude-3-haiku-20240307': 0.00025,
      'gemini-1.5-pro': 0.00125,
      'gemini-1.5-flash': 0.000075,
      'mistral-large-latest': 0.004,
      'mistral-small-latest': 0.001,
    };

    const model = config.models[0];
    const costPer1K = costPer1KTokens[model] || 0.001; // Default fallback
    
    // Ollama is free (local)
    if (config.type === 'ollama') {
      return 0;
    }

    return (tokens / 1000) * costPer1K;
  }

  /**
   * Categorize error types for better handling
   */
  private static categorizeError(error: unknown): ProviderError['type'] {
    if (!error) return 'UNKNOWN';
    
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    
    if (message.includes('rate limit') || message.includes('429')) {
      return 'RATE_LIMIT';
    }
    if (message.includes('unauthorized') || message.includes('401') || message.includes('api key')) {
      return 'API_KEY_INVALID';
    }
    if (message.includes('model') && (message.includes('not found') || message.includes('unavailable'))) {
      return 'MODEL_UNAVAILABLE';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'TIMEOUT';
    }
    if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
      return 'NETWORK_ERROR';
    }
    
    return 'UNKNOWN';
  }

  /**
   * Determine if an error is retryable
   */
  private static isRetryableError(error: unknown): boolean {
    const errorType = this.categorizeError(error);
    return ['RATE_LIMIT', 'TIMEOUT', 'NETWORK_ERROR'].includes(errorType);
  }

  /**
   * Extract retry-after delay from rate limit errors
   */
  private static extractRetryAfter(error: unknown): number {
    // Default retry delay (in seconds)
    let retryAfter = 60;
    
    if (error instanceof Error) {
      const match = error.message.match(/retry after (\d+)/i);
      if (match) {
        retryAfter = parseInt(match[1], 10);
      }
    }
    
    return retryAfter;
  }
}

/**
 * Utility function to validate if a provider can handle a request
 */
export function canProviderHandleRequest(config: ProviderConfig, request: AIRequest): boolean {
  // Check if provider is enabled
  if (!config.enabled) {
    return false;
  }

  // Check if requested model is available
  if (request.model && !config.models.includes(request.model)) {
    return false;
  }

  // Check if provider has required credentials
  if (config.type !== 'ollama' && !config.apiKey) {
    return false;
  }

  return true;
}