import { NextResponse } from 'next/server';
import { aiProviderService } from '@/lib/ai/services/AIProviderService';
import { healthChecker } from '@/lib/ai/health';

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  providerType: string;
  isActive: boolean;
  isHealthy: boolean;
  priority: number;
  lastChecked?: Date;
  errorMessage?: string;
}

/**
 * Get all available AI models with their status
 * GET /api/ai/models
 */
export async function GET() {
  try {
    // Get all providers
    const providers = await aiProviderService.getAllProviders();
    
    // Get health status for all providers
    const models: ModelInfo[] = [];
    
    for (const provider of providers) {
      const healthStatus = healthChecker.getHealthStatus(provider.id);
      
      // Add each model from this provider
      for (const modelName of provider.models) {
        const isActive = provider.enabled && (
          provider.type === 'ollama' 
            ? !!provider.baseUrl 
            : !!provider.apiKey
        );

        models.push({
          id: `${provider.id}-${modelName}`,
          name: modelName,
          provider: provider.name,
          providerType: provider.type,
          isActive,
          isHealthy: healthStatus?.status === 'healthy' || false,
          priority: provider.priority,
          lastChecked: healthStatus?.lastChecked,
          errorMessage: healthStatus?.errorMessage,
        });
      }
    }
    
    // Sort by priority and then by name
    models.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.name.localeCompare(b.name);
    });
    
    return NextResponse.json({
      success: true,
      models,
      summary: {
        total: models.length,
        active: models.filter(m => m.isActive).length,
        healthy: models.filter(m => m.isHealthy).length,
      },
    });
  } catch (error) {
    console.error('Failed to get AI models:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get AI models',
        models: [],
        summary: { total: 0, active: 0, healthy: 0 },
      },
      { status: 500 }
    );
  }
}

/**
 * Trigger health check for all providers
 * POST /api/ai/models/health-check
 */
export async function POST() {
  try {
    const providers = await aiProviderService.getEnabledProviders();
    
    // Trigger health checks for all enabled providers
    const healthPromises = providers.map(provider => 
      healthChecker.checkProviderHealth(provider).catch(error => ({
        providerId: provider.id,
        status: 'unhealthy' as const,
        lastChecked: new Date(),
        responseTime: 0,
        errorMessage: error.message,
      }))
    );
    
    const healthResults = await Promise.all(healthPromises);
    
    return NextResponse.json({
      success: true,
      message: 'Health check completed',
      results: healthResults,
    });
  } catch (error) {
    console.error('Failed to perform health check:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to perform health check',
      },
      { status: 500 }
    );
  }
}