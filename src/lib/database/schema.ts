import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Users table - stores user onboarding and profile information
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  
  // Basic Information
  name: text('name').notNull(),
  email: text('email').unique(),
  role: text('role').notNull(), // e.g., 'Software Engineer', 'Product Manager'
  
  // Experience Level
  experienceLevel: text('experience_level').notNull(), // 'junior', 'mid', 'senior', 'lead'
  yearsOfExperience: integer('years_of_experience'),
  
  // Current Company/Background
  currentCompany: text('current_company'),
  currentTitle: text('current_title'),
  
  // Interview Preparation Goals
  targetCompanies: text('target_companies'), // JSON array of company names
  targetRoles: text('target_roles'), // JSON array of role types
  interviewTypes: text('interview_types'), // JSON array: ['dsa', 'system_design', 'behavioral']
  
  // Preparation Timeline
  targetDate: text('target_date'), // ISO date string for target interview date
  hoursPerWeek: integer('hours_per_week').notNull().default(5),
  preferredStudyTime: text('preferred_study_time'), // 'morning', 'afternoon', 'evening'
  
  // Skills Assessment
  currentSkills: text('current_skills'), // JSON object with skill ratings
  weakAreas: text('weak_areas'), // JSON array of areas to focus on
  strongAreas: text('strong_areas'), // JSON array of strengths
  
  // Preferences
  difficultyPreference: text('difficulty_preference').default('medium'), // 'easy', 'medium', 'hard'
  learningStyle: text('learning_style'), // 'visual', 'hands-on', 'reading', 'mixed'
  notificationPreferences: text('notification_preferences'), // JSON object
  
  // Progress Tracking
  onboardingCompleted: integer('onboarding_completed', { mode: 'boolean' }).default(false),
  currentStreak: integer('current_streak').default(0),
  totalStudyHours: real('total_study_hours').default(0),
  lastActiveDate: text('last_active_date'),
  
  // Metadata
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// Study Sessions table - tracks individual study sessions
export const studySessions = sqliteTable('study_sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Session Details
  sessionType: text('session_type').notNull(), // 'dsa', 'system_design', 'behavioral', 'mock_interview'
  topic: text('topic'), // specific topic covered
  duration: integer('duration').notNull(), // duration in minutes
  
  // Progress
  questionsAttempted: integer('questions_attempted').default(0),
  questionsCompleted: integer('questions_completed').default(0),
  difficultyLevel: text('difficulty_level'), // 'easy', 'medium', 'hard'
  
  // Performance
  score: real('score'), // percentage score if applicable
  notes: text('notes'), // user notes from the session
  
  // Metadata
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// Chat Conversations table - stores AI chat history
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  
  // Conversation Details
  title: text('title'), // auto-generated or user-defined title
  context: text('context'), // 'general', 'dsa', 'system_design', 'behavioral', 'code_review'
  
  // Metadata
  messageCount: integer('message_count').default(0),
  lastMessageAt: text('last_message_at'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// Chat Messages table - stores individual messages
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  
  // Message Details
  role: text('role').notNull(), // 'user', 'assistant'
  content: text('content').notNull(),
  
  // Attachments and Metadata
  attachments: text('attachments'), // JSON array of file information
  tokens: integer('tokens'), // token count for AI messages
  model: text('model'), // AI model used for response
  
  // User Feedback
  feedback: text('feedback'), // 'positive', 'negative', null
  feedbackNote: text('feedback_note'), // optional feedback details
  
  // Metadata
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// User Progress table - tracks learning progress across different areas
export const userProgress = sqliteTable('user_progress', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Progress Area
  category: text('category').notNull(), // 'dsa', 'system_design', 'behavioral'
  subcategory: text('subcategory'), // specific topic like 'arrays', 'graphs', 'caching'
  
  // Progress Metrics
  totalQuestions: integer('total_questions').default(0),
  completedQuestions: integer('completed_questions').default(0),
  correctAnswers: integer('correct_answers').default(0),
  averageTime: real('average_time'), // average time per question in minutes
  
  // Difficulty Progress
  easyCompleted: integer('easy_completed').default(0),
  mediumCompleted: integer('medium_completed').default(0),
  hardCompleted: integer('hard_completed').default(0),
  
  // Last Activity
  lastPracticed: text('last_practiced'),
  currentStreak: integer('current_streak').default(0),
  bestStreak: integer('best_streak').default(0),
  
  // Metadata
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// User Settings table - stores user preferences
export const userSettings = sqliteTable('user_settings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // UI Preferences
  theme: text('theme').default('dark'), // 'light', 'dark', 'system'
  language: text('language').default('en'),
  fontSize: text('font_size').default('medium'), // 'small', 'medium', 'large'
  
  // Notification Settings
  emailNotifications: integer('email_notifications', { mode: 'boolean' }).default(true),
  pushNotifications: integer('push_notifications', { mode: 'boolean' }).default(true),
  weeklyReports: integer('weekly_reports', { mode: 'boolean' }).default(true),
  reminderTime: text('reminder_time'), // daily reminder time
  
  // Privacy Settings
  shareProgress: integer('share_progress', { mode: 'boolean' }).default(false),
  publicProfile: integer('public_profile', { mode: 'boolean' }).default(false),
  analyticsOptIn: integer('analytics_opt_in', { mode: 'boolean' }).default(true),
  
  // Metadata
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// Export types for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type StudySession = typeof studySessions.$inferSelect;
export type NewStudySession = typeof studySessions.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type UserProgress = typeof userProgress.$inferSelect;
export type NewUserProgress = typeof userProgress.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
