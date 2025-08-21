import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In a real app, you'd fetch actual progress data from database
    // For now, return sample data
    const exportData = {
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        experienceLevel: user.experienceLevel,
      },
      progress: {
        totalStudyHours: 45.5,
        currentStreak: 12,
        completedQuestions: 156,
        averageScore: 78.5,
        categories: [
          {
            category: 'dsa',
            completedQuestions: 89,
            accuracy: 82,
            lastPracticed: new Date().toISOString(),
          },
          {
            category: 'system',
            completedQuestions: 45,
            accuracy: 75,
            lastPracticed: new Date().toISOString(),
          },
          {
            category: 'behavioral',
            completedQuestions: 22,
            accuracy: 90,
            lastPracticed: new Date().toISOString(),
          },
        ],
        weeklyProgress: [
          {
            week: '2025-01-01',
            sessions: 5,
            hours: 8.5,
            questions: 23,
          },
          {
            week: '2025-01-08',
            sessions: 6,
            hours: 10.2,
            questions: 31,
          },
        ],
      },
      exportDate: new Date().toISOString(),
    };

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="tayyari-progress-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Error exporting progress:', error);
    return NextResponse.json(
      { error: 'Failed to export progress' },
      { status: 500 }
    );
  }
}
