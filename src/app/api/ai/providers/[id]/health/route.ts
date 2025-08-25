/**
 * AI Provider Health API - Health check and status
 * GET /api/ai/providers/[id]/health - Get provider health status
 * POST /api/ai/providers/[id]/health - Update provider health status
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

    // Get provider metrics for health context
    const metrics = await aiProviderService.getProviderMetrics(params.id);

    return NextResponse.json({
      success: true,
      data: {
        providerId: provider.id,
        name: provider.name,
        type: provider.type,
        enabled: provider.enabled,
        healthStatus: 'healthy', // TODO: Implement actual health check
        lastHealthCheck: new Date().toISOString(),
        metrics: metrics || {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0,
          totalCost: 0,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching provider health:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch provider health',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    
    const validStatuses = ['healthy', 'unhealthy', 'unknown', 'maintenance'];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid health status. Must be one of: ${validStatuses.join(', ')}`,
        },
        { status: 400 }
      );
    }

    await aiProviderService.updateProviderHealth(
      params.id, 
      body.status, 
      body.errorMessage
    );

    return NextResponse.json({
      success: true,
      message: 'Provider health status updated successfully',
    });
  } catch (error) {
    console.error('Error updating provider health:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update provider health',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}