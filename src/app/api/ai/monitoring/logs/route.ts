/**
 * AI Request Logs API
 * GET /api/ai/monitoring/logs - Get filtered request logs
 * DELETE /api/ai/monitoring/logs - Clean up old logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiRequestService } from '@/lib/ai/services/AIRequestService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const userId = searchParams.get('userId') || undefined;
    const conversationId = searchParams.get('conversationId') || undefined;
    const conceptId = searchParams.get('conceptId') || undefined;
    const provider = searchParams.get('provider') || undefined;
    const success = searchParams.get('success') 
      ? searchParams.get('success') === 'true' 
      : undefined;
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!) 
      : undefined;
    const endDate = searchParams.get('endDate') 
      ? new Date(searchParams.get('endDate')!) 
      : undefined;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const format = searchParams.get('format') || 'json'; // json or csv

    // Validate limit
    if (limit > 1000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Limit cannot exceed 1000 records',
        },
        { status: 400 }
      );
    }

    // Get logs
    const logs = await aiRequestService.getRequestLogs({
      userId,
      conversationId,
      conceptId,
      provider: provider as any,
      success,
      startDate,
      endDate,
      limit,
      offset,
    });

    // Handle CSV export
    if (format === 'csv') {
      const csvData = await aiRequestService.exportRequestLogs({
        userId,
        startDate,
        endDate,
        format: 'csv',
      });

      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="ai-request-logs.csv"',
        },
      });
    }

    // Calculate summary statistics
    const summary = {
      totalRecords: logs.length,
      successfulRequests: logs.filter(log => log.success).length,
      failedRequests: logs.filter(log => !log.success).length,
      totalCost: logs.reduce((sum, log) => sum + (log.cost || 0), 0),
      totalTokens: logs.reduce((sum, log) => sum + (log.totalTokens || 0), 0),
      averageResponseTime: logs.length > 0 
        ? logs.reduce((sum, log) => sum + (log.responseTime || 0), 0) / logs.length 
        : 0,
      dateRange: {
        earliest: logs.length > 0 ? logs[logs.length - 1].createdAt : null,
        latest: logs.length > 0 ? logs[0].createdAt : null,
      },
    };

    // Group by provider for quick stats
    const providerStats = logs.reduce((acc, log) => {
      if (!acc[log.provider]) {
        acc[log.provider] = {
          requests: 0,
          cost: 0,
          tokens: 0,
          successes: 0,
        };
      }
      acc[log.provider].requests++;
      acc[log.provider].cost += log.cost || 0;
      acc[log.provider].tokens += log.totalTokens || 0;
      if (log.success) acc[log.provider].successes++;
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        summary,
        providerStats,
        pagination: {
          limit,
          offset,
          hasMore: logs.length === limit,
        },
        filters: {
          userId,
          conversationId,
          conceptId,
          provider,
          success,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching request logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch request logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const retentionDays = parseInt(searchParams.get('retentionDays') || '90');
    
    // Validate retention days
    if (retentionDays < 1 || retentionDays > 365) {
      return NextResponse.json(
        {
          success: false,
          error: 'Retention days must be between 1 and 365',
        },
        { status: 400 }
      );
    }

    const deletedCount = await aiRequestService.cleanupOldLogs(retentionDays);

    return NextResponse.json({
      success: true,
      data: {
        deletedRecords: deletedCount,
        retentionDays,
        cleanupDate: new Date().toISOString(),
      },
      message: `Successfully cleaned up ${deletedCount} old log records`,
    });
  } catch (error) {
    console.error('Error cleaning up logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clean up logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}