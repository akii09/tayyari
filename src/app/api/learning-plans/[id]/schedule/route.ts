import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { LearningPlanService } from '@/lib/database/services/learningPlanService';

/**
 * Update learning plan schedule
 * 
 * PUT /api/learning-plans/[id]/schedule
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const planId = params.id;
    const body = await request.json();
    
    const { scheduleUpdates } = body;
    
    if (!scheduleUpdates) {
      return NextResponse.json(
        { error: 'Schedule updates are required' },
        { status: 400 }
      );
    }
    
    const success = await LearningPlanService.updatePlanSchedule(
      planId,
      user.id,
      scheduleUpdates
    );
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update schedule or plan not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Schedule updated successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Update plan schedule error:', error);
    return NextResponse.json(
      { error: 'Failed to update plan schedule' },
      { status: 500 }
    );
  }
}