import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../config';
import { users, userSettings, userProgress, studySessions, type User, type NewUser, type NewUserSettings } from '../schema';

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
}
