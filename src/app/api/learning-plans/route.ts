import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { LearningPlanService } from '@/lib/database/services/learningPlanService';

/**
 * Generate a new learning plan
 * 
 * POST /api/learning-plans
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    
    const { conceptIds, preferences, customization } = body;
    
    if (!conceptIds || !Array.isArray(conceptIds) || conceptIds.length === 0) {
      return NextResponse.json(
        { error: 'Concept IDs are required' },
        { status: 400 }
      );
    }
    
    if (!preferences || !preferences.hoursPerWeek) {
      return NextResponse.json(
        { error: 'Hours per week preference is required' },
        { status: 400 }
      );
    }
    
    const planRequest = {
      userId: user.id,
      conceptIds,
      preferences,
      customization,
    };
    
    const learningPlan = await LearningPlanService.generateLearningPlan(planRequest);
    
    return NextResponse.json({
      success: true,
      learningPlan,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Generate learning plan error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate learning plan' },
      { status: 500 }
    );
  }
}

/**
 * Get user's learning plans
 * 
 * GET /api/learning-plans
 */
export async function GET() {
  try {
    const user = await requireAuth();
    
    const learningPlans = await LearningPlanService.getUserLearningPlans(user.id);
    
    return NextResponse.json({
      success: true,
      learningPlans,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Get learning plans error:', error);
    return NextResponse.json(
      { error: 'Failed to get learning plans' },
      { status: 500 }
    );
  }
}