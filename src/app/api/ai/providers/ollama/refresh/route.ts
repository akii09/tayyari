import { NextResponse } from 'next/server';
import { aiProviderService } from '@/lib/ai/services/AIProviderService';
import { fetchOllamaModels, isOllamaRunning, getOllamaVersion } from '@/lib/ai/ollama-models';

/**
 * Refresh Ollama models from local instance
 * POST /api/ai/providers/ollama/refresh
 */
export async function POST() {
  try {
    // Check if Ollama is running
    const isRunning = await isOllamaRunning();
    if (!isRunning) {
      return NextResponse.json({
        success: false,
        error: 'Ollama is not running. Please start Ollama and try again.',
        models: [],
      }, { status: 503 });
    }

    // Get Ollama version
    const version = await getOllamaVersion();
    
    // Fetch available models
    const models = await fetchOllamaModels();
    
    if (models.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No models found in Ollama instance',
        models: [],
      }, { status: 404 });
    }

    // Find Ollama providers and update them
    const providers = await aiProviderService.getProvidersByType('ollama');
    const updatePromises = providers.map(provider => 
      aiProviderService.updateProvider(provider.id, { models })
    );
    
    await Promise.all(updatePromises);
    
    return NextResponse.json({
      success: true,
      message: `Successfully refreshed ${models.length} Ollama models`,
      models,
      version,
      providersUpdated: providers.length,
    });
  } catch (error) {
    console.error('Failed to refresh Ollama models:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to refresh Ollama models',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * Get current Ollama status and models
 * GET /api/ai/providers/ollama/refresh
 */
export async function GET() {
  try {
    const isRunning = await isOllamaRunning();
    
    if (!isRunning) {
      return NextResponse.json({
        success: true,
        isRunning: false,
        models: [],
        message: 'Ollama is not running',
      });
    }

    const version = await getOllamaVersion();
    const models = await fetchOllamaModels();
    
    return NextResponse.json({
      success: true,
      isRunning: true,
      version,
      models,
      modelCount: models.length,
    });
  } catch (error) {
    console.error('Failed to get Ollama status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get Ollama status',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}