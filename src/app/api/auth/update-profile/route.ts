import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';

export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // In a real app, you'd update user data in database
    // For now, just return success
    console.log('Updating profile for user:', user.email, 'with data:', body);

    return NextResponse.json({ 
      message: 'Profile updated successfully',
      user: {
        ...user,
        ...body,
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
