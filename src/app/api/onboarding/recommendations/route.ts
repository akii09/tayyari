import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { OnboardingManager } from '@/lib/database/services/onboardingManager';

/**
 * Get AI-powered onboarding recommendations
 * 
 * GET /api/onboarding/recommendations?sessionId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    const recommendations = await OnboardingManager.getOnboardingRecommendations(sessionId);
    
    return NextResponse.json({
      success: true,
      recommendations,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Get onboarding recommendations error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}