import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/database/services/userService';
import { createSession } from '@/lib/auth/session';

/**
 * Authentication endpoint - handles both login and registration
 * 
 * POST /api/auth/login
 * Body: { name: string, email: string }
 * 
 * If email exists: Logs in existing user
 * If email doesn't exist: Creates new user account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name is required and must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // Check if user already exists with this email
    let user = await UserService.getUserByEmail(trimmedEmail);

    if (user) {
      // User exists - log them in
      console.log(`🔐 User logged in: ${user.name} (${trimmedEmail})`);
      
      // Update last active date
      await UserService.updateActivity(user.id);
    } else {
      // User doesn't exist - create new account
      console.log(`👤 Creating new user: ${trimmedName} (${trimmedEmail})`);
      
      user = await UserService.createUser({
        name: trimmedName,
        email: trimmedEmail,
        role: 'Software Engineer', // Default role
        experienceLevel: 'Intermediate', // Default level
        hoursPerWeek: 8, // Default hours
        onboardingCompleted: false,
      });
    }

    // Create session for the user
    await createSession(user);

    return NextResponse.json({
      success: true,
      isNewUser: !user.onboardingCompleted,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        experienceLevel: user.experienceLevel,
        onboardingCompleted: user.onboardingCompleted,
      },
    });
  } catch (error) {
    console.error('Authentication error:', error);
    
    // Handle specific database errors
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Authentication failed. Please try again.' },
      { status: 500 }
    );
  }
}
