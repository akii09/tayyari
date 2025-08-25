import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { OnboardingManager } from '@/lib/database/services/onboardingManager';

/**
 * Start a new onboarding session
 * 
 * POST /api/onboarding/session
 */
export async function POST() {
  try {
    const user = await requireAuth();
    
    const session = await OnboardingManager.startOnboarding(user.id);
    
    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Start onboarding session error:', error);
    return NextResponse.json(
      { error: 'Failed to start onboarding session' },
      { status: 500 }
    );
  }
}

/**
 * Get onboarding session
 * 
 * GET /api/onboarding/session?sessionId=xxx
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
    
    const session = OnboardingManager.getOnboardingSession(sessionId);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or expired' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Get onboarding session error:', error);
    return NextResponse.json(
      { error: 'Failed to get onboarding session' },
      { status: 500 }
    );
  }
}

/**
 * Update onboarding session step
 * 
 * PUT /api/onboarding/session
 */
export async function PUT(request: NextRequest) {
  try {
    await requireAuth();
    
    const body = await request.json();
    const { sessionId, step, data } = body;
    
    if (!sessionId || !step) {
      return NextResponse.json(
        { error: 'Session ID and step are required' },
        { status: 400 }
      );
    }
    
    const updatedSession = await OnboardingManager.updateOnboardingStep(
      sessionId,
      step,
      data || {}
    );
    
    return NextResponse.json({
      success: true,
      session: updatedSession,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Update onboarding session error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update onboarding session' },
      { status: 500 }
    );
  }
}