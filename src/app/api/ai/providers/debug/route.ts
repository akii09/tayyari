import { NextResponse } from 'next/server';
import { aiProviderService } from '@/lib/ai/services/AIProviderService';

/**
 * Debug endpoint to check provider seeding
 * GET /api/ai/providers/debug
 */
export async function GET() {
  try {
    // Force seed providers
    await aiProviderService.seedDefaultProviders();
    
    // Get all providers
    const providers = await aiProviderService.getAllProviders();
    
    return NextResponse.json({
      success: true,
      message: 'Debug info for AI providers',
      providersCount: providers.length,
      providers: providers.map(p => ({
        id: p.id,
        name: p.name,
        type: p.type,
        enabled: p.enabled,
        models: p.models,
        hasApiKey: !!p.apiKey,
        baseUrl: p.baseUrl,
      })),
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get debug info',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}