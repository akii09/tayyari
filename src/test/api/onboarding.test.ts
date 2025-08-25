/**
 * Onboarding API Tests
 * Tests the onboarding API functionality without authentication requirement
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '../../app/api/onboarding/route';
import { NextRequest } from 'next/server';

// Mock the dependencies
vi.mock('../../lib/auth/session', () => ({
  requireAuth: vi.fn().mockRejectedValue(new Error('Authentication required')),
  createSession: vi.fn().mockResolvedValue('mock-session-token'),
}));

vi.mock('../../lib/database/services/userService', () => ({
  UserService: {
    createUser: vi.fn().mockResolvedValue({
      id: 'test-user-id',
      name: 'Test User',
      role: 'developer',
      experienceLevel: 'intermediate',
      hoursPerWeek: 10,
      onboardingCompleted: false,
    }),
  },
}));

vi.mock('../../lib/database/services/onboardingManager', () => ({
  OnboardingManager: {
    startOnboarding: vi.fn().mockResolvedValue({
      id: 'session-id',
      userId: 'test-user-id',
      currentStep: 'profile',
    }),
    completeOnboarding: vi.fn().mockResolvedValue({
      user: {
        id: 'test-user-id',
        name: 'Test User',
        onboardingCompleted: true,
      },
      concepts: [],
      learningPlan: null,
    }),
  },
}));

describe('Onboarding API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/onboarding', () => {
    it('should create new user and complete onboarding without authentication', async () => {
      const requestBody = {
        name: 'Test User',
        role: 'developer',
        experienceLevel: 'intermediate',
        hoursPerWeek: 10,
        selectedConcepts: ['javascript', 'react'],
        preferences: {
          difficulty: 'medium',
          learningStyle: 'hands-on',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Onboarding completed successfully');
      expect(result.user).toBeDefined();
      expect(result.user.onboardingCompleted).toBe(true);
    });

    it('should handle missing required fields', async () => {
      const requestBody = {
        // Missing name, role, experienceLevel
        hoursPerWeek: 10,
      };

      const request = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Missing required onboarding data');
    });

    it('should consolidate preferences from step 3 data', async () => {
      const OnboardingManager = require('../../lib/database/services/onboardingManager').OnboardingManager;
      
      const requestBody = {
        name: 'Test User',
        role: 'developer',
        experienceLevel: 'beginner', // This should influence preferences
        hoursPerWeek: 5,
        selectedConcepts: [],
        skipConceptSelection: true,
      };

      const request = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      
      // Check that completeOnboarding was called with consolidated preferences
      expect(OnboardingManager.completeOnboarding).toHaveBeenCalledWith(
        'session-id',
        expect.objectContaining({
          name: 'Test User',
          role: 'developer',
          experienceLevel: 'beginner',
          skipConceptSelection: true,
          notificationPreferences: expect.objectContaining({
            difficulty: 'easy', // Should be 'easy' for beginner
            learningStyle: 'visual', // Should be 'visual' for beginner
            studyReminders: true,
            weeklyReports: true,
          }),
        })
      );
    });

    it('should handle advanced user preferences correctly', async () => {
      const OnboardingManager = require('../../lib/database/services/onboardingManager').OnboardingManager;
      
      const requestBody = {
        name: 'Advanced User',
        role: 'senior-developer',
        experienceLevel: 'advanced',
        hoursPerWeek: 15,
        selectedConcepts: ['system-design', 'algorithms'],
      };

      const request = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      
      // Check that preferences are set correctly for advanced user
      expect(OnboardingManager.completeOnboarding).toHaveBeenCalledWith(
        'session-id',
        expect.objectContaining({
          notificationPreferences: expect.objectContaining({
            difficulty: 'hard', // Should be 'hard' for advanced
            learningStyle: 'hands-on', // Should be 'hands-on' for advanced
          }),
        })
      );
    });
  });
});