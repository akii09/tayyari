/**
 * AI Provider Priority API - Update provider priority
 * POST /api/ai/providers/[id]/priority - Update provider priority
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
    
    if (typeof body.priority !== 'number' || body.priority < 1) {
      return NextResponse.json(
        {
          success: false,
          error: 'priority must be a positive number',
        },
        { status: 400 }
      );
    }

    const success = await aiProviderService.updateProviderPriority(params.id, body.priority);

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
      message: 'Provider priority updated successfully',
    });
  } catch (error) {
    console.error('Error updating provider priority:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update provider priority',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}