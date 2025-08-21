import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getDb } from '@/lib/database/utils';
import { users } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const db = getDb();
    
    // Update user preferences in database
    await db
      .update(users)
      .set({
        interviewTypes: JSON.stringify(body.interviewTypes),
        targetDate: body.targetDate ? body.targetDate.toISOString() : null,
        hoursPerWeek: body.hoursPerWeek,
        targetCompanies: JSON.stringify(body.targetCompanies),
        targetRoles: JSON.stringify(body.targetRoles),
        difficultyPreference: body.difficultyPreference,
        learningStyle: body.learningStyle,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({ 
      message: 'Preferences updated successfully',
      preferences: body 
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
