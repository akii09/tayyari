import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { UserService } from '@/lib/database/services/userService';
import type { InterviewTypeKey } from '@/data/onboarding';

export interface OnboardingData {
  // Step 1: Basic info
  name: string;
  role: string;
  experienceLevel: string;
  
  // Step 2: Goals
  interviewType: InterviewTypeKey;
  targetDate: string; // ISO date string
  hoursPerWeek: number;
  
  // Step 3: Preferences
  preferences: Record<string, string>;
  
  // Additional computed data
  targetCompanies?: string[];
  targetRoles?: string[];
  currentSkills?: Record<string, number>;
  weakAreas?: string[];
  strongAreas?: string[];
}

/**
 * Save onboarding data
 * 
 * POST /api/onboarding
 * Body: OnboardingData
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body: OnboardingData = await request.json();
    
    // Validate required fields
    if (!body.name || !body.role || !body.experienceLevel || !body.interviewType) {
      return NextResponse.json(
        { error: 'Missing required onboarding data' },
        { status: 400 }
      );
    }

    // Compute additional data based on selections
    const computedData = computeOnboardingData(body);
    
    // Update user with onboarding data
    const success = await UserService.completeOnboarding(user.id, {
      name: body.name,
      role: body.role,
      experienceLevel: body.experienceLevel,
      targetDate: body.targetDate,
      hoursPerWeek: body.hoursPerWeek,
      
      // Store as JSON strings
      interviewTypes: JSON.stringify([body.interviewType]),
      targetCompanies: JSON.stringify(computedData.targetCompanies),
      targetRoles: JSON.stringify(computedData.targetRoles),
      currentSkills: JSON.stringify(computedData.currentSkills),
      weakAreas: JSON.stringify(computedData.weakAreas),
      strongAreas: JSON.stringify(computedData.strongAreas),
      notificationPreferences: JSON.stringify(body.preferences),
      
      // Computed preferences
      difficultyPreference: computedData.difficultyPreference,
      learningStyle: computedData.learningStyle,
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to save onboarding data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      roadmap: generateRoadmap(body.interviewType, body.hoursPerWeek),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Onboarding save error:', error);
    return NextResponse.json(
      { error: 'Failed to save onboarding data' },
      { status: 500 }
    );
  }
}

/**
 * Get user's onboarding data
 * 
 * GET /api/onboarding
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const userData = await UserService.getUserById(user.id);
    
    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields safely
    const interviewTypes = safeJsonParse(userData.interviewTypes, []);
    const targetCompanies = safeJsonParse(userData.targetCompanies, []);
    const targetRoles = safeJsonParse(userData.targetRoles, []);
    const currentSkills = safeJsonParse(userData.currentSkills, {});
    const weakAreas = safeJsonParse(userData.weakAreas, []);
    const strongAreas = safeJsonParse(userData.strongAreas, []);
    const preferences = safeJsonParse(userData.notificationPreferences, {});

    return NextResponse.json({
      success: true,
      data: {
        name: userData.name,
        role: userData.role,
        experienceLevel: userData.experienceLevel,
        interviewType: interviewTypes[0] || 'dsa',
        targetDate: userData.targetDate,
        hoursPerWeek: userData.hoursPerWeek,
        preferences,
        targetCompanies,
        targetRoles,
        currentSkills,
        weakAreas,
        strongAreas,
        onboardingCompleted: userData.onboardingCompleted,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Get onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to get onboarding data' },
      { status: 500 }
    );
  }
}

/**
 * Compute additional onboarding data based on user selections
 */
function computeOnboardingData(data: OnboardingData) {
  // Default target companies based on experience level
  const targetCompanies = data.experienceLevel === 'beginner' 
    ? ['Startups', 'Mid-size companies', 'Growing tech companies']
    : data.experienceLevel === 'intermediate'
    ? ['Google', 'Meta', 'Microsoft', 'Amazon', 'Apple']
    : ['Google', 'Meta', 'Netflix', 'Uber', 'Airbnb', 'Stripe'];

  // Default target roles based on current role
  const targetRoles = data.role === 'student'
    ? ['Software Engineer', 'Frontend Developer', 'Backend Developer']
    : data.role === 'working'
    ? ['Senior Software Engineer', 'Staff Engineer', 'Principal Engineer']
    : ['Software Engineer', 'Full Stack Developer', 'Product Engineer'];

  // Initial skill assessment based on experience and interview type
  const currentSkills: Record<string, number> = {};
  if (data.interviewType === 'dsa' || data.interviewType === 'full') {
    currentSkills.algorithms = data.experienceLevel === 'beginner' ? 4 : data.experienceLevel === 'intermediate' ? 6 : 8;
    currentSkills.data_structures = data.experienceLevel === 'beginner' ? 4 : data.experienceLevel === 'intermediate' ? 6 : 8;
    currentSkills.problem_solving = data.experienceLevel === 'beginner' ? 5 : data.experienceLevel === 'intermediate' ? 7 : 8;
  }
  if (data.interviewType === 'system' || data.interviewType === 'full') {
    currentSkills.system_design = data.experienceLevel === 'beginner' ? 3 : data.experienceLevel === 'intermediate' ? 5 : 7;
    currentSkills.scalability = data.experienceLevel === 'beginner' ? 3 : data.experienceLevel === 'intermediate' ? 5 : 7;
  }
  if (data.interviewType === 'behavioral' || data.interviewType === 'full') {
    currentSkills.communication = data.experienceLevel === 'beginner' ? 6 : data.experienceLevel === 'intermediate' ? 7 : 8;
    currentSkills.leadership = data.experienceLevel === 'beginner' ? 4 : data.experienceLevel === 'intermediate' ? 6 : 8;
  }

  // Weak areas to focus on
  const weakAreas = [];
  if (data.interviewType === 'dsa' || data.interviewType === 'full') {
    weakAreas.push('advanced_algorithms', 'dynamic_programming', 'graph_algorithms');
  }
  if (data.interviewType === 'system' || data.interviewType === 'full') {
    weakAreas.push('distributed_systems', 'database_design', 'caching_strategies');
  }
  if (data.interviewType === 'behavioral' || data.interviewType === 'full') {
    weakAreas.push('leadership_stories', 'conflict_resolution', 'failure_handling');
  }

  // Strong areas based on experience
  const strongAreas = [];
  if (data.role === 'working') {
    strongAreas.push('practical_experience', 'project_management', 'code_review');
  }
  if (data.experienceLevel === 'advanced') {
    strongAreas.push('architecture_design', 'mentoring', 'technical_leadership');
  }

  // Preferences
  const difficultyPreference = data.preferences.difficulty?.toLowerCase() || 'medium';
  const learningStyle = data.experienceLevel === 'beginner' ? 'visual' : 'hands-on';

  return {
    targetCompanies,
    targetRoles,
    currentSkills,
    weakAreas,
    strongAreas,
    difficultyPreference,
    learningStyle,
  };
}

/**
 * Generate a personalized roadmap based on interview type and time commitment
 */
function generateRoadmap(interviewType: InterviewTypeKey, hoursPerWeek: number) {
  const weeksToTarget = 8; // Default 8-week plan
  const totalHours = hoursPerWeek * weeksToTarget;
  
  const roadmaps = {
    dsa: [
      { title: 'Arrays & String Manipulation', timeAllocation: '25%', description: 'Master basic data structures' },
      { title: 'Trees & Graph Traversal', timeAllocation: '30%', description: 'Learn DFS, BFS, and tree algorithms' },
      { title: 'Dynamic Programming', timeAllocation: '25%', description: 'Solve optimization problems' },
      { title: 'Advanced Topics & Mock', timeAllocation: '20%', description: 'System-specific questions and practice' },
    ],
    system: [
      { title: 'System Design Fundamentals', timeAllocation: '30%', description: 'Scalability, reliability, consistency' },
      { title: 'Database & Storage', timeAllocation: '25%', description: 'SQL, NoSQL, caching strategies' },
      { title: 'Distributed Systems', timeAllocation: '25%', description: 'Load balancing, microservices' },
      { title: 'Design Practice', timeAllocation: '20%', description: 'End-to-end system designs' },
    ],
    behavioral: [
      { title: 'STAR Method & Stories', timeAllocation: '35%', description: 'Structure compelling experiences' },
      { title: 'Leadership & Impact', timeAllocation: '30%', description: 'Showcase influence and growth' },
      { title: 'Culture & Values Fit', timeAllocation: '20%', description: 'Company-specific preparation' },
      { title: 'Mock Interviews', timeAllocation: '15%', description: 'Practice with feedback' },
    ],
    full: [
      { title: 'DSA Foundation', timeAllocation: '35%', description: 'Core algorithms and data structures' },
      { title: 'System Design Basics', timeAllocation: '30%', description: 'High-level architecture skills' },
      { title: 'Behavioral Preparation', timeAllocation: '20%', description: 'Leadership and experience stories' },
      { title: 'Integrated Practice', timeAllocation: '15%', description: 'Full interview simulations' },
    ],
  };

  return {
    type: interviewType,
    totalWeeks: weeksToTarget,
    hoursPerWeek,
    totalHours,
    phases: roadmaps[interviewType] || roadmaps.dsa,
  };
}

/**
 * Safely parse JSON with fallback
 */
function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}
