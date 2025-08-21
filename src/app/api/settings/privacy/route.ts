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
        shareProgress: false,
        publicProfile: false,
        analyticsOptIn: true,
        dataRetention: '2years',
        anonymizeData: true,
        thirdPartySharing: false,
      };

      await db.insert(userSettings).values(defaultSettings);
      
      return NextResponse.json({ settings: defaultSettings });
    }

    const userSetting = settings[0];
    const privacySettings = {
      shareProgress: userSetting.shareProgress,
      publicProfile: userSetting.publicProfile,
      analyticsOptIn: userSetting.analyticsOptIn,
      dataRetention: userSetting.dataRetention || '2years',
      anonymizeData: userSetting.anonymizeData,
      thirdPartySharing: userSetting.thirdPartySharing,
    };

    return NextResponse.json({ settings: privacySettings });
  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch privacy settings' },
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
    
    // Update privacy settings in database
    await db
      .update(userSettings)
      .set({
        shareProgress: body.shareProgress,
        publicProfile: body.publicProfile,
        analyticsOptIn: body.analyticsOptIn,
        dataRetention: body.dataRetention,
        anonymizeData: body.anonymizeData,
        thirdPartySharing: body.thirdPartySharing,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userSettings.userId, user.id));

    return NextResponse.json({ 
      message: 'Privacy settings updated successfully',
      settings: body 
    });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    return NextResponse.json(
      { error: 'Failed to update privacy settings' },
      { status: 500 }
    );
  }
}
