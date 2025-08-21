/**
 * Simple Session Management for TayyariAI
 * 
 * This provides a lightweight session system without external dependencies,
 * perfect for open-source projects.
 */

import { cookies } from 'next/headers';
import { UserService } from '@/lib/database/services/userService';
import type { User } from '@/lib/database/schema';

const SESSION_COOKIE_NAME = 'tayyari-session';
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

export interface SessionUser {
  id: string;
  name: string;
  email?: string;
  role: string;
  experienceLevel: string;
  onboardingCompleted: boolean;
}

/**
 * Create a new session for a user
 */
export async function createSession(user: User): Promise<string> {
  const sessionData = {
    userId: user.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION,
  };

  // In a production app, you'd store this in Redis or a session store
  // For simplicity, we'll encode it in the cookie (with basic security)
  const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000, // Convert to seconds
    path: '/',
  });

  return sessionToken;
}

/**
 * Get the current session user
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return null;
    }

    // Decode session data
    const sessionData = JSON.parse(Buffer.from(sessionToken, 'base64').toString());
    
    // Check if session is expired
    if (Date.now() > sessionData.expiresAt) {
      await destroySession();
      return null;
    }

    // Get user from database
    const user = await UserService.getUserById(sessionData.userId);
    if (!user) {
      await destroySession();
      return null;
    }

    // Update user activity
    await UserService.updateActivity(user.id);

    return {
      id: user.id,
      name: user.name,
      email: user.email || undefined,
      role: user.role,
      experienceLevel: user.experienceLevel,
      onboardingCompleted: user.onboardingCompleted || false,
    };
  } catch (error) {
    console.error('Session error:', error);
    await destroySession();
    return null;
  }
}

/**
 * Destroy the current session
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getSessionUser();
  return user !== null;
}

/**
 * Require authentication (redirect if not authenticated)
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

/**
 * Check if user has completed onboarding
 */
export async function hasCompletedOnboarding(): Promise<boolean> {
  const user = await getSessionUser();
  return user?.onboardingCompleted || false;
}
