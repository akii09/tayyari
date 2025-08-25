/**
 * AI Configuration Management API
 * GET /api/ai/config - Get current AI system configuration
 * POST /api/ai/config - Update AI system configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiProviderService } from '@/lib/ai/services/AIProviderService';

export async function GET(request: NextRequest) {
  try {
    // Get all providers with their configurations
    const providers = await aiProviderService.getAllProviders();
    
    // Get system-wide configuration
    const systemConfig = {
      defaultProvider: providers.find(p => p.enabled && p.priority === 1)?.id || null,
      fallbackEnabled: true,
      maxRetries: 3,
      requestTimeout: 30000,
      rateLimiting: {
        enabled: true,
        requestsPerMinute: 100,
        burstLimit: 20,
      },
      costControls: {
        dailyLimit: null,
        monthlyLimit: null,
        alertThresholds: {
          warning: 80,
          critical: 100,
        },
      },
      healthChecks: {
        enabled: true,
        interval: 300000, // 5 minutes
        timeout: 10000,
      },
      logging: {
        enabled: true,
        level: 'info',
        retentionDays: 90,
      },
    };

    // Calculate configuration summary
    const summary = {
      totalProviders: providers.length,
      enabledProviders: providers.filter(p => p.enabled).length,
      healthyProviders: providers.filter(p => p.enabled).length, // TODO: Check actual health
      primaryProvider: providers.find(p => p.enabled && p.priority === 1)?.name || 'None',
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: {
        providers,
        systemConfig,
        summary,
      },
    });
  } catch (error) {
    console.error('Error fetching AI configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch AI configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate configuration update
    const updates = {
      systemConfig: body.systemConfig || {},
      providerUpdates: body.providerUpdates || [],
    };

    const results = {
      systemConfigUpdated: false,
      providersUpdated: 0,
      errors: [] as string[],
    };

    // Update provider configurations
    for (const providerUpdate of updates.providerUpdates) {
      try {
        if (!providerUpdate.id) {
          results.errors.push('Provider update missing ID');
          continue;
        }

        const updated = await aiProviderService.updateProvider(
          providerUpdate.id,
          providerUpdate
        );

        if (updated) {
          results.providersUpdated++;
        } else {
          results.errors.push(`Provider ${providerUpdate.id} not found`);
        }
      } catch (error) {
        results.errors.push(`Failed to update provider ${providerUpdate.id}: ${error}`);
      }
    }

    // Update system configuration
    if (Object.keys(updates.systemConfig).length > 0) {
      // In a real implementation, you would save system config to database
      // For now, we'll just validate and acknowledge the update
      
      // Validate system config
      if (updates.systemConfig.requestTimeout && updates.systemConfig.requestTimeout < 1000) {
        results.errors.push('Request timeout must be at least 1000ms');
      }
      
      if (updates.systemConfig.maxRetries && (updates.systemConfig.maxRetries < 0 || updates.systemConfig.maxRetries > 10)) {
        results.errors.push('Max retries must be between 0 and 10');
      }

      if (results.errors.length === 0) {
        results.systemConfigUpdated = true;
      }
    }

    // Get updated configuration
    const updatedProviders = await aiProviderService.getAllProviders();

    return NextResponse.json({
      success: results.errors.length === 0,
      data: {
        results,
        updatedProviders,
        message: `Configuration updated: ${results.providersUpdated} providers updated, system config ${results.systemConfigUpdated ? 'updated' : 'unchanged'}`,
      },
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error) {
    console.error('Error updating AI configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update AI configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}