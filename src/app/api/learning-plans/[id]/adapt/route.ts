import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { LearningPlanService } from '@/lib/database/services/learningPlanService';

/**
 * Adapt a learning plan based on progress and performance
 * 
 * POST /api/learning-plans/[id]/adapt
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const planId = params.id;
    const body = await request.json();
    
    const { progressData, performanceMetrics, scheduleChanges } = body;
    
    if (!performanceMetrics) {
      return NextResponse.json(
        { error: 'Performance metrics are required for adaptation' },
        { status: 400 }
      );
    }
    
    const adaptationContext = {
      userId: user.id,
      planId,
      progressData: progressData || [],
      performanceMetrics,
      scheduleChanges,
    };
    
    const adaptedPlan = await LearningPlanService.adaptLearningPlan(adaptationContext);
    
    return NextResponse.json({
      success: true,
      message: 'Learning plan adapted successfully',
      learningPlan: adaptedPlan,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Adapt learning plan error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to adapt learning plan' },
      { status: 500 }
    );
  }
}