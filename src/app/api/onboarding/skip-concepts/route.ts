import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { OnboardingManager } from '@/lib/database/services/onboardingManager';

/**
 * Skip concept selection and complete basic onboarding
 * 
 * POST /api/onboarding/skip-concepts
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    
    const body = await request.json();
    const { sessionId } = body;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    const user = await OnboardingManager.skipConceptSelection(sessionId);
    
    return NextResponse.json({
      success: true,
      message: 'Onboarding completed without concept selection',
      user,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Skip concept selection error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to skip concept selection' },
      { status: 500 }
    );
  }
}