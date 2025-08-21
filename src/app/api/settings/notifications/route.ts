import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getDb } from '@/lib/database/utils';
import { userSettings } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    
    // Get user settings from database
    const settings = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, user.id))
      .limit(1);

    if (settings.length === 0) {
      // Create default settings if none exist
      const defaultSettings = {
        userId: user.id,
        emailNotifications: true,
        pushNotifications: true,
        weeklyReports: true,
        reminderTime: '18:00',
        studyReminders: true,
        progressUpdates: true,
        newFeatures: false,
        marketingEmails: false,
      };

      await db.insert(userSettings).values(defaultSettings);
      
      return NextResponse.json({ settings: defaultSettings });
    }

    const userSetting = settings[0];
    const notificationSettings = {
      emailNotifications: userSetting.emailNotifications,
      pushNotifications: userSetting.pushNotifications,
      weeklyReports: userSetting.weeklyReports,
      reminderTime: userSetting.reminderTime || '18:00',
      studyReminders: userSetting.studyReminders,
      progressUpdates: userSetting.progressUpdates,
      newFeatures: userSetting.newFeatures,
      marketingEmails: userSetting.marketingEmails,
    };

    return NextResponse.json({ settings: notificationSettings });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const db = getDb();
    
    // Update notification settings in database
    await db
      .update(userSettings)
      .set({
        emailNotifications: body.emailNotifications,
        pushNotifications: body.pushNotifications,
        weeklyReports: body.weeklyReports,
        reminderTime: body.reminderTime,
        studyReminders: body.studyReminders,
        progressUpdates: body.progressUpdates,
        newFeatures: body.newFeatures,
        marketingEmails: body.marketingEmails,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userSettings.userId, user.id));

    return NextResponse.json({ 
      message: 'Notification settings updated successfully',
      settings: body 
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return NextResponse.json(
      { error: 'Failed to update notification settings' },
      { status: 500 }
    );
  }
}
