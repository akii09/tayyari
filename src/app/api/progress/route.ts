import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { UserService } from '@/lib/database/services/userService';
import { db } from '@/lib/database/config';
import { userProgress, studySessions } from '@/lib/database/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Get user's progress data
 * 
 * GET /api/progress
 */
export async function GET() {
  try {
    const user = await requireAuth();
    
    // Get user stats
    const stats = await UserService.getUserStats(user.id);
    
    // Get progress by category
    const progressData = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, user.id));
    
    // Get recent study sessions
    const recentSessions = await db
      .select()
      .from(studySessions)
      .where(eq(studySessions.userId, user.id))
      .orderBy(sql`${studySessions.createdAt} DESC`)
      .limit(10);
    
    // Calculate weekly progress
    const weeklyProgress = await calculateWeeklyProgress(user.id);
    
    return NextResponse.json({
      success: true,
      data: {
        stats,
        categories: progressData.map(p => ({
          category: p.category,
          subcategory: p.subcategory,
          totalQuestions: p.totalQuestions,
          completedQuestions: p.completedQuestions,
          correctAnswers: p.correctAnswers,
          accuracy: p.completedQuestions > 0 ? Math.round((p.correctAnswers / p.completedQuestions) * 100) : 0,
          averageTime: p.averageTime,
          difficulty: {
            easy: p.easyCompleted,
            medium: p.mediumCompleted,
            hard: p.hardCompleted,
          },
          streak: p.currentStreak,
          bestStreak: p.bestStreak,
          lastPracticed: p.lastPracticed,
        })),
        recentSessions: recentSessions.map(s => ({
          id: s.id,
          sessionType: s.sessionType,
          topic: s.topic,
          duration: s.duration,
          questionsAttempted: s.questionsAttempted,
          questionsCompleted: s.questionsCompleted,
          score: s.score,
          difficultyLevel: s.difficultyLevel,
          createdAt: s.createdAt,
        })),
        weeklyProgress,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Get progress error:', error);
    return NextResponse.json(
      { error: 'Failed to get progress data' },
      { status: 500 }
    );
  }
}

/**
 * Update user progress
 * 
 * POST /api/progress
 * Body: { category: string, subcategory?: string, questionsCompleted: number, correctAnswers: number, timeSpent: number, difficulty: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    
    if (!body.category || typeof body.questionsCompleted !== 'number') {
      return NextResponse.json(
        { error: 'Category and questionsCompleted are required' },
        { status: 400 }
      );
    }
    
    // Find existing progress record
    const existing = await db
      .select()
      .from(userProgress)
      .where(
        and(
          eq(userProgress.userId, user.id),
          eq(userProgress.category, body.category),
          eq(userProgress.subcategory, body.subcategory || '')
        )
      )
      .limit(1);
    
    const updateData = {
      totalQuestions: sql`${userProgress.totalQuestions} + ${body.questionsCompleted}`,
      completedQuestions: sql`${userProgress.completedQuestions} + ${body.questionsCompleted}`,
      correctAnswers: sql`${userProgress.correctAnswers} + ${body.correctAnswers || 0}`,
      lastPracticed: new Date().toISOString(),
      updatedAt: sql`(datetime('now'))`,
    };
    
    // Update difficulty counters
    if (body.difficulty === 'easy') {
      updateData.easyCompleted = sql`${userProgress.easyCompleted} + ${body.questionsCompleted}`;
    } else if (body.difficulty === 'medium') {
      updateData.mediumCompleted = sql`${userProgress.mediumCompleted} + ${body.questionsCompleted}`;
    } else if (body.difficulty === 'hard') {
      updateData.hardCompleted = sql`${userProgress.hardCompleted} + ${body.questionsCompleted}`;
    }
    
    // Update average time
    if (body.timeSpent) {
      updateData.averageTime = sql`
        CASE 
          WHEN ${userProgress.completedQuestions} = 0 THEN ${body.timeSpent / body.questionsCompleted}
          ELSE (${userProgress.averageTime} * ${userProgress.completedQuestions} + ${body.timeSpent}) / (${userProgress.completedQuestions} + ${body.questionsCompleted})
        END
      `;
    }
    
    if (existing.length > 0) {
      // Update existing record
      await db
        .update(userProgress)
        .set(updateData)
        .where(eq(userProgress.id, existing[0].id));
    } else {
      // Create new record
      await db.insert(userProgress).values({
        userId: user.id,
        category: body.category,
        subcategory: body.subcategory || null,
        totalQuestions: body.questionsCompleted,
        completedQuestions: body.questionsCompleted,
        correctAnswers: body.correctAnswers || 0,
        averageTime: body.timeSpent ? body.timeSpent / body.questionsCompleted : null,
        easyCompleted: body.difficulty === 'easy' ? body.questionsCompleted : 0,
        mediumCompleted: body.difficulty === 'medium' ? body.questionsCompleted : 0,
        hardCompleted: body.difficulty === 'hard' ? body.questionsCompleted : 0,
        lastPracticed: new Date().toISOString(),
        currentStreak: 1,
        bestStreak: 1,
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Progress updated successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Update progress error:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}

/**
 * Calculate weekly progress for the last 4 weeks
 */
async function calculateWeeklyProgress(userId: string) {
  const weeks = [];
  const now = new Date();
  
  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (7 * (i + 1)));
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    
    const sessions = await db
      .select({
        count: sql<number>`count(*)`,
        totalDuration: sql<number>`sum(${studySessions.duration})`,
        totalQuestions: sql<number>`sum(${studySessions.questionsCompleted})`,
      })
      .from(studySessions)
      .where(
        and(
          eq(studySessions.userId, userId),
          sql`date(${studySessions.createdAt}) >= date(${weekStart.toISOString()})`,
          sql`date(${studySessions.createdAt}) < date(${weekEnd.toISOString()})`
        )
      );
    
    weeks.unshift({
      week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
      sessions: sessions[0]?.count || 0,
      hours: Math.round((sessions[0]?.totalDuration || 0) / 60 * 10) / 10,
      questions: sessions[0]?.totalQuestions || 0,
    });
  }
  
  return weeks;
}
