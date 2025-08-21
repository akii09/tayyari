import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';

/**
 * Get current user endpoint
 * 
 * GET /api/auth/me
 * Returns current session user or null
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}
