import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getDb } from '@/lib/database/utils';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, return default settings
    // In a real app, you'd fetch from database
    const defaultSettings = {
      emailNotifications: true,
      pushNotifications: true,
      weeklyReports: true,
      reminderTime: '18:00',
      studyReminders: true,
      progressUpdates: true,
      newFeatures: false,
      marketingEmails: false,
    };

    return NextResponse.json({ settings: defaultSettings });
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
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // In a real app, you'd save to database
    // For now, just return success
    console.log('Saving notification settings:', body);

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
