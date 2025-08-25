import { NextResponse } from 'next/server';
import { DatabaseUtils } from '@/lib/database/utils';

/**
 * Health check endpoint for the database
 * 
 * GET /api/health
 * Returns database status and basic statistics
 */
export async function GET() {
  try {
    // Check database health
    const healthCheck = await DatabaseUtils.healthCheck();
    
    // Get database statistics
    const stats = await DatabaseUtils.getStats();

    return NextResponse.json({
      status: healthCheck.status,
      message: healthCheck.message,
      database: {
        ...stats,
        lastChecked: new Date().toISOString(),
      },
      application: {
        name: 'TayyarAI',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
