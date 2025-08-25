/**
 * AI Configuration Reload API
 * POST /api/ai/config/reload - Reload AI configuration without system restart
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiProviderService } from '@/lib/ai/services/AIProviderService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { force = false, validateOnly = false } = body;

    // Get current configuration
    const providers = await aiProviderService.getAllProviders();
    
    const reloadResults = {
      timestamp: new Date().toISOString(),
      providersReloaded: 0,
      providersValidated: 0,
      errors: [] as string[],
      warnings: [] as string[],
      healthChecks: [] as any[],
    };

    // Validate provider configurations
    for (const provider of providers) {
      try {
        // Validate provider configuration
        const validationResult = validateProviderConfig(provider);
        
        if (validationResult.isValid) {
          reloadResults.providersValidated++;
          
          if (!validateOnly) {
            // Perform health check
            const healthResult = await performProviderHealthCheck(provider);
            reloadResults.healthChecks.push({
              providerId: provider.id,
              name: provider.name,
              status: healthResult.status,
              responseTime: healthResult.responseTime,
              error: healthResult.error,
            });

            // Update health status
            await aiProviderService.updateProviderHealth(
              provider.id,
              healthResult.status,
              healthResult.error
            );

            reloadResults.providersReloaded++;
          }
        } else {
          reloadResults.errors.push(
            `Provider ${provider.name}: ${validationResult.errors.join(', ')}`
          );
        }
      } catch (error) {
        reloadResults.errors.push(
          `Failed to reload provider ${provider.name}: ${error}`
        );
      }
    }

    // Check for configuration issues
    const enabledProviders = providers.filter(p => p.enabled);
    if (enabledProviders.length === 0) {
      reloadResults.warnings.push('No enabled providers found');
    }

    const primaryProviders = enabledProviders.filter(p => p.priority === 1);
    if (primaryProviders.length === 0) {
      reloadResults.warnings.push('No primary provider (priority 1) configured');
    } else if (primaryProviders.length > 1) {
      reloadResults.warnings.push('Multiple primary providers found - may cause conflicts');
    }

    // Generate reload summary
    const summary = {
      totalProviders: providers.length,
      enabledProviders: enabledProviders.length,
      validatedProviders: reloadResults.providersValidated,
      reloadedProviders: reloadResults.providersReloaded,
      healthyProviders: reloadResults.healthChecks.filter(hc => hc.status === 'healthy').length,
      hasErrors: reloadResults.errors.length > 0,
      hasWarnings: reloadResults.warnings.length > 0,
    };

    const statusCode = reloadResults.errors.length > 0 ? 207 : 200; // 207 Multi-Status for partial success

    return NextResponse.json({
      success: reloadResults.errors.length === 0,
      data: {
        results: reloadResults,
        summary,
        message: validateOnly 
          ? `Configuration validation completed: ${summary.validatedProviders}/${summary.totalProviders} providers valid`
          : `Configuration reload completed: ${summary.reloadedProviders}/${summary.totalProviders} providers reloaded`,
      },
    }, { status: statusCode });
  } catch (error) {
    console.error('Error reloading AI configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reload AI configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function validateProviderConfig(provider: any): { isValid: boolean; errors: string[] } {
  const errors = [];

  // Basic validation
  if (!provider.name || provider.name.trim().length === 0) {
    errors.push('Provider name is required');
  }

  if (!provider.type) {
    errors.push('Provider type is required');
  }

  const validTypes = ['openai', 'anthropic', 'google', 'mistral', 'ollama'];
  if (provider.type && !validTypes.includes(provider.type)) {
    errors.push(`Invalid provider type: ${provider.type}`);
  }

  if (provider.priority && (provider.priority < 1 || provider.priority > 100)) {
    errors.push('Provider priority must be between 1 and 100');
  }

  if (provider.maxRequestsPerMinute && provider.maxRequestsPerMinute < 1) {
    errors.push('Max requests per minute must be at least 1');
  }

  if (provider.maxCostPerDay && provider.maxCostPerDay < 0) {
    errors.push('Max cost per day cannot be negative');
  }

  if (provider.timeout && provider.timeout < 1000) {
    errors.push('Timeout must be at least 1000ms');
  }

  if (provider.retryAttempts && (provider.retryAttempts < 0 || provider.retryAttempts > 10)) {
    errors.push('Retry attempts must be between 0 and 10');
  }

  // Type-specific validation
  if (provider.type === 'ollama') {
    if (!provider.baseUrl) {
      errors.push('Ollama provider requires baseUrl');
    }
  } else {
    // Most other providers require API keys
    if (!provider.apiKey && provider.enabled) {
      errors.push('API key is required for enabled provider');
    }
  }

  if (provider.models && !Array.isArray(provider.models)) {
    errors.push('Models must be an array');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

async function performProviderHealthCheck(provider: any): Promise<{
  status: string;
  responseTime?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    // For now, we'll do a basic validation check
    // In a real implementation, you would make an actual API call to test the provider
    
    if (!provider.enabled) {
      return {
        status: 'disabled',
        responseTime: Date.now() - startTime,
      };
    }

    // Simulate health check based on provider type
    if (provider.type === 'ollama') {
      // For Ollama, we might check if the base URL is reachable
      if (!provider.baseUrl) {
        return {
          status: 'unhealthy',
          error: 'Missing base URL',
          responseTime: Date.now() - startTime,
        };
      }
    } else {
      // For API-based providers, check if API key is present
      if (!provider.apiKey) {
        return {
          status: 'unhealthy',
          error: 'Missing API key',
          responseTime: Date.now() - startTime,
        };
      }
    }

    // If basic checks pass, mark as healthy
    return {
      status: 'healthy',
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime,
    };
  }
}