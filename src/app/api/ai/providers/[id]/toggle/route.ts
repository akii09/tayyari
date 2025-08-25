/**
 * AI Provider Toggle API - Enable/disable providers
 * POST /api/ai/providers/[id]/toggle - Toggle provider enabled status
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiProviderService } from '@/lib/ai/services/AIProviderService';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    
    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: 'enabled field must be a boolean',
        },
        { status: 400 }
      );
    }

    const success = await aiProviderService.toggleProvider(params.id, body.enabled);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Provider not found',
        },
        { status: 404 }
      );
    }

    // Get updated provider to return
    const updatedProvider = await aiProviderService.getProviderById(params.id);

    return NextResponse.json({
      success: true,
      data: updatedProvider,
      message: `Provider ${body.enabled ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    console.error('Error toggling AI provider:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to toggle AI provider',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}