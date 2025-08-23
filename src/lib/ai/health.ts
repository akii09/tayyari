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
      const client = google({
        apiKey: config.apiKey,
      });
      
      const result = await generateText({
        model: client(config.models[0] || 'gemini-1.5-flash'),
        prompt: 'Hello',
        maxTokens: 1,
      });
      
      return { models: config.models };
    } catch (error) {
      throw new Error(`Google health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      const response = await fetch(`${config.baseUrl}/api/tags`);
      
      if (!response.ok) {
        throw new Error(`Ollama server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const availableModels = data.models?.map((model: any) => model.name) || [];
      
      // Verify at least one configured model is available
      const hasConfiguredModel = config.models.some(model => 
        availableModels.some((available: string) => available.includes(model))
      );
      
      if (!hasConfiguredModel && availableModels.length > 0) {
        console.warn(`None of the configured Ollama models (${config.models.join(', ')}) are available. Available models: ${availableModels.join(', ')}`);
      }
      
      return { models: availableModels.length > 0 ? availableModels : config.models };
    } catch (error) {
      throw new Error(`Ollama health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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