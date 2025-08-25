import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { LearningConceptService } from '@/lib/database/services/learningConceptService';

/**
 * Get user's learning concepts
 * GET /api/concepts?activeOnly=true
 */
export async function GET(request: NextRequest) {
  try {
    // Temporarily skip auth for testing
    const testUserId = 'test-user-123';
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    
    // Create some test concepts if none exist
    const existingConcepts = await LearningConceptService.getUserConcepts(testUserId, false);
    if (existingConcepts.length === 0) {
      await createTestConcepts(testUserId);
    }
    
    const concepts = await LearningConceptService.getUserConcepts(testUserId, activeOnly);
    
    return NextResponse.json({
      success: true,
      concepts: concepts.map(concept => ({
        id: concept.id,
        name: concept.name,
        description: concept.description,
        category: concept.category,
        difficulty: concept.difficulty,
        estimatedHours: concept.estimatedHours,
        completionPercentage: concept.completionPercentage || 0,
        currentModule: concept.currentModule,
        timeSpent: concept.timeSpent || 0,
        lastStudied: concept.lastStudied,
        isActive: concept.isActive,
        prerequisites: concept.prerequisites ? JSON.parse(concept.prerequisites) : [],
        learningObjectives: concept.learningObjectives ? JSON.parse(concept.learningObjectives) : [],
        customPrompts: concept.customPrompts ? JSON.parse(concept.customPrompts) : [],
        createdAt: concept.createdAt,
        updatedAt: concept.updatedAt,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Get concepts error:', error);
    return NextResponse.json(
      { error: 'Failed to get concepts' },
      { status: 500 }
    );
  }
}

/**
 * Create a new learning concept
 * POST /api/concepts
 */
export async function POST(request: NextRequest) {
  try {
    // Temporarily skip auth for testing
    const testUserId = 'test-user-123';
    const body = await request.json();
    
    if (!body.name || !body.category || !body.difficulty) {
      return NextResponse.json(
        { error: 'Name, category, and difficulty are required' },
        { status: 400 }
      );
    }
    
    const concept = await LearningConceptService.createUserConcept(testUserId, {
      name: body.name,
      description: body.description || '',
      category: body.category,
      difficulty: body.difficulty,
      estimatedHours: body.estimatedHours || 40,
      prerequisites: body.prerequisites ? JSON.stringify(body.prerequisites) : null,
      learningObjectives: body.learningObjectives ? JSON.stringify(body.learningObjectives) : null,
      customPrompts: body.customPrompts ? JSON.stringify(body.customPrompts) : null,
      isActive: body.isActive !== false, // Default to true
    });
    
    return NextResponse.json({
      success: true,
      concept: {
        id: concept.id,
        name: concept.name,
        description: concept.description,
        category: concept.category,
        difficulty: concept.difficulty,
        estimatedHours: concept.estimatedHours,
        completionPercentage: concept.completionPercentage || 0,
        isActive: concept.isActive,
        createdAt: concept.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Create concept error:', error);
    return NextResponse.json(
      { error: 'Failed to create concept' },
      { status: 500 }
    );
  }
}

/**
 * Create test concepts for demo purposes
 */
async function createTestConcepts(userId: string) {
  const testConcepts = [
    {
      name: 'JavaScript Fundamentals',
      description: 'Learn the core concepts of JavaScript programming',
      category: 'programming',
      difficulty: 'beginner',
      estimatedHours: 40,
      completionPercentage: 75,
      isActive: true,
      learningObjectives: ['Variables and data types', 'Functions and scope', 'Objects and arrays', 'DOM manipulation'],
    },
    {
      name: 'React Development',
      description: 'Build modern web applications with React',
      category: 'programming',
      difficulty: 'intermediate',
      estimatedHours: 60,
      completionPercentage: 45,
      isActive: true,
      learningObjectives: ['Components and JSX', 'State management', 'Hooks', 'Routing'],
    },
    {
      name: 'Data Structures & Algorithms',
      description: 'Master fundamental data structures and algorithms',
      category: 'computer-science',
      difficulty: 'intermediate',
      estimatedHours: 80,
      completionPercentage: 30,
      isActive: true,
      learningObjectives: ['Arrays and strings', 'Linked lists', 'Trees and graphs', 'Sorting algorithms'],
    },
    {
      name: 'System Design',
      description: 'Learn to design scalable distributed systems',
      category: 'system-design',
      difficulty: 'advanced',
      estimatedHours: 100,
      completionPercentage: 15,
      isActive: false,
      learningObjectives: ['Scalability patterns', 'Database design', 'Caching strategies', 'Load balancing'],
    },
  ];

  for (const conceptData of testConcepts) {
    try {
      await LearningConceptService.createUserConcept(userId, {
        name: conceptData.name,
        description: conceptData.description,
        category: conceptData.category,
        difficulty: conceptData.difficulty,
        estimatedHours: conceptData.estimatedHours,
        completionPercentage: conceptData.completionPercentage,
        isActive: conceptData.isActive,
        learningObjectives: JSON.stringify(conceptData.learningObjectives),
        timeSpent: Math.floor(conceptData.completionPercentage * conceptData.estimatedHours / 100),
        lastStudied: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Failed to create test concept ${conceptData.name}:`, error);
    }
  }
}