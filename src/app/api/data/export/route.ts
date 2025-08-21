import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In a real app, you'd fetch all user data from database
    // For now, return sample data
    const exportData = {
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        experienceLevel: user.experienceLevel,
        onboardingCompleted: user.onboardingCompleted,
      },
      onboarding: {
        interviewTypes: ['dsa', 'system'],
        targetDate: '2025-06-01',
        hoursPerWeek: 10,
        targetCompanies: ['Google', 'Meta', 'Microsoft'],
        targetRoles: ['Software Engineer', 'Senior SWE'],
        difficultyPreference: 'medium',
        learningStyle: 'hands-on',
      },
      progress: {
        totalStudyHours: 45.5,
        currentStreak: 12,
        completedQuestions: 156,
        averageScore: 78.5,
      },
      chatHistory: {
        totalConversations: 8,
        totalMessages: 45,
        lastActivity: new Date().toISOString(),
      },
      exportDate: new Date().toISOString(),
      exportVersion: '1.0',
    };

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="tayyari-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
