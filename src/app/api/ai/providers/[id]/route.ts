/**
 * AI Provider API - Individual provider operations
 * GET /api/ai/providers/[id] - Get specific provider
 * PUT /api/ai/providers/[id] - Update provider
 * DELETE /api/ai/providers/[id] - Delete provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiProviderService } from '@/lib/ai/services/AIProviderService';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const provider = await aiProviderService.getProviderById(params.id);

    if (!provider) {
      return NextResponse.json(
        {
          success: false,
          error: 'Provider not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: provider,
    });
  } catch (error) {
    console.error('Error fetching AI provider:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch AI provider',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    
    // Validate provider type if provided
    if (body.type) {
      const validTypes = ['openai', 'anthropic', 'google', 'mistral', 'ollama'];
      if (!validTypes.includes(body.type)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid provider type. Must be one of: ${validTypes.join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    const updatedProvider = await aiProviderService.updateProvider(params.id, body);

    if (!updatedProvider) {
      return NextResponse.json(
        {
          success: false,
          error: 'Provider not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedProvider,
      message: 'AI provider updated successfully',
    });
  } catch (error) {
    console.error('Error updating AI provider:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update AI provider',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const deleted = await aiProviderService.deleteProvider(params.id);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Provider not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'AI provider deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting AI provider:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete AI provider',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}