/**
 * AI Error Handler
 * Comprehensive error handling and recovery systems for provider failures
 */

import { aiProviderService } from './AIProviderService';
import { aiRequestService } from './AIRequestService';
import { healthChecker } from '../health';
import type { ProviderError, ProviderConfig, AIRequest } from '../types';

export interface ErrorRecoveryStrategy {
  name: string;
  canHandle: (error: ProviderError) => boolean;
  handle: (error: ProviderError, context: ErrorContext) => Promise<ErrorRecoveryResult>;
  priority: number;
}

export interface ErrorContext {
  request: AIRequest;
  provider: ProviderConfig;
  attemptNumber: number;
  previousErrors: ProviderError[];
  availableProviders: ProviderConfig[];
}

export interface ErrorRecoveryResult {
  action: 'retry' | 'fallback' | 'fail' | 'wait_and_retry';
  delay?: number; // milliseconds
  fallbackProvider?: ProviderConfig;
  modifiedRequest?: Partial<AIRequest>;
  message?: string;
}

export class AIErrorHandler {
  private recoveryStrategies: ErrorRecoveryStrategy[] = [];
  private errorCounts = new Map<string, number>();
  private lastErrorTime = new Map<string, number>();

  constructor() {
    this.initializeRecoveryStrategies();
  }

  /**
   * Handle a provider error and determine recovery strategy
   */
  async handleError(error: ProviderError, context: ErrorContext): Promise<ErrorRecoveryResult> {
    // Log the error
    await this.logError(error, context);
    
    // Update error tracking
    this.updateErrorTracking(error, context.provider.id);
    
    // Find applicable recovery strategies
    const applicableStrategies = this.recoveryStrategies
      .filter(strategy => strategy.canHandle(error))
      .sort((a, b) => b.priority - a.priority);

    // Try each strategy until one succeeds
    for (const strategy of applicableStrategies) {
      try {
        const result = await strategy.handle(error, context);
        
        // Log successful recovery strategy
        console.log(`Applied recovery strategy "${strategy.name}" for error: ${error.message}`);
        
        return result;
      } catch (strategyError) {
        console.warn(`Recovery strategy "${strategy.name}" failed:`, strategyError);
        continue;
      }
    }

    // No recovery strategy worked
    return {
      action: 'fail',
      message: `No recovery strategy available for error: ${error.message}`,
    };
  }

  /**
   * Initialize built-in recovery strategies
   */
  private initializeRecoveryStrategies(): void {
    // Rate limit recovery
    this.addRecoveryStrategy({
      name: 'rate_limit_backoff',
      priority: 10,
      canHandle: (error) => error.type === 'RATE_LIMIT',
      handle: async (error, context) => {
        const delay = error.retryAfter ? error.retryAfter * 1000 : this.calculateBackoffDelay(context.attemptNumber);
        
        // If delay is too long, try fallback provider
        if (delay > 60000) { // More than 1 minute
          const fallbackProvider = this.findFallbackProvider(context.provider, context.availableProviders);
          if (fallbackProvider) {
            return {
              action: 'fallback',
              fallbackProvider,
              message: `Rate limit delay too long (${delay}ms), switching to ${fallbackProvider.name}`,
            };
          }
        }

        return {
          action: 'wait_and_retry',
          delay,
          message: `Rate limited, waiting ${delay}ms before retry`,
        };
      },
    });

    // API key error recovery
    this.addRecoveryStrategy({
      name: 'api_key_fallback',
      priority: 9,
      canHandle: (error) => error.type === 'API_KEY_INVALID',
      handle: async (error, context) => {
        // Disable the provider temporarily
        await aiProviderService.toggleProvider(context.provider.id, false);
        
        const fallbackProvider = this.findFallbackProvider(context.provider, context.availableProviders);
        if (fallbackProvider) {
          return {
            action: 'fallback',
            fallbackProvider,
            message: `API key invalid for ${context.provider.name}, switching to ${fallbackProvider.name}`,
          };
        }

        return {
          action: 'fail',
          message: 'API key invalid and no fallback provider available',
        };
      },
    });

    // Model unavailable recovery
    this.addRecoveryStrategy({
      name: 'model_fallback',
      priority: 8,
      canHandle: (error) => error.type === 'MODEL_UNAVAILABLE',
      handle: async (error, context) => {
        // Try alternative model from same provider
        const currentModel = context.request.model || context.provider.models[0];
        const alternativeModel = context.provider.models.find(model => model !== currentModel);
        
        if (alternativeModel) {
          return {
            action: 'retry',
            modifiedRequest: { model: alternativeModel },
            message: `Model ${currentModel} unavailable, trying ${alternativeModel}`,
          };
        }

        // No alternative model, try different provider
        const fallbackProvider = this.findFallbackProvider(context.provider, context.availableProviders);
        if (fallbackProvider) {
          return {
            action: 'fallback',
            fallbackProvider,
            message: `No alternative models available, switching to ${fallbackProvider.name}`,
          };
        }

        return {
          action: 'fail',
          message: 'Model unavailable and no alternatives found',
        };
      },
    });

    // Timeout recovery
    this.addRecoveryStrategy({
      name: 'timeout_retry',
      priority: 7,
      canHandle: (error) => error.type === 'TIMEOUT',
      handle: async (error, context) => {
        // Increase timeout for retry
        const newTimeout = Math.min((context.provider.timeout || 30000) * 1.5, 120000);
        
        if (context.attemptNumber < 2) {
          return {
            action: 'retry',
            modifiedRequest: { 
              maxTokens: Math.min(context.request.maxTokens || 1000, 500) // Reduce tokens to speed up
            },
            delay: this.calculateBackoffDelay(context.attemptNumber),
            message: `Timeout occurred, retrying with reduced token limit`,
          };
        }

        // Too many timeouts, try fallback
        const fallbackProvider = this.findFallbackProvider(context.provider, context.availableProviders);
        if (fallbackProvider) {
          return {
            action: 'fallback',
            fallbackProvider,
            message: `Multiple timeouts, switching to ${fallbackProvider.name}`,
          };
        }

        return {
          action: 'fail',
          message: 'Multiple timeouts and no fallback available',
        };
      },
    });

    // Network error recovery
    this.addRecoveryStrategy({
      name: 'network_retry',
      priority: 6,
      canHandle: (error) => error.type === 'NETWORK_ERROR',
      handle: async (error, context) => {
        if (context.attemptNumber < 3) {
          return {
            action: 'wait_and_retry',
            delay: this.calculateBackoffDelay(context.attemptNumber),
            message: `Network error, retrying in ${this.calculateBackoffDelay(context.attemptNumber)}ms`,
          };
        }

        // Network issues persist, try different provider
        const fallbackProvider = this.findFallbackProvider(context.provider, context.availableProviders);
        if (fallbackProvider) {
          return {
            action: 'fallback',
            fallbackProvider,
            message: `Persistent network issues, switching to ${fallbackProvider.name}`,
          };
        }

        return {
          action: 'fail',
          message: 'Persistent network issues and no fallback available',
        };
      },
    });

    // Generic error recovery
    this.addRecoveryStrategy({
      name: 'generic_fallback',
      priority: 1,
      canHandle: () => true, // Handles any error
      handle: async (error, context) => {
        if (context.attemptNumber < 2) {
          return {
            action: 'wait_and_retry',
            delay: this.calculateBackoffDelay(context.attemptNumber),
            message: `Unknown error, retrying: ${error.message}`,
          };
        }

        const fallbackProvider = this.findFallbackProvider(context.provider, context.availableProviders);
        if (fallbackProvider) {
          return {
            action: 'fallback',
            fallbackProvider,
            message: `Unknown error persists, switching to ${fallbackProvider.name}`,
          };
        }

        return {
          action: 'fail',
          message: `Unknown error and no recovery options: ${error.message}`,
        };
      },
    });
  }

  /**
   * Add a custom recovery strategy
   */
  addRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
    this.recoveryStrategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove a recovery strategy
   */
  removeRecoveryStrategy(name: string): boolean {
    const index = this.recoveryStrategies.findIndex(s => s.name === name);
    if (index >= 0) {
      this.recoveryStrategies.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Find a suitable fallback provider
   */
  private findFallbackProvider(
    currentProvider: ProviderConfig,
    availableProviders: ProviderConfig[]
  ): ProviderConfig | null {
    // Find providers that are not the current one and are healthy
    const candidates = availableProviders.filter(provider => 
      provider.id !== currentProvider.id && 
      provider.enabled &&
      healthChecker.isProviderHealthy(provider.id)
    );

    if (candidates.length === 0) {
      return null;
    }

    // Sort by priority and return the best option
    candidates.sort((a, b) => a.priority - b.priority);
    return candidates[0];
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attemptNumber: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attemptNumber - 1), maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Update error tracking for circuit breaker logic
   */
  private updateErrorTracking(error: ProviderError, providerId: string): void {
    const now = Date.now();
    const errorKey = `${providerId}:${error.type}`;
    
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
    this.lastErrorTime.set(errorKey, now);
    
    // Clean up old error counts (older than 1 hour)
    const oneHourAgo = now - 60 * 60 * 1000;
    for (const [key, timestamp] of this.lastErrorTime.entries()) {
      if (timestamp < oneHourAgo) {
        this.errorCounts.delete(key);
        this.lastErrorTime.delete(key);
      }
    }
  }

  /**
   * Get error statistics for a provider
   */
  getErrorStats(providerId: string): Record<string, number> {
    const stats: Record<string, number> = {};
    
    for (const [key, count] of this.errorCounts.entries()) {
      if (key.startsWith(`${providerId}:`)) {
        const errorType = key.split(':')[1];
        stats[errorType] = count;
      }
    }
    
    return stats;
  }

  /**
   * Check if a provider is experiencing too many errors
   */
  isProviderUnstable(providerId: string, threshold: number = 10): boolean {
    let totalErrors = 0;
    
    for (const [key, count] of this.errorCounts.entries()) {
      if (key.startsWith(`${providerId}:`)) {
        totalErrors += count;
      }
    }
    
    return totalErrors >= threshold;
  }

  /**
   * Log error for analytics and monitoring
   */
  private async logError(error: ProviderError, context: ErrorContext): Promise<void> {
    try {
      await aiRequestService.logRequest({
        userId: context.request.userId,
        conversationId: context.request.conversationId,
        conceptId: context.request.conceptId,
        provider: context.provider.type,
        model: context.request.model || context.provider.models[0],
        success: false,
        errorMessage: `${error.type}: ${error.message}`,
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  /**
   * Reset error tracking (useful for testing)
   */
  reset(): void {
    this.errorCounts.clear();
    this.lastErrorTime.clear();
  }

  /**
   * Get all recovery strategies
   */
  getRecoveryStrategies(): ErrorRecoveryStrategy[] {
    return [...this.recoveryStrategies];
  }
}

// Singleton instance
export const aiErrorHandler = new AIErrorHandler();