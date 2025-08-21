import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/database/services/userService';
import { createSession } from '@/lib/auth/session';

/**
 * Simple login endpoint
 * 
 * POST /api/auth/login
 * Body: { name: string, email?: string }
 * 
 * Creates a new user if doesn't exist, or logs in existing user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name is required and must be at least 2 characters' },
        { status: 400 }
      );
    }

    // For demo purposes, we'll create a user with minimal info
    // In production, you'd have proper authentication
    let user;
    
    if (email) {
      // Try to find existing user by email
      const users = await UserService.getAllUsers(100);
      user = users.find(u => u.email === email);
    }

    if (!user) {
      // Create new user with default values
      user = await UserService.createUser({
        name: name.trim(),
        email: email || undefined,
        role: 'working', // Default role
        experienceLevel: 'intermediate', // Default level
        hoursPerWeek: 8, // Default hours
        onboardingCompleted: false,
      });
    }

    // Create session
    await createSession(user);

    return NextResponse.json({
      success: true,
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
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
