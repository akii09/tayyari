/**
 * AI Provider Health Checking Utilities
 * Implements health monitoring for all AI providers
 */

import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { mistral } from '@ai-sdk/mistral';
import { generateText } from 'ai';
import type { ProviderConfig, ProviderHealthStatus, AIProviderType } from './types';

export class ProviderHealthChecker {
  private healthCache = new Map<string, ProviderHealthStatus>();
  private healthCheckIntervals = new Map<string, NodeJS.Timeout>();

  /**
   * Check health of a specific provider
   */
  async checkProviderHealth(config: ProviderConfig): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    
    try {
      const result = await this.performHealthCheck(config);
      const responseTime = Date.now() - startTime;
      
      const healthStatus: ProviderHealthStatus = {
        providerId: config.id,
        status: 'healthy',
        lastChecked: new Date(),
        responseTime,
        availableModels: result.models,
      };
      
      this.healthCache.set(config.id, healthStatus);
      return healthStatus;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const healthStatus: ProviderHealthStatus = {
        providerId: config.id,
        status: 'unhealthy',
        lastChecked: new Date(),
        responseTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
      
      this.healthCache.set(config.id, healthStatus);
      return healthStatus;
    }
  }

  /**
   * Perform the actual health check based on provider type
   */
  private async performHealthCheck(config: ProviderConfig): Promise<{ models: string[] }> {
    switch (config.type) {
      case 'openai':
        return this.checkOpenAIHealth(config);
      case 'anthropic':
        return this.checkAnthropicHealth(config);
      case 'google':
        return this.checkGoogleHealth(config);
      case 'mistral':
        return this.checkMistralHealth(config);
      case 'ollama':
        return this.checkOllamaHealth(config);
      case 'groq':
        return this.checkGroqHealth(config);
      case 'perplexity':
        return this.checkPerplexityHealth(config);
      default:
        throw new Error(`Unsupported provider type: ${config.type}`);
    }
  }

  private async checkOpenAIHealth(config: ProviderConfig): Promise<{ models: string[] }> {
    if (!config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      // Test with a minimal request
      const client = openai({
        apiKey: config.apiKey,
      });
      
      const result = await generateText({
        model: client(config.models[0] || 'gpt-3.5-turbo'),
        prompt: 'Hello',
        maxTokens: 1,
      });
      
      return { models: config.models };
    } catch (error) {
      throw new Error(`OpenAI health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async checkAnthropicHealth(config: ProviderConfig): Promise<{ models: string[] }> {
    if (!config.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    try {
      const client = anthropic({
        apiKey: config.apiKey,
      });
      
      const result = await generateText({
        model: client(config.models[0] || 'claude-3-haiku-20240307'),
        prompt: 'Hello',
        maxTokens: 1,
      });
      
      return { models: config.models };
    } catch (error) {
      throw new Error(`Anthropic health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async checkGoogleHealth(config: ProviderConfig): Promise<{ models: string[] }> {
    if (!config.apiKey) {
      throw new Error('Google API key not configured');
    }

    try {
      // First, try to list available models to validate API key
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        headers: {
          'x-goog-api-key': config.apiKey,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Invalid Google API key or insufficient permissions');
        } else if (response.status === 429) {
          throw new Error('Google API quota exceeded');
        }
        throw new Error(`Google API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const availableModels = data.models?.map((model: any) => model.name.replace('models/', '')) || [];
      
      // If we can list models, the API key is valid
      return { models: availableModels.length > 0 ? availableModels : config.models };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Google health check failed: ${errorMessage}`);
    }
  }

  private async checkMistralHealth(config: ProviderConfig): Promise<{ models: string[] }> {
    if (!config.apiKey) {
      throw new Error('Mistral API key not configured');
    }

    try {
      const client = mistral({
        apiKey: config.apiKey,
      });
      
      const result = await generateText({
        model: client(config.models[0] || 'mistral-small-latest'),
        prompt: 'Hello',
        maxTokens: 1,
      });
      
      return { models: config.models };
    } catch (error) {
      throw new Error(`Mistral health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async checkOllamaHealth(config: ProviderConfig): Promise<{ models: string[] }> {
    if (!config.baseUrl) {
      throw new Error('Ollama base URL not configured');
    }

    try {
      // Check if Ollama is running and get available models
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${config.baseUrl}/api/tags`, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Ollama server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const availableModels = data.models?.map((model: any) => model.name) || [];
      
      if (availableModels.length === 0) {
        throw new Error('Ollama is running but no models are installed. Run: ollama pull llama3.1:8b');
      }
      
      return { models: availableModels };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Ollama health check timed out - server may not be running. Try: ollama serve');
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
        throw new Error('Ollama server is not running. Start it with: ollama serve');
      }
      
      throw new Error(`Ollama health check failed: ${errorMessage}`);
    }
  }

  private async checkGroqHealth(config: ProviderConfig): Promise<{ models: string[] }> {
    if (!config.apiKey) {
      throw new Error('Groq API key not configured');
    }

    try {
      // Groq uses OpenAI-compatible API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid Groq API key');
        } else if (response.status === 429) {
          throw new Error('Groq API rate limit exceeded');
        } else if (response.status === 403) {
          throw new Error('Groq API access forbidden - check API key permissions');
        }
        
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Groq API returned ${response.status}: ${response.statusText}. ${errorText}`);
      }

      const data = await response.json();
      const availableModels = data.data?.map((model: any) => model.id) || [];
      
      if (availableModels.length === 0) {
        throw new Error('No models available from Groq API');
      }
      
      return { models: availableModels };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Groq health check timed out');
      }
      
      throw new Error(`Groq health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async checkPerplexityHealth(config: ProviderConfig): Promise<{ models: string[] }> {
    if (!config.apiKey) {
      throw new Error('Perplexity API key not configured');
    }

    try {
      // Test with a simple completion request
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.models[0] || 'llama-3.1-sonar-small-128k-online',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid Perplexity API key');
        } else if (response.status === 429) {
          throw new Error('Perplexity API rate limit exceeded');
        }
        throw new Error(`Perplexity API returned ${response.status}: ${response.statusText}`);
      }

      return { models: config.models };
    } catch (error) {
      throw new Error(`Perplexity health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Start continuous health monitoring for a provider
   */
  startHealthMonitoring(config: ProviderConfig): void {
    // Clear existing interval if any
    this.stopHealthMonitoring(config.id);
    
    // Perform initial health check
    this.checkProviderHealth(config).catch(error => {
      console.error(`Initial health check failed for provider ${config.id}:`, error);
    });
    
    // Set up recurring health checks
    const interval = setInterval(async () => {
      try {
        await this.checkProviderHealth(config);
      } catch (error) {
        console.error(`Health check failed for provider ${config.id}:`, error);
      }
    }, config.healthCheckInterval);
    
    this.healthCheckIntervals.set(config.id, interval);
  }

  /**
   * Stop health monitoring for a provider
   */
  stopHealthMonitoring(providerId: string): void {
    const interval = this.healthCheckIntervals.get(providerId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(providerId);
    }
  }

  /**
   * Get cached health status for a provider
   */
  getHealthStatus(providerId: string): ProviderHealthStatus | null {
    return this.healthCache.get(providerId) || null;
  }

  /**
   * Get health status for all monitored providers
   */
  getAllHealthStatuses(): ProviderHealthStatus[] {
    return Array.from(this.healthCache.values());
  }

  /**
   * Check if a provider is currently healthy
   */
  isProviderHealthy(providerId: string): boolean {
    const status = this.healthCache.get(providerId);
    if (!status) return false;
    
    // Consider a provider unhealthy if last check was too long ago
    const maxAge = 10 * 60 * 1000; // 10 minutes
    const isRecent = Date.now() - status.lastChecked.getTime() < maxAge;
    
    return status.status === 'healthy' && isRecent;
  }

  /**
   * Get healthy providers sorted by priority
   */
  getHealthyProviders(configs: ProviderConfig[]): ProviderConfig[] {
    return configs
      .filter(config => config.enabled && this.isProviderHealthy(config.id))
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Cleanup all health monitoring
   */
  cleanup(): void {
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval);
    }
    this.healthCheckIntervals.clear();
    this.healthCache.clear();
  }
}

// Singleton instance for global use
export const healthChecker = new ProviderHealthChecker();