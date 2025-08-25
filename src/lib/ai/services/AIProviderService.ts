/**
 * AI Provider Service
 * Handles CRUD operations for AI provider configurations
 */

import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../../database/config';
import { aiProviders, aiRequestLogs, type AIProvider, type NewAIProvider } from '../../database/schema';
import type { ProviderConfig, ProviderMetrics, AIProviderType } from '../types';

export class AIProviderService {
  /**
   * Create a new AI provider configuration
   */
  async createProvider(providerData: Omit<ProviderConfig, 'id'>): Promise<ProviderConfig> {
    const newProvider: NewAIProvider = {
      name: providerData.name,
      type: providerData.type,
      enabled: providerData.enabled,
      priority: providerData.priority,
      config: JSON.stringify({
        maxRequestsPerMinute: providerData.maxRequestsPerMinute,
        maxCostPerDay: providerData.maxCostPerDay,
        models: providerData.models,
        apiKey: providerData.apiKey,
        baseUrl: providerData.baseUrl,
        healthCheckInterval: providerData.healthCheckInterval,
        timeout: providerData.timeout,
        retryAttempts: providerData.retryAttempts,
      }),
      healthStatus: 'unknown',
      totalRequests: 0,
      totalCost: 0,
    };

    const [created] = await db.insert(aiProviders).values(newProvider).returning();
    return this.dbProviderToConfig(created);
  }

  /**
   * Get all AI provider configurations
   */
  async getAllProviders(): Promise<ProviderConfig[]> {
    const providers = await db
      .select()
      .from(aiProviders)
      .orderBy(aiProviders.priority, aiProviders.name);

    return providers.map(this.dbProviderToConfig);
  }

  /**
   * Get enabled AI provider configurations sorted by priority
   */
  async getEnabledProviders(): Promise<ProviderConfig[]> {
    const providers = await db
      .select()
      .from(aiProviders)
      .where(eq(aiProviders.enabled, true))
      .orderBy(aiProviders.priority, aiProviders.name);

    return providers.map(this.dbProviderToConfig);
  }

  /**
   * Get a specific AI provider by ID
   */
  async getProviderById(id: string): Promise<ProviderConfig | null> {
    const [provider] = await db
      .select()
      .from(aiProviders)
      .where(eq(aiProviders.id, id))
      .limit(1);

    return provider ? this.dbProviderToConfig(provider) : null;
  }

  /**
   * Get providers by type
   */
  async getProvidersByType(type: AIProviderType): Promise<ProviderConfig[]> {
    const providers = await db
      .select()
      .from(aiProviders)
      .where(and(eq(aiProviders.type, type), eq(aiProviders.enabled, true)))
      .orderBy(aiProviders.priority);

    return providers.map(this.dbProviderToConfig);
  }

  /**
   * Refresh Ollama models by fetching from local instance
   */
  async refreshOllamaModels(providerId?: string): Promise<string[]> {
    try {
      const { fetchOllamaModels, isOllamaRunning } = await import('../ollama-models');
      
      // Check if Ollama is running
      const isRunning = await isOllamaRunning();
      if (!isRunning) {
        console.warn('Ollama is not running, using default models');
        return [];
      }

      // Fetch current models
      const models = await fetchOllamaModels();
      
      // Update the provider configuration if providerId is provided
      if (providerId) {
        const provider = await this.getProviderById(providerId);
        if (provider && provider.type === 'ollama') {
          await this.updateProvider(providerId, { models });
          console.log(`✅ Updated Ollama provider ${providerId} with ${models.length} models`);
        }
      }
      
      return models;
    } catch (error) {
      console.error('Failed to refresh Ollama models:', error);
      return [];
    }
  }

  /**
   * Update an AI provider configuration
   */
  async updateProvider(id: string, updates: Partial<ProviderConfig>): Promise<ProviderConfig | null> {
    const existing = await this.getProviderById(id);
    if (!existing) {
      return null;
    }

    const updateData: Partial<NewAIProvider> = {
      updatedAt: new Date().toISOString(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
    if (updates.priority !== undefined) updateData.priority = updates.priority;

    // Update config JSON if any config fields are provided
    if (
      updates.maxRequestsPerMinute !== undefined ||
      updates.maxCostPerDay !== undefined ||
      updates.models !== undefined ||
      updates.apiKey !== undefined ||
      updates.baseUrl !== undefined ||
      updates.healthCheckInterval !== undefined ||
      updates.timeout !== undefined ||
      updates.retryAttempts !== undefined
    ) {
      const currentConfig = JSON.parse(existing.config || '{}');
      const newConfig = {
        ...currentConfig,
        ...(updates.maxRequestsPerMinute !== undefined && { maxRequestsPerMinute: updates.maxRequestsPerMinute }),
        ...(updates.maxCostPerDay !== undefined && { maxCostPerDay: updates.maxCostPerDay }),
        ...(updates.models !== undefined && { models: updates.models }),
        ...(updates.apiKey !== undefined && { apiKey: updates.apiKey }),
        ...(updates.baseUrl !== undefined && { baseUrl: updates.baseUrl }),
        ...(updates.healthCheckInterval !== undefined && { healthCheckInterval: updates.healthCheckInterval }),
        ...(updates.timeout !== undefined && { timeout: updates.timeout }),
        ...(updates.retryAttempts !== undefined && { retryAttempts: updates.retryAttempts }),
      };
      updateData.config = JSON.stringify(newConfig);
    }

    const [updated] = await db
      .update(aiProviders)
      .set(updateData)
      .where(eq(aiProviders.id, id))
      .returning();

    return updated ? this.dbProviderToConfig(updated) : null;
  }

  /**
   * Delete an AI provider configuration
   */
  async deleteProvider(id: string): Promise<boolean> {
    const result = await db
      .delete(aiProviders)
      .where(eq(aiProviders.id, id));

    return result.changes > 0;
  }

  /**
   * Update provider health status
   */
  async updateProviderHealth(id: string, status: string, errorMessage?: string): Promise<void> {
    await db
      .update(aiProviders)
      .set({
        healthStatus: status,
        lastHealthCheck: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(aiProviders.id, id));
  }

  /**
   * Update provider metrics (request count, cost)
   */
  async updateProviderMetrics(id: string, requestCount: number, cost: number): Promise<void> {
    const [provider] = await db
      .select({
        totalRequests: aiProviders.totalRequests,
        totalCost: aiProviders.totalCost,
      })
      .from(aiProviders)
      .where(eq(aiProviders.id, id))
      .limit(1);

    if (provider) {
      await db
        .update(aiProviders)
        .set({
          totalRequests: (provider.totalRequests || 0) + requestCount,
          totalCost: (provider.totalCost || 0) + cost,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(aiProviders.id, id));
    }
  }

  /**
   * Get provider metrics
   */
  async getProviderMetrics(id: string): Promise<ProviderMetrics | null> {
    const [provider] = await db
      .select({
        id: aiProviders.id,
        totalRequests: aiProviders.totalRequests,
        totalCost: aiProviders.totalCost,
        updatedAt: aiProviders.updatedAt,
      })
      .from(aiProviders)
      .where(eq(aiProviders.id, id))
      .limit(1);

    if (!provider) {
      return null;
    }

    // For now, we'll calculate success/failure rates from request logs
    // This could be optimized with additional metrics tracking
    return {
      providerId: provider.id,
      totalRequests: provider.totalRequests || 0,
      successfulRequests: await this.getSuccessfulRequestsCount(provider.id),
      failedRequests: await this.getFailedRequestsCount(provider.id),
      averageResponseTime: await this.getAverageResponseTime(provider.id),
      totalCost: provider.totalCost || 0,
      lastRequestAt: provider.updatedAt ? new Date(provider.updatedAt) : undefined,
    };
  }

  /**
   * Get all provider metrics
   */
  async getAllProviderMetrics(): Promise<ProviderMetrics[]> {
    const providers = await db
      .select({
        id: aiProviders.id,
        totalRequests: aiProviders.totalRequests,
        totalCost: aiProviders.totalCost,
        updatedAt: aiProviders.updatedAt,
      })
      .from(aiProviders);

    return Promise.all(providers.map(async provider => ({
      providerId: provider.id,
      totalRequests: provider.totalRequests || 0,
      successfulRequests: await this.getSuccessfulRequestsCount(provider.id),
      failedRequests: await this.getFailedRequestsCount(provider.id),
      averageResponseTime: await this.getAverageResponseTime(provider.id),
      totalCost: provider.totalCost || 0,
      lastRequestAt: provider.updatedAt ? new Date(provider.updatedAt) : undefined,
    })));
  }

  /**
   * Enable/disable a provider
   */
  async toggleProvider(id: string, enabled: boolean): Promise<boolean> {
    const result = await db
      .update(aiProviders)
      .set({
        enabled,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(aiProviders.id, id));

    return result.changes > 0;
  }

  /**
   * Update provider priority
   */
  async updateProviderPriority(id: string, priority: number): Promise<boolean> {
    const result = await db
      .update(aiProviders)
      .set({
        priority,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(aiProviders.id, id));

    return result.changes > 0;
  }

  /**
   * Convert database provider to ProviderConfig
   */
  private dbProviderToConfig(dbProvider: AIProvider): ProviderConfig {
    const config = dbProvider.config ? JSON.parse(dbProvider.config) : {};
    
    return {
      id: dbProvider.id,
      name: dbProvider.name,
      type: dbProvider.type as AIProviderType,
      enabled: dbProvider.enabled || false,
      priority: dbProvider.priority || 1,
      maxRequestsPerMinute: config.maxRequestsPerMinute || 60,
      maxCostPerDay: config.maxCostPerDay || 10,
      models: config.models || [],
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      healthCheckInterval: config.healthCheckInterval || 300000, // 5 minutes
      timeout: config.timeout || 30000, // 30 seconds
      retryAttempts: config.retryAttempts || 3,
      config: dbProvider.config, // Include raw config for reference
    };
  }

  /**
   * Get successful requests count for a provider
   */
  private async getSuccessfulRequestsCount(providerId: string): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(aiRequestLogs)
        .where(and(
          eq(aiRequestLogs.provider, providerId),
          eq(aiRequestLogs.success, true)
        ));
      
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error getting successful requests count:', error);
      return 0;
    }
  }

  /**
   * Get failed requests count for a provider
   */
  private async getFailedRequestsCount(providerId: string): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(aiRequestLogs)
        .where(and(
          eq(aiRequestLogs.provider, providerId),
          eq(aiRequestLogs.success, false)
        ));
      
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error getting failed requests count:', error);
      return 0;
    }
  }

  /**
   * Get average response time for a provider
   */
  private async getAverageResponseTime(providerId: string): Promise<number> {
    try {
      const result = await db
        .select({ avgTime: sql<number>`avg(response_time)` })
        .from(aiRequestLogs)
        .where(and(
          eq(aiRequestLogs.provider, providerId),
          eq(aiRequestLogs.success, true)
        ));
      
      return Math.round(result[0]?.avgTime || 0);
    } catch (error) {
      console.error('Error getting average response time:', error);
      return 0;
    }
  }

  /**
   * Seed default providers if none exist
   */
  async seedDefaultProviders(): Promise<void> {
    const existingProviders = await this.getAllProviders();
    if (existingProviders.length > 0) {
      console.log(`Found ${existingProviders.length} existing providers, skipping seed`);
      return; // Already have providers
    }

    console.log('Seeding default AI providers...');

    const defaultProviders: Omit<ProviderConfig, 'id'>[] = [
      {
        name: 'OpenAI GPT-4o',
        type: 'openai',
        enabled: false,
        priority: 1,
        maxRequestsPerMinute: 60,
        maxCostPerDay: 10,
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        healthCheckInterval: 300000,
        timeout: 30000,
        retryAttempts: 3,
      },
      {
        name: 'Claude 3.5 Sonnet',
        type: 'anthropic',
        enabled: false,
        priority: 2,
        maxRequestsPerMinute: 60,
        maxCostPerDay: 10,
        models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
        healthCheckInterval: 300000,
        timeout: 30000,
        retryAttempts: 3,
      },
      {
        name: 'Google Gemini',
        type: 'google',
        enabled: false,
        priority: 3,
        maxRequestsPerMinute: 60,
        maxCostPerDay: 10,
        models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
        healthCheckInterval: 300000,
        timeout: 30000,
        retryAttempts: 3,
      },
      {
        name: 'Mistral AI',
        type: 'mistral',
        enabled: false,
        priority: 4,
        maxRequestsPerMinute: 60,
        maxCostPerDay: 10,
        models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'codestral-latest'],
        healthCheckInterval: 300000,
        timeout: 30000,
        retryAttempts: 3,
      },
      {
        name: 'Ollama Local',
        type: 'ollama',
        enabled: false,
        priority: 5,
        maxRequestsPerMinute: 120,
        maxCostPerDay: 0,
        models: ['llama3.1:8b', 'llama3.1:70b', 'codellama:7b', 'codellama:13b', 'mistral:7b', 'phi3:mini', 'qwen2:7b'],
        baseUrl: 'http://localhost:11434',
        healthCheckInterval: 300000,
        timeout: 60000,
        retryAttempts: 2,
      },
      {
        name: 'Groq',
        type: 'groq',
        enabled: false,
        priority: 6,
        maxRequestsPerMinute: 30,
        maxCostPerDay: 5,
        models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
        healthCheckInterval: 300000,
        timeout: 30000,
        retryAttempts: 3,
      },
      {
        name: 'Perplexity',
        type: 'perplexity',
        enabled: false,
        priority: 7,
        maxRequestsPerMinute: 20,
        maxCostPerDay: 5,
        models: ['llama-3.1-sonar-large-128k-online', 'llama-3.1-sonar-small-128k-online', 'llama-3.1-8b-instruct', 'llama-3.1-70b-instruct'],
        healthCheckInterval: 300000,
        timeout: 30000,
        retryAttempts: 3,
      },
    ];

    for (const provider of defaultProviders) {
      await this.createProvider(provider);
      console.log(`✅ Created provider: ${provider.name}`);
    }
    
    console.log(`🎉 Successfully seeded ${defaultProviders.length} AI providers!`);
  }

  /**
   * Force re-seed providers (for development/testing)
   */
  async forceSeedProviders(): Promise<void> {
    console.log('Force seeding AI providers...');
    
    const defaultProviders: Omit<ProviderConfig, 'id'>[] = [
      {
        name: 'OpenAI GPT-4o',
        type: 'openai',
        enabled: false,
        priority: 1,
        maxRequestsPerMinute: 60,
        maxCostPerDay: 10,
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        healthCheckInterval: 300000,
        timeout: 30000,
        retryAttempts: 3,
      },
      {
        name: 'Claude 3.5 Sonnet',
        type: 'anthropic',
        enabled: false,
        priority: 2,
        maxRequestsPerMinute: 60,
        maxCostPerDay: 10,
        models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
        healthCheckInterval: 300000,
        timeout: 30000,
        retryAttempts: 3,
      },
      {
        name: 'Google Gemini',
        type: 'google',
        enabled: false,
        priority: 3,
        maxRequestsPerMinute: 60,
        maxCostPerDay: 10,
        models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
        healthCheckInterval: 300000,
        timeout: 30000,
        retryAttempts: 3,
      },
      {
        name: 'Mistral AI',
        type: 'mistral',
        enabled: false,
        priority: 4,
        maxRequestsPerMinute: 60,
        maxCostPerDay: 10,
        models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'codestral-latest'],
        healthCheckInterval: 300000,
        timeout: 30000,
        retryAttempts: 3,
      },
      {
        name: 'Ollama Local',
        type: 'ollama',
        enabled: false,
        priority: 5,
        maxRequestsPerMinute: 120,
        maxCostPerDay: 0,
        models: ['llama3.1:8b', 'llama3.1:70b', 'codellama:7b', 'codellama:13b', 'mistral:7b', 'phi3:mini', 'qwen2:7b'],
        baseUrl: 'http://localhost:11434',
        healthCheckInterval: 300000,
        timeout: 60000,
        retryAttempts: 2,
      },
      {
        name: 'Groq',
        type: 'groq',
        enabled: false,
        priority: 6,
        maxRequestsPerMinute: 30,
        maxCostPerDay: 5,
        models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
        healthCheckInterval: 300000,
        timeout: 30000,
        retryAttempts: 3,
      },
      {
        name: 'Perplexity',
        type: 'perplexity',
        enabled: false,
        priority: 7,
        maxRequestsPerMinute: 20,
        maxCostPerDay: 5,
        models: ['llama-3.1-sonar-large-128k-online', 'llama-3.1-sonar-small-128k-online', 'llama-3.1-8b-instruct', 'llama-3.1-70b-instruct'],
        healthCheckInterval: 300000,
        timeout: 30000,
        retryAttempts: 3,
      },
    ];

    for (const provider of defaultProviders) {
      await this.createProvider(provider);
      console.log(`✅ Created provider: ${provider.name}`);
    }
    
    console.log(`🎉 Successfully force-seeded ${defaultProviders.length} AI providers!`);
  }
}

// Singleton instance
export const aiProviderService = new AIProviderService();