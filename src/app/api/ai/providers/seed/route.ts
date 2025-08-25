import { NextRequest, NextResponse } from 'next/server';
import { aiProviderService } from '@/lib/ai/services/AIProviderService';

/**
 * Seed default AI providers
 * POST /api/ai/providers/seed
 */
export async function POST(request: NextRequest) {
  try {
    await aiProviderService.seedDefaultProviders();
    
    return NextResponse.json({
      success: true,
      message: 'Default providers seeded successfully',
    });
  } catch (error) {
    console.error('Failed to seed providers:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to seed default providers',
      },
      { status: 500 }
    );
  }
}