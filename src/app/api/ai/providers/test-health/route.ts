import { NextRequest, NextResponse } from 'next/server';
import { aiProviderService } from '@/lib/ai/services/AIProviderService';
import { healthChecker } from '@/lib/ai/health';

/**
 * Test health check for a specific provider
 * POST /api/ai/providers/test-health
 */
export async function POST(request: NextRequest) {
  try {
    const body: { providerId: string } = await request.json();
    
    if (!body.providerId) {
      return NextResponse.json(
        { success: false, error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    const provider = await aiProviderService.getProviderById(body.providerId);
    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Provider not found' },
        { status: 404 }
      );
    }

    console.log(`Testing health for provider: ${provider.name} (${provider.type})`);
    console.log(`Enabled: ${provider.enabled}`);
    console.log(`API Key configured: ${!!provider.apiKey}`);
    console.log(`Base URL: ${provider.baseUrl || 'default'}`);
    console.log(`Models: ${provider.models.join(', ')}`);

    // Check if provider is enabled
    if (!provider.enabled) {
      return NextResponse.json({
        success: false,
        error: 'Provider is disabled',
        provider: {
          id: provider.id,
          name: provider.name,
          type: provider.type,
          enabled: provider.enabled,
          hasApiKey: !!provider.apiKey,
          baseUrl: provider.baseUrl,
        },
        healthStatus: {
          providerId: provider.id,
          status: 'disabled',
          lastChecked: new Date(),
          errorMessage: 'Provider is disabled in configuration',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Perform detailed health check
    const healthStatus = await healthChecker.checkProviderHealth(provider);
    
    // Update provider health in database
    await aiProviderService.updateProviderHealth(
      provider.id, 
      healthStatus.status, 
      healthStatus.errorMessage
    );
    
    return NextResponse.json({
      success: true,
      provider: {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        enabled: provider.enabled,
        hasApiKey: !!provider.apiKey,
        baseUrl: provider.baseUrl,
        models: provider.models,
      },
      healthStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to test provider health:', error);
    
    // Try to get provider info for error response
    let providerInfo = null;
    try {
      const body = await request.json();
      if (body.providerId) {
        const provider = await aiProviderService.getProviderById(body.providerId);
        if (provider) {
          providerInfo = {
            id: provider.id,
            name: provider.name,
            type: provider.type,
            enabled: provider.enabled,
            hasApiKey: !!provider.apiKey,
            baseUrl: provider.baseUrl,
          };
          
          // Update provider health to unhealthy
          await aiProviderService.updateProviderHealth(
            provider.id, 
            'unhealthy', 
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }
    } catch (e) {
      // Ignore errors when trying to get provider info
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to test provider health',
        details: error instanceof Error ? error.message : 'Unknown error',
        provider: providerInfo,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}