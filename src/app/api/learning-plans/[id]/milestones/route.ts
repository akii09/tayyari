import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { LearningPlanService } from '@/lib/database/services/learningPlanService';

/**
 * Complete a milestone in a learning plan
 * 
 * POST /api/learning-plans/[id]/milestones
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const planId = params.id;
    const body = await request.json();
    
    const { conceptId, milestoneId, completionData } = body;
    
    if (!conceptId || !milestoneId || !completionData) {
      return NextResponse.json(
        { error: 'Concept ID, milestone ID, and completion data are required' },
        { status: 400 }
      );
    }
    
    if (typeof completionData.timeSpent !== 'number') {
      return NextResponse.json(
        { error: 'Time spent must be a number' },
        { status: 400 }
      );
    }
    
    const success = await LearningPlanService.completeMilestone(
      planId,
      user.id,
      conceptId,
      milestoneId,
      completionData
    );
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to complete milestone or plan not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Milestone completed successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Complete milestone error:', error);
    return NextResponse.json(
      { error: 'Failed to complete milestone' },
      { status: 500 }
    );
  }
}