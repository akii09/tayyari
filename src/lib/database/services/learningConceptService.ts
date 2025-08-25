import { eq, desc, and, sql, inArray, or } from 'drizzle-orm';
import { db } from '../config';
import { 
  learningConcepts, 
  users,
  userProgress,
  milestones,
  type LearningConcept, 
  type NewLearningConcept,
  type User,
  type Milestone,
  type NewMilestone
} from '../schema';

// Types for learning concept management
export interface ConceptProgress {
  completionPercentage: number;
  currentModule: string;
  timeSpent: number;
  lastStudied: Date | null;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  achievedAt: Date | null;
  isCompleted: boolean;
  requiredProgress: number;
}

export interface ConceptPrompt {
  type: 'system' | 'instruction' | 'example';
  content: string;
  priority: number;
}

export interface ConceptRelationship {
  conceptId: string;
  relatedConceptId: string;
  relationshipType: 'prerequisite' | 'complementary' | 'advanced' | 'interdisciplinary';
  strength: number; // 0-1 scale
}

export interface UserAnalytics {
  userId: string;
  totalConcepts: number;
  activeConcepts: number;
  completedConcepts: number;
  averageProgress: number;
  totalTimeSpent: number;
  conceptsWithMilestones: number;
  learningVelocity: number; // progress per hour
  strongestConcepts: string[];
  strugglingConcepts: string[];
  interdisciplinaryConnections: number;
}

export interface CrossConceptInsight {
  primaryConceptId: string;
  relatedConceptId: string;
  connectionType: string;
  relevanceScore: number;
  suggestedIntegration: string;
}

export class LearningConceptService {
  // Milestone Management Methods
  
  /**
   * Get milestones for a concept
   */
  static async getConceptMilestones(conceptId: string): Promise<Milestone[]> {
    try {
      return await db
        .select()
        .from(milestones)
        .where(eq(milestones.conceptId, conceptId))
        .orderBy(milestones.priority, milestones.createdAt);
    } catch (error) {
      console.error('Error getting concept milestones:', error);
      return [];
    }
  }

  /**
   * Create a milestone for a concept
   */
  static async createMilestone(milestoneData: NewMilestone): Promise<Milestone> {
    try {
      const [milestone] = await db
        .insert(milestones)
        .values(milestoneData)
        .returning();
      return milestone;
    } catch (error) {
      console.error('Error creating milestone:', error);
      throw new Error('Failed to create milestone');
    }
  }

  /**
   * Update milestone progress
   */
  static async updateMilestoneProgress(
    milestoneId: string, 
    currentValue: number, 
    isCompleted?: boolean
  ): Promise<boolean> {
    try {
      const updateData: any = { 
        currentValue,
        updatedAt: new Date().toISOString()
      };
      
      if (isCompleted !== undefined) {
        updateData.isCompleted = isCompleted;
        if (isCompleted) {
          updateData.completedAt = new Date().toISOString();
        }
      }

      await db
        .update(milestones)
        .set(updateData)
        .where(eq(milestones.id, milestoneId));
      
      return true;
    } catch (error) {
      console.error('Error updating milestone progress:', error);
      return false;
    }
  }

  /**
   * Check and create default milestones for a concept
   */
  static async createDefaultMilestones(conceptId: string, userId: string, category: string): Promise<void> {
    try {
      const defaultMilestones = this.getDefaultMilestonesForCategory(category);
      
      for (const milestone of defaultMilestones) {
        await this.createMilestone({
          conceptId,
          userId,
          name: milestone.name,
          description: milestone.description,
          type: milestone.type,
          targetValue: milestone.targetValue,
          priority: milestone.priority,
        });
      }
    } catch (error) {
      console.error('Error creating default milestones:', error);
    }
  }

  /**
   * Get count of concepts with milestones for a user
   */
  static async getConceptsWithMilestonesCount(userId: string): Promise<number> {
    try {
      const result = await db
        .select({ conceptId: milestones.conceptId })
        .from(milestones)
        .where(eq(milestones.userId, userId))
        .groupBy(milestones.conceptId);
      
      return result.length;
    } catch (error) {
      console.error('Error getting concepts with milestones count:', error);
      return 0;
    }
  }

  /**
   * Get default milestones for a category
   */
  private static getDefaultMilestonesForCategory(category: string) {
    const commonMilestones = [
      {
        name: 'Getting Started',
        description: 'Complete the first learning session',
        type: 'progress',
        targetValue: 1,
        priority: 1,
      },
      {
        name: 'First Week',
        description: 'Study for 7 days',
        type: 'achievement',
        targetValue: 7,
        priority: 2,
      },
      {
        name: 'Halfway Point',
        description: 'Reach 50% completion',
        type: 'progress',
        targetValue: 50,
        priority: 2,
      },
      {
        name: 'Mastery',
        description: 'Complete the entire concept',
        type: 'completion',
        targetValue: 100,
        priority: 1,
      },
    ];

    // Add category-specific milestones
    const categoryMilestones: Record<string, any[]> = {
      'programming': [
        {
          name: 'First Code',
          description: 'Write your first program',
          type: 'skill',
          targetValue: 1,
          priority: 1,
        },
        {
          name: 'Problem Solver',
          description: 'Solve 10 coding problems',
          type: 'achievement',
          targetValue: 10,
          priority: 2,
        },
      ],
      'system-design': [
        {
          name: 'Architecture Basics',
          description: 'Learn fundamental architecture patterns',
          type: 'skill',
          targetValue: 5,
          priority: 1,
        },
      ],
    };

    return [...commonMilestones, ...(categoryMilestones[category] || [])];
  }

  // CRUD Operations
  
  /**
   * Create a new learning concept for a user (convenience method)
   */
  static async createUserConcept(userId: string, conceptData: Omit<NewLearningConcept, 'userId'>): Promise<LearningConcept> {
    return this.createConcept({
      ...conceptData,
      userId,
    });
  }

  /**
   * Create a new learning concept for a user
   */
  static async createConcept(conceptData: NewLearningConcept): Promise<LearningConcept> {
    try {
      // Validate prerequisites exist
      if (conceptData.prerequisites) {
        const prereqIds = JSON.parse(conceptData.prerequisites);
        if (prereqIds.length > 0) {
          const existingPrereqs = await db
            .select({ id: learningConcepts.id })
            .from(learningConcepts)
            .where(inArray(learningConcepts.id, prereqIds));
          
          if (existingPrereqs.length !== prereqIds.length) {
            throw new Error('Some prerequisite concepts do not exist');
          }
        }
      }

      const [newConcept] = await db.insert(learningConcepts).values({
        ...conceptData,
        createdAt: sql`(datetime('now'))`,
        updatedAt: sql`(datetime('now'))`,
      }).returning();

      // Create default milestones for the concept
      await this.createDefaultMilestones(newConcept.id, newConcept.userId, newConcept.category);

      console.log(`✅ Learning concept created: ${newConcept.name} for user ${newConcept.userId}`);
      return newConcept;
    } catch (error) {
      console.error('❌ Error creating learning concept:', error);
      throw new Error('Failed to create learning concept');
    }
  }

  /**
   * Get all learning concepts for a user
   */
  static async getUserConcepts(userId: string, activeOnly: boolean = false): Promise<LearningConcept[]> {
    try {
      const query = db
        .select()
        .from(learningConcepts)
        .where(eq(learningConcepts.userId, userId));

      if (activeOnly) {
        query.where(and(
          eq(learningConcepts.userId, userId),
          eq(learningConcepts.isActive, true)
        ));
      }

      return await query.orderBy(desc(learningConcepts.lastStudied), desc(learningConcepts.createdAt));
    } catch (error) {
      console.error('❌ Error fetching user concepts:', error);
      return [];
    }
  }

  /**
   * Get a specific learning concept by ID
   */
  static async getConceptById(conceptId: string): Promise<LearningConcept | null> {
    try {
      const [concept] = await db
        .select()
        .from(learningConcepts)
        .where(eq(learningConcepts.id, conceptId))
        .limit(1);

      return concept || null;
    } catch (error) {
      console.error('❌ Error fetching concept:', error);
      return null;
    }
  }

  /**
   * Update a learning concept
   */
  static async updateConcept(conceptId: string, updates: Partial<LearningConcept>): Promise<boolean> {
    try {
      await db
        .update(learningConcepts)
        .set({
          ...updates,
          updatedAt: sql`(datetime('now'))`,
        })
        .where(eq(learningConcepts.id, conceptId));

      console.log(`✅ Learning concept updated: ${conceptId}`);
      return true;
    } catch (error) {
      console.error('❌ Error updating learning concept:', error);
      return false;
    }
  }

  /**
   * Delete a learning concept
   */
  static async deleteConcept(conceptId: string): Promise<boolean> {
    try {
      await db.delete(learningConcepts).where(eq(learningConcepts.id, conceptId));
      console.log(`✅ Learning concept deleted: ${conceptId}`);
      return true;
    } catch (error) {
      console.error('❌ Error deleting learning concept:', error);
      return false;
    }
  }

  // Progress Tracking

  /**
   * Update progress for a learning concept
   */
  static async updateProgress(
    conceptId: string, 
    progressData: {
      completionPercentage?: number;
      currentModule?: string;
      timeSpent?: number;
      milestones?: Milestone[];
    }
  ): Promise<boolean> {
    try {
      const concept = await this.getConceptById(conceptId);
      if (!concept) {
        throw new Error('Concept not found');
      }

      const updates: Partial<LearningConcept> = {
        lastStudied: new Date().toISOString(),
      };

      if (progressData.completionPercentage !== undefined) {
        updates.completionPercentage = progressData.completionPercentage;
      }

      if (progressData.currentModule) {
        updates.currentModule = progressData.currentModule;
      }

      if (progressData.timeSpent !== undefined) {
        updates.timeSpent = (concept.timeSpent || 0) + progressData.timeSpent;
      }

      await this.updateConcept(conceptId, updates);

      // Check for milestone achievements
      if (progressData.milestones) {
        await this.checkMilestoneAchievements(conceptId, progressData.milestones);
      }

      return true;
    } catch (error) {
      console.error('❌ Error updating concept progress:', error);
      return false;
    }
  }

  /**
   * Get detailed progress for a concept
   */
  static async getConceptProgress(conceptId: string): Promise<ConceptProgress | null> {
    try {
      const concept = await this.getConceptById(conceptId);
      if (!concept) return null;

      return {
        completionPercentage: concept.completionPercentage || 0,
        currentModule: concept.currentModule || '',
        timeSpent: concept.timeSpent || 0,
        lastStudied: concept.lastStudied ? new Date(concept.lastStudied) : null,
        milestones: await this.getConceptMilestones(conceptId),
      };
    } catch (error) {
      console.error('❌ Error fetching concept progress:', error);
      return null;
    }
  }

  // Prerequisite Validation

  /**
   * Validate if user meets prerequisites for a concept
   */
  static async validatePrerequisites(userId: string, conceptId: string): Promise<{
    isValid: boolean;
    missingPrerequisites: string[];
    completedPrerequisites: string[];
  }> {
    try {
      const concept = await this.getConceptById(conceptId);
      if (!concept || !concept.prerequisites) {
        return { isValid: true, missingPrerequisites: [], completedPrerequisites: [] };
      }

      const prerequisiteIds = JSON.parse(concept.prerequisites);
      if (prerequisiteIds.length === 0) {
        return { isValid: true, missingPrerequisites: [], completedPrerequisites: [] };
      }

      const userConcepts = await this.getUserConcepts(userId);
      const userConceptMap = new Map(userConcepts.map(c => [c.id, c]));

      const missingPrerequisites: string[] = [];
      const completedPrerequisites: string[] = [];

      for (const prereqId of prerequisiteIds) {
        const userConcept = userConceptMap.get(prereqId);
        if (!userConcept || (userConcept.completionPercentage || 0) < 80) {
          missingPrerequisites.push(prereqId);
        } else {
          completedPrerequisites.push(prereqId);
        }
      }

      return {
        isValid: missingPrerequisites.length === 0,
        missingPrerequisites,
        completedPrerequisites,
      };
    } catch (error) {
      console.error('❌ Error validating prerequisites:', error);
      return { isValid: false, missingPrerequisites: [], completedPrerequisites: [] };
    }
  }

  /**
   * Get concept relationships and dependencies
   */
  static async getConceptRelationships(conceptId: string): Promise<ConceptRelationship[]> {
    try {
      const concept = await this.getConceptById(conceptId);
      if (!concept) return [];

      const relationships: ConceptRelationship[] = [];

      // Add prerequisite relationships
      if (concept.prerequisites) {
        const prereqIds = JSON.parse(concept.prerequisites);
        for (const prereqId of prereqIds) {
          relationships.push({
            conceptId,
            relatedConceptId: prereqId,
            relationshipType: 'prerequisite',
            strength: 0.9,
          });
        }
      }

      // Find concepts that have this concept as a prerequisite
      const dependentConcepts = await db
        .select()
        .from(learningConcepts)
        .where(sql`json_extract(prerequisites, '$') LIKE '%${conceptId}%'`);

      for (const dependent of dependentConcepts) {
        relationships.push({
          conceptId,
          relatedConceptId: dependent.id,
          relationshipType: 'advanced',
          strength: 0.8,
        });
      }

      return relationships;
    } catch (error) {
      console.error('❌ Error fetching concept relationships:', error);
      return [];
    }
  }

  // Cross-Concept Learning Integration

  /**
   * Find interdisciplinary connections between concepts
   */
  static async findInterdisciplinaryConnections(userId: string): Promise<CrossConceptInsight[]> {
    try {
      const userConcepts = await this.getUserConcepts(userId, true);
      const insights: CrossConceptInsight[] = [];

      // Simple keyword-based connection detection
      const connectionKeywords = {
        'programming': ['algorithm', 'data structure', 'coding', 'software'],
        'mathematics': ['calculus', 'algebra', 'statistics', 'geometry'],
        'science': ['physics', 'chemistry', 'biology', 'research'],
        'business': ['management', 'strategy', 'finance', 'marketing'],
        'design': ['ui', 'ux', 'visual', 'creative'],
      };

      for (let i = 0; i < userConcepts.length; i++) {
        for (let j = i + 1; j < userConcepts.length; j++) {
          const concept1 = userConcepts[i];
          const concept2 = userConcepts[j];

          // Check for category overlap
          if (concept1.category === concept2.category) {
            insights.push({
              primaryConceptId: concept1.id,
              relatedConceptId: concept2.id,
              connectionType: 'same_category',
              relevanceScore: 0.7,
              suggestedIntegration: `Both concepts are in ${concept1.category}. Consider combining exercises or projects.`,
            });
          }

          // Check for keyword connections
          const concept1Text = `${concept1.name} ${concept1.description}`.toLowerCase();
          const concept2Text = `${concept2.name} ${concept2.description}`.toLowerCase();

          for (const [domain, keywords] of Object.entries(connectionKeywords)) {
            const concept1Matches = keywords.filter(keyword => concept1Text.includes(keyword));
            const concept2Matches = keywords.filter(keyword => concept2Text.includes(keyword));

            if (concept1Matches.length > 0 && concept2Matches.length > 0) {
              insights.push({
                primaryConceptId: concept1.id,
                relatedConceptId: concept2.id,
                connectionType: 'keyword_overlap',
                relevanceScore: 0.6,
                suggestedIntegration: `Both concepts relate to ${domain}. Consider cross-referencing examples.`,
              });
            }
          }
        }
      }

      return insights.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      console.error('❌ Error finding interdisciplinary connections:', error);
      return [];
    }
  }

  /**
   * Update cross-concept knowledge based on progress
   */
  static async updateCrossConceptKnowledge(userId: string, conceptId: string, newKnowledge: string): Promise<void> {
    try {
      const insights = await this.findInterdisciplinaryConnections(userId);
      const relatedConcepts = insights
        .filter(insight => insight.primaryConceptId === conceptId || insight.relatedConceptId === conceptId)
        .map(insight => insight.primaryConceptId === conceptId ? insight.relatedConceptId : insight.primaryConceptId);

      // Update related concepts with cross-reference knowledge
      for (const relatedConceptId of relatedConcepts) {
        const relatedConcept = await this.getConceptById(relatedConceptId);
        if (relatedConcept) {
          const currentPrompts = relatedConcept.customPrompts ? JSON.parse(relatedConcept.customPrompts) : [];
          const crossReferencePrompt: ConceptPrompt = {
            type: 'instruction',
            content: `Cross-reference: ${newKnowledge}`,
            priority: 3,
          };

          currentPrompts.push(crossReferencePrompt);
          await this.updateConcept(relatedConceptId, {
            customPrompts: JSON.stringify(currentPrompts),
          });
        }
      }

      console.log(`✅ Cross-concept knowledge updated for concept ${conceptId}`);
    } catch (error) {
      console.error('❌ Error updating cross-concept knowledge:', error);
    }
  }

  // User Analytics

  /**
   * Generate comprehensive user analytics for multi-concept progress
   */
  static async getUserAnalytics(userId: string): Promise<UserAnalytics> {
    try {
      const userConcepts = await this.getUserConcepts(userId);
      const activeConcepts = userConcepts.filter(c => c.isActive);
      const completedConcepts = userConcepts.filter(c => (c.completionPercentage || 0) >= 100);

      const totalTimeSpent = userConcepts.reduce((sum, c) => sum + (c.timeSpent || 0), 0);
      const averageProgress = userConcepts.length > 0 
        ? userConcepts.reduce((sum, c) => sum + (c.completionPercentage || 0), 0) / userConcepts.length 
        : 0;

      const learningVelocity = totalTimeSpent > 0 ? averageProgress / totalTimeSpent : 0;

      // Identify strongest and struggling concepts
      const conceptsByProgress = userConcepts
        .filter(c => c.isActive)
        .sort((a, b) => (b.completionPercentage || 0) - (a.completionPercentage || 0));

      const strongestConcepts = conceptsByProgress.slice(0, 3).map(c => c.id);
      const strugglingConcepts = conceptsByProgress.slice(-3).map(c => c.id);

      const insights = await this.findInterdisciplinaryConnections(userId);

      return {
        userId,
        totalConcepts: userConcepts.length,
        activeConcepts: activeConcepts.length,
        completedConcepts: completedConcepts.length,
        averageProgress: Math.round(averageProgress * 100) / 100,
        totalTimeSpent,
        conceptsWithMilestones: await this.getConceptsWithMilestonesCount(userId),
        learningVelocity: Math.round(learningVelocity * 100) / 100,
        strongestConcepts,
        strugglingConcepts,
        interdisciplinaryConnections: insights.length,
      };
    } catch (error) {
      console.error('❌ Error generating user analytics:', error);
      return {
        userId,
        totalConcepts: 0,
        activeConcepts: 0,
        completedConcepts: 0,
        averageProgress: 0,
        totalTimeSpent: 0,
        conceptsWithMilestones: 0,
        learningVelocity: 0,
        strongestConcepts: [],
        strugglingConcepts: [],
        interdisciplinaryConnections: 0,
      };
    }
  }

  /**
   * Detect milestone achievements
   */
  static async detectMilestoneAchievements(userId: string): Promise<{
    conceptId: string;
    milestones: Milestone[];
  }[]> {
    try {
      const userConcepts = await this.getUserConcepts(userId, true);
      const achievements: { conceptId: string; milestones: Milestone[] }[] = [];

      for (const concept of userConcepts) {
        const milestones: Milestone[] = [];
        const progress = concept.completionPercentage || 0;

        // Standard milestones
        const standardMilestones = [
          { threshold: 25, name: 'Getting Started', description: 'Completed first quarter of the concept' },
          { threshold: 50, name: 'Halfway There', description: 'Reached the halfway point' },
          { threshold: 75, name: 'Almost Done', description: 'Three quarters complete' },
          { threshold: 100, name: 'Mastery Achieved', description: 'Fully completed the concept' },
        ];

        for (const milestone of standardMilestones) {
          if (progress >= milestone.threshold) {
            milestones.push({
              id: `${concept.id}_${milestone.threshold}`,
              name: milestone.name,
              description: milestone.description,
              achievedAt: new Date(),
              isCompleted: true,
              requiredProgress: milestone.threshold,
            });
          }
        }

        if (milestones.length > 0) {
          achievements.push({
            conceptId: concept.id,
            milestones,
          });
        }
      }

      return achievements;
    } catch (error) {
      console.error('❌ Error detecting milestone achievements:', error);
      return [];
    }
  }

  // Helper Methods

  /**
   * Check and update milestone achievements
   */
  private static async checkMilestoneAchievements(conceptId: string, milestones: Milestone[]): Promise<void> {
    try {
      // This would typically update a separate milestones table
      // For now, we'll log the achievements
      const newAchievements = milestones.filter(m => m.isCompleted && !m.achievedAt);
      if (newAchievements.length > 0) {
        console.log(`🎉 New milestones achieved for concept ${conceptId}:`, newAchievements.map(m => m.name));
      }
    } catch (error) {
      console.error('❌ Error checking milestone achievements:', error);
    }
  }

  /**
   * Get concepts by category
   */
  static async getConceptsByCategory(userId: string, category: string): Promise<LearningConcept[]> {
    try {
      return await db
        .select()
        .from(learningConcepts)
        .where(and(
          eq(learningConcepts.userId, userId),
          eq(learningConcepts.category, category)
        ))
        .orderBy(desc(learningConcepts.completionPercentage));
    } catch (error) {
      console.error('❌ Error fetching concepts by category:', error);
      return [];
    }
  }

  /**
   * Get all available concept templates/categories
   */
  static async getAvailableConcepts(): Promise<Array<{
    id: string;
    name: string;
    category: string;
    difficulty: string;
    description: string;
  }>> {
    // This would typically come from a concept templates table
    // For now, return predefined concept templates
    return [
      {
        id: 'javascript-fundamentals',
        name: 'JavaScript Fundamentals',
        category: 'programming',
        difficulty: 'beginner',
        description: 'Learn the basics of JavaScript programming'
      },
      {
        id: 'react-development',
        name: 'React Development',
        category: 'programming',
        difficulty: 'intermediate',
        description: 'Build modern web applications with React'
      },
      {
        id: 'data-structures',
        name: 'Data Structures & Algorithms',
        category: 'computer-science',
        difficulty: 'intermediate',
        description: 'Master fundamental data structures and algorithms'
      },
      {
        id: 'machine-learning',
        name: 'Machine Learning Basics',
        category: 'ai',
        difficulty: 'advanced',
        description: 'Introduction to machine learning concepts and techniques'
      },
      {
        id: 'web-design',
        name: 'Web Design Principles',
        category: 'design',
        difficulty: 'beginner',
        description: 'Learn modern web design principles and best practices'
      }
    ];
  }

  /**
   * Get learning recommendations based on user progress
   */
  static async getLearningRecommendations(userId: string): Promise<{
    nextConcepts: string[];
    reviewConcepts: string[];
    interdisciplinaryOpportunities: string[];
  }> {
    try {
      const userConcepts = await this.getUserConcepts(userId);
      const analytics = await this.getUserAnalytics(userId);
      const insights = await this.findInterdisciplinaryConnections(userId);

      // Recommend next concepts based on completed prerequisites
      const nextConcepts: string[] = [];
      for (const concept of userConcepts) {
        if ((concept.completionPercentage || 0) >= 80) {
          const relationships = await this.getConceptRelationships(concept.id);
          const advancedConcepts = relationships
            .filter(r => r.relationshipType === 'advanced')
            .map(r => r.relatedConceptId);
          nextConcepts.push(...advancedConcepts);
        }
      }

      // Recommend review for struggling concepts
      const reviewConcepts = analytics.strugglingConcepts;

      // Recommend interdisciplinary opportunities
      const interdisciplinaryOpportunities = insights
        .slice(0, 3)
        .map(insight => `${insight.primaryConceptId}-${insight.relatedConceptId}`);

      return {
        nextConcepts: Array.from(new Set(nextConcepts)),
        reviewConcepts,
        interdisciplinaryOpportunities,
      };
    } catch (error) {
      console.error('Error generating learning recommendations:', error);
      return {
        nextConcepts: [],
        reviewConcepts: [],
        interdisciplinaryOpportunities: [],
      };
    }
  }
}

export const learningConceptService = new LearningConceptService();