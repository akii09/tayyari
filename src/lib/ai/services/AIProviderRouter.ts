/**
 * AI Provider Router
 * Handles request routing, load balancing, and fallback mechanisms
 */

import { AIProviderFactory } from '../providers';
import { healthChecker } from '../health';
import { aiProviderService } from './AIProviderService';
import { aiRequestService } from './AIRequestService';
import type { 
  AIRequest, 
  AIResponse, 
  ProviderConfig, 
  ProviderError,
  ProviderHealthStatus 
} from '../types';

interface RoutingContext {
  userId: string;
  conceptId?: string;
  conversationId?: string;
  preferredProvider?: string;
  excludeProviders?: string[];
  maxRetries?: number;
}

interface RoutingResult {
  provider: ProviderConfig;
  response: AIResponse;
  attempts: number;
  fallbacksUsed: string[];
}

export class AIProviderRouter {
  private requestCounts = new Map<string, number>();
  private lastRequestTime = new Map<string, number>();
  private circuitBreakers = new Map<string, { failures: number; lastFailure: number; isOpen: boolean }>();

  /**
   * Route an AI request to the optimal provider with fallback support
   */
  async route(request: AIRequest, context?: RoutingContext): Promise<RoutingResult> {
    const maxRetries = context?.maxRetries || 3;
    const excludeProviders = new Set(context?.excludeProviders || []);
    const fallbacksUsed: string[] = [];
    let attempts = 0;

    // Get available providers
    const availableProviders = await this.getAvailableProviders(
      context?.preferredProvider,
      excludeProviders
    );

    if (availableProviders.length === 0) {
      throw new Error('No available AI providers');
    }

    let lastError: ProviderError | null = null;

    for (const provider of availableProviders) {
      attempts++;

      try {
        // Check rate limits
        if (!this.checkRateLimit(provider)) {
          fallbacksUsed.push(`${provider.name} (rate limited)`);
          continue;
        }

        // Check circuit breaker
        if (this.isCircuitBreakerOpen(provider.id)) {
          fallbacksUsed.push(`${provider.name} (circuit breaker open)`);
          continue;
        }

        // Attempt the request
        const response = await this.makeRequest(provider, request);
        
        // Success - reset circuit breaker and update metrics
        this.resetCircuitBreaker(provider.id);
        this.updateRequestCount(provider.id);
        
        // Log successful request
        await aiRequestService.logRequest({
          userId: request.userId,
          conversationId: request.conversationId,
          conceptId: request.conceptId,
          provider: provider.type,
          model: response.model,
          promptTokens: response.tokens.prompt,
          completionTokens: response.tokens.completion,
          totalTokens: response.tokens.total,
          cost: response.cost,
          responseTime: response.processingTime,
          success: true,
        });

        // Update provider metrics
        await aiProviderService.updateProviderMetrics(provider.id, 1, response.cost || 0);

        return {
          provider,
          response,
          attempts,
          fallbacksUsed,
        };

      } catch (error) {
        const providerError = error as ProviderError;
        lastError = providerError;
        
        // Update circuit breaker
        this.recordFailure(provider.id);
        
        // Log failed request
        await aiRequestService.logRequest({
          userId: request.userId,
          conversationId: request.conversationId,
          conceptId: request.conceptId,
          provider: provider.type,
          model: request.model || provider.models[0],
          success: false,
          errorMessage: providerError.message,
        });

        fallbacksUsed.push(`${provider.name} (${providerError.type})`);

        // If this is a non-retryable error or we've exceeded retries, continue to next provider
        if (!providerError.retryable || attempts >= maxRetries) {
          continue;
        }

        // For retryable errors, wait and retry with the same provider
        if (providerError.retryAfter) {
          await this.sleep(providerError.retryAfter * 1000);
        } else {
          await this.sleep(Math.min(1000 * Math.pow(2, attempts - 1), 10000)); // Exponential backoff
        }
      }
    }

    // All providers failed
    throw new Error(
      `All AI providers failed. Last error: ${lastError?.message || 'Unknown error'}. ` +
      `Fallbacks used: ${fallbacksUsed.join(', ')}`
    );
  }

  /**
   * Get provider health status for all providers
   */
  async getProviderHealth(): Promise<ProviderHealthStatus[]> {
    return healthChecker.getAllHealthStatuses();
  }

  /**
   * Handle provider failure and update routing logic
   */
  async handleFailure(providerId: string, error: ProviderError): Promise<void> {
    // Record failure for circuit breaker
    this.recordFailure(providerId);
    
    // Update provider health status
    await aiProviderService.updateProviderHealth(providerId, 'unhealthy', error.message);
    
    // Trigger health check
    const provider = await aiProviderService.getProviderById(providerId);
    if (provider) {
      healthChecker.checkProviderHealth(provider).catch(console.error);
    }
  }

  /**
   * Update provider configurations and restart health monitoring
   */
  async updateProviderConfig(providerId: string, config: Partial<ProviderConfig>): Promise<void> {
    const updated = await aiProviderService.updateProvider(providerId, config);
    if (updated) {
      // Restart health monitoring with new config
      healthChecker.stopHealthMonitoring(providerId);
      healthChecker.startHealthMonitoring(updated);
      
      // Reset circuit breaker
      this.resetCircuitBreaker(providerId);
    }
  }

  /**
   * Get available providers sorted by priority and health
   */
  private async getAvailableProviders(
    preferredProvider?: string,
    excludeProviders: Set<string> = new Set()
  ): Promise<ProviderConfig[]> {
    const allProviders = await aiProviderService.getEnabledProviders();
    
    // Filter out excluded providers
    const availableProviders = allProviders.filter(
      provider => !excludeProviders.has(provider.id) && !excludeProviders.has(provider.type)
    );

    // If preferred provider is specified and available, put it first
    if (preferredProvider) {
      const preferred = availableProviders.find(
        p => p.id === preferredProvider || p.type === preferredProvider
      );
      if (preferred) {
        const others = availableProviders.filter(p => p.id !== preferred.id);
        return [preferred, ...others];
      }
    }

    // Sort by priority and health status
    return availableProviders.sort((a, b) => {
      // Healthy providers first
      const aHealthy = healthChecker.isProviderHealthy(a.id);
      const bHealthy = healthChecker.isProviderHealthy(b.id);
      
      if (aHealthy && !bHealthy) return -1;
      if (!aHealthy && bHealthy) return 1;
      
      // Then by priority
      return a.priority - b.priority;
    });
  }

  /**
   * Make a request to a specific provider
   */
  private async makeRequest(provider: ProviderConfig, request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      const response = await Promise.race([
        AIProviderFactory.generateResponse(provider, request),
        this.createTimeoutPromise(provider.timeout || 30000),
      ]);
      
      return response;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Convert to ProviderError if not already
      if (!(error instanceof Error) || !('type' in error)) {
        const providerError: ProviderError = {
          name: 'ProviderError',
          message: error instanceof Error ? error.message : 'Unknown error',
          type: 'UNKNOWN',
          provider: provider.type,
          retryable: false,
        };
        throw providerError;
      }
      
      throw error;
    }
  }

  /**
   * Create a timeout promise
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        const error: ProviderError = {
          name: 'ProviderError',
          message: `Request timeout after ${timeout}ms`,
          type: 'TIMEOUT',
          provider: 'unknown',
          retryable: true,
        };
        reject(error);
      }, timeout);
    });
  }

  /**
   * Check if provider is within rate limits
   */
  private checkRateLimit(provider: ProviderConfig): boolean {
    const now = Date.now();
    const providerId = provider.id;
    const windowMs = 60 * 1000; // 1 minute window
    
    const lastRequest = this.lastRequestTime.get(providerId) || 0;
    const requestCount = this.requestCounts.get(providerId) || 0;
    
    // Reset counter if window has passed
    if (now - lastRequest > windowMs) {
      this.requestCounts.set(providerId, 0);
      this.lastRequestTime.set(providerId, now);
      return true;
    }
    
    // Check if within limits
    return requestCount < provider.maxRequestsPerMinute;
  }

  /**
   * Update request count for rate limiting
   */
  private updateRequestCount(providerId: string): void {
    const current = this.requestCounts.get(providerId) || 0;
    this.requestCounts.set(providerId, current + 1);
    this.lastRequestTime.set(providerId, Date.now());
  }

  /**
   * Check if circuit breaker is open for a provider
   */
  private isCircuitBreakerOpen(providerId: string): boolean {
    const breaker = this.circuitBreakers.get(providerId);
    if (!breaker) return false;
    
    const now = Date.now();
    const cooldownPeriod = 60000; // 1 minute
    
    // Reset circuit breaker after cooldown period
    if (breaker.isOpen && now - breaker.lastFailure > cooldownPeriod) {
      breaker.isOpen = false;
      breaker.failures = 0;
    }
    
    return breaker.isOpen;
  }

  /**
   * Record a failure for circuit breaker logic
   */
  private recordFailure(providerId: string): void {
    const breaker = this.circuitBreakers.get(providerId) || {
      failures: 0,
      lastFailure: 0,
      isOpen: false,
    };
    
    breaker.failures++;
    breaker.lastFailure = Date.now();
    
    // Open circuit breaker after 3 consecutive failures
    if (breaker.failures >= 3) {
      breaker.isOpen = true;
    }
    
    this.circuitBreakers.set(providerId, breaker);
  }

  /**
   * Reset circuit breaker after successful request
   */
  private resetCircuitBreaker(providerId: string): void {
    this.circuitBreakers.delete(providerId);
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get routing statistics
   */
  getRoutingStats(): {
    requestCounts: Record<string, number>;
    circuitBreakers: Record<string, { failures: number; isOpen: boolean }>;
  } {
    const requestCounts: Record<string, number> = {};
    const circuitBreakers: Record<string, { failures: number; isOpen: boolean }> = {};
    
    for (const [providerId, count] of this.requestCounts.entries()) {
      requestCounts[providerId] = count;
    }
    
    for (const [providerId, breaker] of this.circuitBreakers.entries()) {
      circuitBreakers[providerId] = {
        failures: breaker.failures,
        isOpen: breaker.isOpen,
      };
    }
    
    return { requestCounts, circuitBreakers };
  }

  /**
   * Reset all routing state (useful for testing)
   */
  reset(): void {
    this.requestCounts.clear();
    this.lastRequestTime.clear();
    this.circuitBreakers.clear();
  }
}

// Singleton instance
export const aiProviderRouter = new AIProviderRouter();