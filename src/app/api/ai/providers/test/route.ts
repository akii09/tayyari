import { NextRequest, NextResponse } from 'next/server';
import { aiProviderService } from '@/lib/ai/services/AIProviderService';
import { healthChecker } from '@/lib/ai/health';

/**
 * Test AI provider connection
 * POST /api/ai/providers/test
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Testing AI provider connection...');
    
    const body: { id: string } = await request.json();
    console.log('Request body:', body);
    
    if (!body.id) {
      console.log('No provider ID provided');
      return NextResponse.json(
        { success: false, error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    console.log('Looking for provider:', body.id);
    const provider = await aiProviderService.getProviderById(body.id);
    if (!provider) {
      console.log('Provider not found:', body.id);
      return NextResponse.json(
        { success: false, error: 'Provider not found' },
        { status: 404 }
      );
    }

    console.log('Found provider:', provider.name, provider.type);
    
    // Perform health check
    console.log('Performing health check...');
    const healthStatus = await healthChecker.checkProviderHealth(provider);
    console.log('Health check result:', healthStatus);
    
    return NextResponse.json({
      success: true,
      message: 'Connection test completed',
      healthStatus,
    });
  } catch (error) {
    console.error('Failed to test AI provider:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to test AI provider connection',
      },
      { status: 500 }
    );
  }
}