import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { UserService } from '@/lib/database/services/userService';
import { ChatService } from '@/lib/database/services/chatService';
import { db } from '@/lib/database/config';
import { studySessions, userProgress, conversations, messages } from '@/lib/database/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Get comprehensive analytics for the user
 * 
 * GET /api/analytics
 */
export async function GET() {
  try {
    const user = await requireAuth();
    
    // Get user stats
    const userStats = await UserService.getUserStats(user.id);
    
    // Get study analytics
    const studyAnalytics = await getStudyAnalytics(user.id);
    
    // Get chat analytics
    const chatAnalytics = await getChatAnalytics(user.id);
    
    // Get performance trends
    const performanceTrends = await getPerformanceTrends(user.id);
    
    // Get recommendations
    const recommendations = await generateRecommendations(user.id);
    
    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalStudyHours: userStats.totalStudyHours,
          currentStreak: userStats.currentStreak,
          completedQuestions: userStats.completedQuestions,
          averageScore: userStats.averageScore,
          sessionsThisWeek: userStats.sessionsThisWeek,
        },
        studyAnalytics,
        chatAnalytics,
        performanceTrends,
        recommendations,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Get analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to get analytics data' },
      { status: 500 }
    );
  }
}

/**
 * Get study session analytics
 */
async function getStudyAnalytics(userId: string) {
  // Session type distribution
  const sessionTypes = await db
    .select({
      sessionType: studySessions.sessionType,
      count: sql<number>`count(*)`,
      totalDuration: sql<number>`sum(${studySessions.duration})`,
      avgScore: sql<number>`avg(${studySessions.score})`,
    })
    .from(studySessions)
    .where(eq(studySessions.userId, userId))
    .groupBy(studySessions.sessionType);
  
  // Daily study pattern (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const dailyPattern = await db
    .select({
      date: sql<string>`date(${studySessions.createdAt})`,
      sessions: sql<number>`count(*)`,
      duration: sql<number>`sum(${studySessions.duration})`,
    })
    .from(studySessions)
    .where(
      and(
        eq(studySessions.userId, userId),
        sql`date(${studySessions.createdAt}) >= date(${thirtyDaysAgo.toISOString()})`
      )
    )
    .groupBy(sql`date(${studySessions.createdAt})`)
    .orderBy(sql`date(${studySessions.createdAt})`);
  
  // Performance by difficulty
  const difficultyPerformance = await db
    .select({
      difficulty: studySessions.difficultyLevel,
      sessions: sql<number>`count(*)`,
      avgScore: sql<number>`avg(${studySessions.score})`,
      avgDuration: sql<number>`avg(${studySessions.duration})`,
    })
    .from(studySessions)
    .where(
      and(
        eq(studySessions.userId, userId),
        sql`${studySessions.difficultyLevel} IS NOT NULL`
      )
    )
    .groupBy(studySessions.difficultyLevel);
  
  return {
    sessionTypes: sessionTypes.map(st => ({
      type: st.sessionType,
      count: st.count,
      totalHours: Math.round((st.totalDuration / 60) * 10) / 10,
      averageScore: Math.round(st.avgScore || 0),
    })),
    dailyPattern: dailyPattern.map(dp => ({
      date: dp.date,
      sessions: dp.sessions,
      hours: Math.round((dp.duration / 60) * 10) / 10,
    })),
    difficultyPerformance: difficultyPerformance.map(dp => ({
      difficulty: dp.difficulty,
      sessions: dp.sessions,
      averageScore: Math.round(dp.avgScore || 0),
      averageDuration: Math.round(dp.avgDuration || 0),
    })),
  };
}

/**
 * Get chat interaction analytics
 */
async function getChatAnalytics(userId: string) {
  // Conversation statistics
  const conversationStats = await db
    .select({
      total: sql<number>`count(*)`,
      totalMessages: sql<number>`sum(${conversations.messageCount})`,
      avgMessages: sql<number>`avg(${conversations.messageCount})`,
    })
    .from(conversations)
    .where(eq(conversations.userId, userId));
  
  // Context distribution
  const contextDistribution = await db
    .select({
      context: conversations.context,
      count: sql<number>`count(*)`,
      totalMessages: sql<number>`sum(${conversations.messageCount})`,
    })
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .groupBy(conversations.context);
  
  // Feedback analysis
  const feedbackStats = await db
    .select({
      feedback: messages.feedback,
      count: sql<number>`count(*)`,
    })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(
      and(
        eq(conversations.userId, userId),
        sql`${messages.feedback} IS NOT NULL`
      )
    )
    .groupBy(messages.feedback);
  
  // Weekly chat activity
  const weeklyActivity = await db
    .select({
      week: sql<string>`strftime('%Y-%W', ${messages.createdAt})`,
      messages: sql<number>`count(*)`,
      conversations: sql<number>`count(DISTINCT ${messages.conversationId})`,
    })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(eq(conversations.userId, userId))
    .groupBy(sql`strftime('%Y-%W', ${messages.createdAt})`)
    .orderBy(sql`strftime('%Y-%W', ${messages.createdAt})`)
    .limit(8);
  
  return {
    overview: {
      totalConversations: conversationStats[0]?.total || 0,
      totalMessages: conversationStats[0]?.totalMessages || 0,
      averageMessagesPerConversation: Math.round(conversationStats[0]?.avgMessages || 0),
    },
    contextDistribution: contextDistribution.map(cd => ({
      context: cd.context || 'general',
      conversations: cd.count,
      messages: cd.totalMessages,
    })),
    feedback: {
      positive: feedbackStats.find(f => f.feedback === 'positive')?.count || 0,
      negative: feedbackStats.find(f => f.feedback === 'negative')?.count || 0,
      satisfactionRate: calculateSatisfactionRate(feedbackStats),
    },
    weeklyActivity: weeklyActivity.map(wa => ({
      week: wa.week,
      messages: wa.messages,
      conversations: wa.conversations,
    })),
  };
}

/**
 * Get performance trends over time
 */
async function getPerformanceTrends(userId: string) {
  // Progress over time by category
  const categoryProgress = await db
    .select({
      category: userProgress.category,
      completedQuestions: userProgress.completedQuestions,
      correctAnswers: userProgress.correctAnswers,
      averageTime: userProgress.averageTime,
      lastPracticed: userProgress.lastPracticed,
    })
    .from(userProgress)
    .where(eq(userProgress.userId, userId));
  
  // Recent performance trend (last 10 sessions)
  const recentSessions = await db
    .select({
      sessionType: studySessions.sessionType,
      score: studySessions.score,
      duration: studySessions.duration,
      questionsCompleted: studySessions.questionsCompleted,
      createdAt: studySessions.createdAt,
    })
    .from(studySessions)
    .where(eq(studySessions.userId, userId))
    .orderBy(sql`${studySessions.createdAt} DESC`)
    .limit(10);
  
  return {
    categoryProgress: categoryProgress.map(cp => ({
      category: cp.category,
      accuracy: cp.completedQuestions > 0 ? Math.round((cp.correctAnswers / cp.completedQuestions) * 100) : 0,
      averageTime: cp.averageTime,
      questionsCompleted: cp.completedQuestions,
      lastPracticed: cp.lastPracticed,
    })),
    recentPerformance: recentSessions.reverse().map((session, index) => ({
      session: index + 1,
      type: session.sessionType,
      score: session.score,
      efficiency: session.duration && session.questionsCompleted 
        ? Math.round((session.questionsCompleted / session.duration) * 60) // questions per hour
        : 0,
      date: session.createdAt,
    })),
  };
}

/**
 * Generate personalized recommendations
 */
async function generateRecommendations(userId: string) {
  const recommendations = [];
  
  // Get user progress
  const progress = await db
    .select()
    .from(userProgress)
    .where(eq(userProgress.userId, userId));
  
  // Get recent sessions
  const recentSessions = await db
    .select()
    .from(studySessions)
    .where(eq(studySessions.userId, userId))
    .orderBy(sql`${studySessions.createdAt} DESC`)
    .limit(5);
  
  // Check for weak areas
  const weakAreas = progress.filter(p => {
    const accuracy = p.completedQuestions > 0 ? (p.correctAnswers / p.completedQuestions) : 0;
    return accuracy < 0.7 && p.completedQuestions > 5;
  });
  
  if (weakAreas.length > 0) {
    recommendations.push({
      type: 'improvement',
      title: 'Focus on Weak Areas',
      description: `Consider spending more time on ${weakAreas[0].category}. Your current accuracy is ${Math.round((weakAreas[0].correctAnswers / weakAreas[0].completedQuestions) * 100)}%.`,
      action: 'practice',
      priority: 'high',
    });
  }
  
  // Check study consistency
  if (recentSessions.length < 3) {
    recommendations.push({
      type: 'consistency',
      title: 'Maintain Study Consistency',
      description: 'Try to practice more regularly. Consistent daily practice leads to better retention.',
      action: 'schedule',
      priority: 'medium',
    });
  }
  
  // Check for balanced practice
  const sessionTypes = recentSessions.map(s => s.sessionType);
  const uniqueTypes = new Set(sessionTypes);
  
  if (uniqueTypes.size === 1 && recentSessions.length > 2) {
    recommendations.push({
      type: 'variety',
      title: 'Diversify Your Practice',
      description: 'Consider practicing different types of problems to get a well-rounded preparation.',
      action: 'explore',
      priority: 'low',
    });
  }
  
  // Performance-based recommendations
  const avgScore = recentSessions.reduce((sum, s) => sum + (s.score || 0), 0) / recentSessions.length;
  if (avgScore > 80) {
    recommendations.push({
      type: 'challenge',
      title: 'Ready for Harder Problems',
      description: 'Your performance is excellent! Consider tackling more challenging problems.',
      action: 'upgrade',
      priority: 'medium',
    });
  }
  
  return recommendations;
}

/**
 * Calculate satisfaction rate from feedback stats
 */
function calculateSatisfactionRate(feedbackStats: any[]) {
  const positive = feedbackStats.find(f => f.feedback === 'positive')?.count || 0;
  const negative = feedbackStats.find(f => f.feedback === 'negative')?.count || 0;
  const total = positive + negative;
  
  return total > 0 ? Math.round((positive / total) * 100) : 0;
}
