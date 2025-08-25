import { NextRequest, NextResponse } from 'next/server';
import { aiProviderService } from '@/lib/ai/services/AIProviderService';
import { healthChecker } from '@/lib/ai/health';

export interface ProviderConfigRequest {
  id: string;
  apiKey?: string;
  baseUrl?: string;
  enabled?: boolean;
  priority?: number;
}

/**
 * Get all AI providers with their configurations
 * GET /api/ai/providers
 */
export async function GET() {
  try {
    const providers = await aiProviderService.getAllProviders();
    
    // Remove sensitive data for client
    const sanitizedProviders = providers.map(provider => ({
      ...provider,
      apiKey: provider.apiKey ? '••••••••' : undefined,
      hasApiKey: !!provider.apiKey,
    }));
    
    return NextResponse.json({
      success: true,
      providers: sanitizedProviders,
    });
  } catch (error) {
    console.error('Failed to get AI providers:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get AI providers',
        providers: [],
      },
      { status: 500 }
    );
  }
}

/**
 * Update AI provider configuration
 * PUT /api/ai/providers
 */
export async function PUT(request: NextRequest) {
  try {
    const body: ProviderConfigRequest = await request.json();
    
    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    // Update provider configuration
    const updatedProvider = await aiProviderService.updateProvider(body.id, {
      ...(body.apiKey !== undefined && { apiKey: body.apiKey }),
      ...(body.baseUrl !== undefined && { baseUrl: body.baseUrl }),
      ...(body.enabled !== undefined && { enabled: body.enabled }),
      ...(body.priority !== undefined && { priority: body.priority }),
    });

    if (!updatedProvider) {
      return NextResponse.json(
        { success: false, error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Trigger health check for the updated provider if it's enabled and has an API key
    if (updatedProvider.enabled && updatedProvider.apiKey) {
      // Don't await this - let it run in background
      healthChecker.checkProviderHealth(updatedProvider).catch(error => {
        console.error(`Health check failed for provider ${updatedProvider.id}:`, error);
      });
    }

    // Return sanitized provider data
    const sanitizedProvider = {
      ...updatedProvider,
      apiKey: updatedProvider.apiKey ? '••••••••' : undefined,
      hasApiKey: !!updatedProvider.apiKey,
    };

    return NextResponse.json({
      success: true,
      message: 'Provider updated successfully',
      provider: sanitizedProvider,
    });
  } catch (error) {
    console.error('Failed to update AI provider:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update AI provider',
      },
      { status: 500 }
    );
  }
}

