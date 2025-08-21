import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, return default settings
    // In a real app, you'd fetch from database
    const defaultSettings = {
      shareProgress: false,
      publicProfile: false,
      analyticsOptIn: true,
      dataRetention: '2years',
      anonymizeData: true,
      thirdPartySharing: false,
    };

    return NextResponse.json({ settings: defaultSettings });
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
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // In a real app, you'd save to database
    // For now, just return success
    console.log('Saving privacy settings:', body);

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
