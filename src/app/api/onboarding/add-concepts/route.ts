import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { OnboardingManager } from '@/lib/database/services/onboardingManager';

/**
 * Add concepts after completing onboarding
 * 
 * POST /api/onboarding/add-concepts
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    
    const { conceptIds, customizations, generateNewPlan } = body;
    
    if (!conceptIds || !Array.isArray(conceptIds) || conceptIds.length === 0) {
      return NextResponse.json(
        { error: 'Concept IDs are required' },
        { status: 400 }
      );
    }
    
    const result = await OnboardingManager.addConceptsPostOnboarding(user.id, {
      conceptIds,
      customizations,
      generateNewPlan: generateNewPlan || false,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Concepts added successfully',
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
    
    console.error('Add concepts post-onboarding error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add concepts' },
      { status: 500 }
    );
  }
}