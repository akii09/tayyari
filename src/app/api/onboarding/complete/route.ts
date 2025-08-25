import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { OnboardingManager } from '@/lib/database/services/onboardingManager';

/**
 * Complete onboarding process
 * 
 * POST /api/onboarding/complete
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    
    const body = await request.json();
    const { sessionId, data } = body;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    const result = await OnboardingManager.completeOnboarding(sessionId, data);
    
    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      user: result.user,
      concepts: result.concepts,
      learningPlan: result.learningPlan,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Complete onboarding error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}