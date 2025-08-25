/**
 * Learning Analytics API
 * GET /api/learning/analytics - Get learning progress analytics across multiple concepts
 */

import { NextRequest, NextResponse } from 'next/server';
import { LearningConceptService } from '@/lib/database/services/learningConceptService';
import { userService } from '@/lib/database/services/userService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const testUserId = 'test-user-123';
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Get user analytics
    const analytics = await LearningConceptService.getUserAnalytics(testUserId);
    
    // Return user analytics
    const overview = {
      totalUsers: 1,
      activeConcepts: analytics.activeConcepts,
      totalSessions: Math.floor(analytics.totalTimeSpent / 30), // Estimate sessions
      averageProgress: analytics.averageProgress,
      completionRate: analytics.completedConcepts / Math.max(analytics.totalConcepts, 1) * 100,
      totalTimeSpent: analytics.totalTimeSpent,
    };

    // Get user concepts for breakdown
    const userConcepts = await LearningConceptService.getUserConcepts(testUserId);
    
    // Calculate category breakdown
    const categoryBreakdown = userConcepts.reduce((breakdown, concept) => {
      const category = concept.category || 'uncategorized';
      if (!breakdown[category]) {
        breakdown[category] = {
          conceptCount: 0,
          userCount: 1,
          averageProgress: 0,
          totalTimeSpent: 0,
        };
      }
      
      breakdown[category].conceptCount++;
      breakdown[category].averageProgress += concept.completionPercentage || 0;
      breakdown[category].totalTimeSpent += concept.timeSpent || 0;
      
      return breakdown;
    }, {} as Record<string, any>);

    // Average the progress for each category
    Object.keys(categoryBreakdown).forEach(category => {
      const categoryData = categoryBreakdown[category];
      if (categoryData.conceptCount > 0) {
        categoryData.averageProgress /= categoryData.conceptCount;
      }
    });

    // Generate progress trends (mock data for now - would need session tracking)
    const progressTrends = Array.from({ length: days }, (_, i) => {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      return {
        date: date.toISOString().split('T')[0],
        newUsers: Math.floor(Math.random() * 5) + 1,
        activeSessions: Math.floor(Math.random() * 30) + 10,
        completions: Math.floor(Math.random() * 3),
        averageProgress: Math.random() * 10 + 65,
      };
    });

    return NextResponse.json({
      success: true,
      analytics: {
        totalConcepts: analytics.totalConcepts,
        activeConcepts: analytics.activeConcepts,
        completedConcepts: analytics.completedConcepts,
        averageProgress: analytics.averageProgress,
        totalTimeSpent: analytics.totalTimeSpent,
        conceptsWithMilestones: analytics.conceptsWithMilestones,
        learningVelocity: analytics.learningVelocity,
        strongestConcepts: analytics.strongestConcepts,
        strugglingConcepts: analytics.strugglingConcepts,
        interdisciplinaryConnections: analytics.interdisciplinaryConnections,
      },
      data: {
        overview,
        concepts: userConcepts.map(concept => ({
          id: concept.id,
          name: concept.name,
          category: concept.category || 'uncategorized',
          difficulty: concept.difficulty || 'beginner',
          completionPercentage: concept.completionPercentage || 0,
          timeSpent: concept.timeSpent || 0,
          isActive: concept.isActive,
          lastStudied: concept.lastStudied,
        })),
        categoryBreakdown,
        progressTrends,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          days,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching learning analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch learning analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}