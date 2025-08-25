import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../config';
import { users, userSettings, userProgress, studySessions, learningConcepts, type User, type NewUser, type NewUserSettings, type LearningConcept } from '../schema';
import { LearningConceptService, type UserAnalytics } from './learningConceptService';

// Types for enhanced user profile management
export interface LearningStyleProfile {
  primaryStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading' | 'mixed';
  preferences: {
    visualLearning: number; // 0-10 scale
    auditoryLearning: number;
    kinestheticLearning: number;
    readingLearning: number;
  };
  adaptiveSettings: {
    difficultyAdjustment: 'conservative' | 'moderate' | 'aggressive';
    pacePreference: 'slow' | 'medium' | 'fast';
    feedbackFrequency: 'minimal' | 'regular' | 'frequent';
  };
}

export interface MultiConceptProfile {
  activeConcepts: string[];
  conceptPriorities: { [conceptId: string]: number }; // 1-10 priority scale
  learningGoals: { [conceptId: string]: string };
  timeAllocation: { [conceptId: string]: number }; // hours per week
  crossConceptPreferences: {
    enableInterdisciplinary: boolean;
    preferredConnections: string[];
  };
}

export interface EnhancedUserProfile extends User {
  learningStyleProfile?: LearningStyleProfile;
  multiConceptProfile?: MultiConceptProfile;
  analytics?: UserAnalytics;
  activeConcepts?: LearningConcept[];
}

export class UserService {
  // Create a new user with onboarding data
  static async createUser(userData: NewUser): Promise<User> {
    try {
      const [newUser] = await db.insert(users).values(userData).returning();
      
      // Create default settings for the user
      await db.insert(userSettings).values({
        userId: newUser.id,
        theme: 'dark',
        emailNotifications: true,
        pushNotifications: true,
      });

      console.log(`✅ User created: ${newUser.name} (${newUser.id})`);
      return newUser;
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  // Get user by ID with their settings
  static async getUserById(userId: string): Promise<(User & { settings?: any }) | null> {
    try {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.length) return null;

      const settings = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);

      return {
        ...user[0],
        settings: settings[0] || null,
      };
    } catch (error) {
      console.error('❌ Error fetching user:', error);
      return null;
    }
  }

  // Get user by email
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      return user || null;
    } catch (error) {
      console.error('❌ Error fetching user by email:', error);
      return null;
    }
  }

  // Update user onboarding completion
  static async completeOnboarding(userId: string, onboardingData: Partial<NewUser>): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({
          ...onboardingData,
          onboardingCompleted: true,
          updatedAt: sql`(datetime('now'))`,
        })
        .where(eq(users.id, userId));

      console.log(`✅ Onboarding completed for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
      return false;
    }
  }

  // Update user's last active date and streak
  static async updateActivity(userId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const user = await this.getUserById(userId);
      
      if (!user) return;

      let newStreak = user.currentStreak;
      const lastActive = user.lastActiveDate;
      
      if (lastActive) {
        const lastActiveDate = new Date(lastActive);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastActiveDate.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
          // Consecutive day, increment streak
          newStreak = (user.currentStreak || 0) + 1;
        } else if (lastActiveDate.toISOString().split('T')[0] !== today) {
          // Missed days, reset streak
          newStreak = 1;
        }
      } else {
        // First activity
        newStreak = 1;
      }

      await db
        .update(users)
        .set({
          lastActiveDate: today,
          currentStreak: newStreak,
          updatedAt: sql`(datetime('now'))`,
        })
        .where(eq(users.id, userId));

    } catch (error) {
      console.error('❌ Error updating user activity:', error);
    }
  }

  // Get user's study statistics
  static async getUserStats(userId: string): Promise<{
    totalStudyHours: number;
    currentStreak: number;
    sessionsThisWeek: number;
    completedQuestions: number;
    averageScore: number;
  }> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        return {
          totalStudyHours: 0,
          currentStreak: 0,
          sessionsThisWeek: 0,
          completedQuestions: 0,
          averageScore: 0,
        };
      }

      // Get sessions from the last 7 days
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const recentSessions = await db
        .select()
        .from(studySessions)
        .where(
          and(
            eq(studySessions.userId, userId),
            sql`date(${studySessions.createdAt}) >= date(${weekAgo.toISOString()})`
          )
        );

      // Get total progress
      const progress = await db
        .select({
          totalCompleted: sql<number>`sum(${userProgress.completedQuestions})`,
          averageScore: sql<number>`avg(case when ${userProgress.completedQuestions} > 0 then (${userProgress.correctAnswers} * 100.0 / ${userProgress.completedQuestions}) else 0 end)`,
        })
        .from(userProgress)
        .where(eq(userProgress.userId, userId));

      return {
        totalStudyHours: user.totalStudyHours || 0,
        currentStreak: user.currentStreak || 0,
        sessionsThisWeek: recentSessions.length,
        completedQuestions: progress[0]?.totalCompleted || 0,
        averageScore: Math.round(progress[0]?.averageScore || 0),
      };
    } catch (error) {
      console.error('❌ Error fetching user stats:', error);
      return {
        totalStudyHours: 0,
        currentStreak: 0,
        sessionsThisWeek: 0,
        completedQuestions: 0,
        averageScore: 0,
      };
    }
  }

  // Get all users (for admin purposes)
  static async getAllUsers(limit: number = 50): Promise<User[]> {
    try {
      return await db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      return [];
    }
  }

  // Delete user and all associated data
  static async deleteUser(userId: string): Promise<boolean> {
    try {
      await db.delete(users).where(eq(users.id, userId));
      console.log(`✅ User deleted: ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      return false;
    }
  }

  // Enhanced Multi-Concept Learning Support

  /**
   * Get enhanced user profile with learning concepts and analytics
   */
  static async getEnhancedUserProfile(userId: string): Promise<EnhancedUserProfile | null> {
    try {
      const user = await this.getUserById(userId);
      if (!user) return null;

      // Get user's active learning concepts
      const activeConcepts = await LearningConceptService.getUserConcepts(userId, true);
      
      // Get user analytics
      const analytics = await LearningConceptService.getUserAnalytics(userId);

      // Parse learning style from user data
      const learningStyleProfile = this.parseLearningStyleProfile(user);
      
      // Build multi-concept profile
      const multiConceptProfile = this.buildMultiConceptProfile(activeConcepts, user);

      return {
        ...user,
        learningStyleProfile,
        multiConceptProfile,
        analytics,
        activeConcepts,
      };
    } catch (error) {
      console.error('❌ Error fetching enhanced user profile:', error);
      return null;
    }
  }

  /**
   * Update user's learning style profile
   */
  static async updateLearningStyleProfile(userId: string, styleProfile: LearningStyleProfile): Promise<boolean> {
    try {
      const currentUser = await this.getUserById(userId);
      if (!currentUser) return false;

      // Store learning style in the learningStyle field and additional data in currentSkills
      const currentSkills = currentUser.currentSkills ? JSON.parse(currentUser.currentSkills) : {};
      currentSkills.learningStyleProfile = styleProfile;

      await db
        .update(users)
        .set({
          learningStyle: styleProfile.primaryStyle,
          currentSkills: JSON.stringify(currentSkills),
          updatedAt: sql`(datetime('now'))`,
        })
        .where(eq(users.id, userId));

      console.log(`✅ Learning style profile updated for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Error updating learning style profile:', error);
      return false;
    }
  }

  /**
   * Add learning concept to user's active concepts
   */
  static async addLearningConcept(userId: string, conceptData: {
    name: string;
    description?: string;
    category: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedHours?: number;
    prerequisites?: string[];
    learningObjectives?: string[];
    priority?: number;
    weeklyHours?: number;
  }): Promise<LearningConcept | null> {
    try {
      // Validate prerequisites
      if (conceptData.prerequisites && conceptData.prerequisites.length > 0) {
        const validation = await LearningConceptService.validatePrerequisites(userId, 'temp');
        // For new concepts, we'll check if the prerequisite concepts exist for the user
        const userConcepts = await LearningConceptService.getUserConcepts(userId);
        const userConceptNames = userConcepts.map(c => c.name.toLowerCase());
        
        const missingPrereqs = conceptData.prerequisites.filter(
          prereq => !userConceptNames.includes(prereq.toLowerCase())
        );

        if (missingPrereqs.length > 0) {
          console.warn(`⚠️ Missing prerequisites for concept ${conceptData.name}: ${missingPrereqs.join(', ')}`);
        }
      }

      const newConcept = await LearningConceptService.createConcept({
        userId,
        name: conceptData.name,
        description: conceptData.description || '',
        category: conceptData.category,
        difficulty: conceptData.difficulty,
        estimatedHours: conceptData.estimatedHours || 10,
        prerequisites: conceptData.prerequisites ? JSON.stringify(conceptData.prerequisites) : null,
        learningObjectives: conceptData.learningObjectives ? JSON.stringify(conceptData.learningObjectives) : null,
        customPrompts: JSON.stringify([]),
        isActive: true,
      });

      // Update user's multi-concept profile
      await this.updateMultiConceptProfile(userId, {
        conceptId: newConcept.id,
        priority: conceptData.priority || 5,
        weeklyHours: conceptData.weeklyHours || 2,
        learningGoal: `Master ${conceptData.name}`,
      });

      console.log(`✅ Learning concept added to user ${userId}: ${conceptData.name}`);
      return newConcept;
    } catch (error) {
      console.error('❌ Error adding learning concept:', error);
      return null;
    }
  }

  /**
   * Update multi-concept profile settings
   */
  static async updateMultiConceptProfile(userId: string, conceptSettings: {
    conceptId: string;
    priority?: number;
    weeklyHours?: number;
    learningGoal?: string;
  }): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      if (!user) return false;

      const currentSkills = user.currentSkills ? JSON.parse(user.currentSkills) : {};
      const multiConceptProfile = currentSkills.multiConceptProfile || {
        activeConcepts: [],
        conceptPriorities: {},
        learningGoals: {},
        timeAllocation: {},
        crossConceptPreferences: {
          enableInterdisciplinary: true,
          preferredConnections: [],
        },
      };

      // Update concept settings
      if (!multiConceptProfile.activeConcepts.includes(conceptSettings.conceptId)) {
        multiConceptProfile.activeConcepts.push(conceptSettings.conceptId);
      }

      if (conceptSettings.priority !== undefined) {
        multiConceptProfile.conceptPriorities[conceptSettings.conceptId] = conceptSettings.priority;
      }

      if (conceptSettings.weeklyHours !== undefined) {
        multiConceptProfile.timeAllocation[conceptSettings.conceptId] = conceptSettings.weeklyHours;
      }

      if (conceptSettings.learningGoal) {
        multiConceptProfile.learningGoals[conceptSettings.conceptId] = conceptSettings.learningGoal;
      }

      currentSkills.multiConceptProfile = multiConceptProfile;

      await db
        .update(users)
        .set({
          currentSkills: JSON.stringify(currentSkills),
          updatedAt: sql`(datetime('now'))`,
        })
        .where(eq(users.id, userId));

      console.log(`✅ Multi-concept profile updated for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Error updating multi-concept profile:', error);
      return false;
    }
  }

  /**
   * Get learning recommendations based on user profile and progress
   */
  static async getLearningRecommendations(userId: string): Promise<{
    nextConcepts: string[];
    reviewConcepts: string[];
    interdisciplinaryOpportunities: string[];
    timeOptimization: {
      conceptId: string;
      currentHours: number;
      recommendedHours: number;
      reason: string;
    }[];
  }> {
    try {
      const profile = await this.getEnhancedUserProfile(userId);
      if (!profile) {
        return {
          nextConcepts: [],
          reviewConcepts: [],
          interdisciplinaryOpportunities: [],
          timeOptimization: [],
        };
      }

      const conceptRecommendations = await LearningConceptService.getLearningRecommendations(userId);
      
      // Time optimization recommendations
      const timeOptimization: {
        conceptId: string;
        currentHours: number;
        recommendedHours: number;
        reason: string;
      }[] = [];

      if (profile.multiConceptProfile && profile.activeConcepts) {
        for (const concept of profile.activeConcepts) {
          const currentHours = profile.multiConceptProfile.timeAllocation[concept.id] || 2;
          const progress = concept.completionPercentage || 0;
          
          let recommendedHours = currentHours;
          let reason = 'Current allocation is appropriate';

          if (progress < 20 && currentHours < 3) {
            recommendedHours = currentHours + 1;
            reason = 'Increase time to build momentum';
          } else if (progress > 80 && currentHours > 2) {
            recommendedHours = Math.max(1, currentHours - 1);
            reason = 'Reduce time as concept nears completion';
          } else if (profile.analytics?.strugglingConcepts.includes(concept.id)) {
            recommendedHours = currentHours + 0.5;
            reason = 'Additional time needed for struggling concept';
          }

          if (recommendedHours !== currentHours) {
            timeOptimization.push({
              conceptId: concept.id,
              currentHours,
              recommendedHours,
              reason,
            });
          }
        }
      }

      return {
        ...conceptRecommendations,
        timeOptimization,
      };
    } catch (error) {
      console.error('❌ Error generating learning recommendations:', error);
      return {
        nextConcepts: [],
        reviewConcepts: [],
        interdisciplinaryOpportunities: [],
        timeOptimization: [],
      };
    }
  }

  /**
   * Track cross-concept learning session
   */
  static async trackCrossConceptSession(userId: string, sessionData: {
    primaryConceptId: string;
    relatedConceptIds: string[];
    duration: number;
    insights: string[];
    connections: string[];
  }): Promise<boolean> {
    try {
      // Update time spent for primary concept
      await LearningConceptService.updateProgress(sessionData.primaryConceptId, {
        timeSpent: sessionData.duration,
      });

      // Update cross-concept knowledge for related concepts
      for (const relatedConceptId of sessionData.relatedConceptIds) {
        for (const insight of sessionData.insights) {
          await LearningConceptService.updateCrossConceptKnowledge(userId, relatedConceptId, insight);
        }
      }

      // Update user's total study hours
      const user = await this.getUserById(userId);
      if (user) {
        await db
          .update(users)
          .set({
            totalStudyHours: (user.totalStudyHours || 0) + (sessionData.duration / 60),
            updatedAt: sql`(datetime('now'))`,
          })
          .where(eq(users.id, userId));
      }

      console.log(`✅ Cross-concept session tracked for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Error tracking cross-concept session:', error);
      return false;
    }
  }

  // Helper Methods

  /**
   * Parse learning style profile from user data
   */
  private static parseLearningStyleProfile(user: User): LearningStyleProfile {
    const defaultProfile: LearningStyleProfile = {
      primaryStyle: 'mixed',
      preferences: {
        visualLearning: 5,
        auditoryLearning: 5,
        kinestheticLearning: 5,
        readingLearning: 5,
      },
      adaptiveSettings: {
        difficultyAdjustment: 'moderate',
        pacePreference: 'medium',
        feedbackFrequency: 'regular',
      },
    };

    try {
      if (user.currentSkills) {
        const skills = JSON.parse(user.currentSkills);
        if (skills.learningStyleProfile) {
          return { ...defaultProfile, ...skills.learningStyleProfile };
        }
      }

      // Infer from existing user data
      if (user.learningStyle) {
        defaultProfile.primaryStyle = user.learningStyle as any;
      }

      return defaultProfile;
    } catch (error) {
      console.error('❌ Error parsing learning style profile:', error);
      return defaultProfile;
    }
  }

  /**
   * Build multi-concept profile from active concepts
   */
  private static buildMultiConceptProfile(activeConcepts: LearningConcept[], user: User): MultiConceptProfile {
    const defaultProfile: MultiConceptProfile = {
      activeConcepts: [],
      conceptPriorities: {},
      learningGoals: {},
      timeAllocation: {},
      crossConceptPreferences: {
        enableInterdisciplinary: true,
        preferredConnections: [],
      },
    };

    try {
      if (user.currentSkills) {
        const skills = JSON.parse(user.currentSkills);
        if (skills.multiConceptProfile) {
          return { ...defaultProfile, ...skills.multiConceptProfile };
        }
      }

      // Build from active concepts
      defaultProfile.activeConcepts = activeConcepts.map(c => c.id);
      
      for (const concept of activeConcepts) {
        defaultProfile.conceptPriorities[concept.id] = 5; // Default priority
        defaultProfile.learningGoals[concept.id] = `Master ${concept.name}`;
        defaultProfile.timeAllocation[concept.id] = 2; // Default 2 hours per week
      }

      return defaultProfile;
    } catch (error) {
      console.error('❌ Error building multi-concept profile:', error);
      return defaultProfile;
    }
  }
}

// Export singleton instance for backward compatibility
export const userService = new UserService();
