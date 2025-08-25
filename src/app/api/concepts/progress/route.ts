import { NextRequest, NextResponse } from 'next/server';
import { LearningConceptService } from '@/lib/database/services/learningConceptService';

/**
 * Update concept progress
 * POST /api/concepts/progress
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conceptId, timeSpent, completionPercentage } = body;

    if (!conceptId) {
      return NextResponse.json(
        { success: false, error: 'Concept ID is required' },
        { status: 400 }
      );
    }

    // Update concept progress
    const success = await LearningConceptService.updateProgress(conceptId, {
      timeSpent,
      completionPercentage,
    });

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to update progress' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Progress updated successfully',
    });

  } catch (error) {
    console.error('Error updating concept progress:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}