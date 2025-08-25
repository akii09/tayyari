import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { LearningPlanService } from '@/lib/database/services/learningPlanService';

/**
 * Get a specific learning plan
 * 
 * GET /api/learning-plans/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const planId = params.id;
    
    const planData = await LearningPlanService.getLearningPlanById(planId, user.id);
    
    if (!planData) {
      return NextResponse.json(
        { error: 'Learning plan not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      ...planData,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Get learning plan error:', error);
    return NextResponse.json(
      { error: 'Failed to get learning plan' },
      { status: 500 }
    );
  }
}