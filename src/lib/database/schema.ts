import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// AI Providers table - stores AI provider configurations
export const aiProviders = sqliteTable('ai_providers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'openai', 'claude', 'gemini', 'ollama', 'mistral'
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  priority: integer('priority').default(1),
  config: text('config'), // JSON configuration
  healthStatus: text('health_status').default('unknown'),
  lastHealthCheck: text('last_health_check'),
  totalRequests: integer('total_requests').default(0),
  totalCost: real('total_cost').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// Learning Concepts table - stores learning concepts for users
export const learningConcepts = sqliteTable('learning_concepts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').notNull(),
  difficulty: text('difficulty').notNull(),
  estimatedHours: integer('estimated_hours'),
  prerequisites: text('prerequisites'), // JSON array
  learningObjectives: text('learning_objectives'), // JSON array
  customPrompts: text('custom_prompts'), // JSON array
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  completionPercentage: real('completion_percentage').default(0),
  currentModule: text('current_module'),
  timeSpent: real('time_spent').default(0),
  lastStudied: text('last_studied'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// Milestones table - stores learning milestones for concepts
export const milestones = sqliteTable('milestones', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  conceptId: text('concept_id').notNull().references(() => learningConcepts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull(), // 'progress', 'achievement', 'skill', 'completion'
  targetValue: real('target_value'), // Target value for progress milestones
  currentValue: real('current_value').default(0), // Current progress value
  isCompleted: integer('is_completed', { mode: 'boolean' }).default(false),
  completedAt: text('completed_at'),
  priority: integer('priority').default(1), // 1 = high, 2 = medium, 3 = low
  metadata: text('metadata'), // JSON metadata for additional data
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// Context Embeddings table - stores vector embeddings for context
export const contextEmbeddings = sqliteTable('context_embeddings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  conceptId: text('concept_id').references(() => learningConcepts.id, { onDelete: 'cascade' }),
  conversationId: text('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  embedding: blob('embedding'), // Vector embedding
  metadata: text('metadata'), // JSON metadata
  relevanceScore: real('relevance_score'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// Learning Plans table - stores personalized learning plans
export const learningPlans = sqliteTable('learning_plans', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  concepts: text('concepts').notNull(), // JSON array of concept configurations
  schedule: text('schedule'), // JSON schedule configuration
  adaptiveSettings: text('adaptive_settings'), // JSON adaptive learning settings
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// AI Request Logs table - stores AI request/response logs
export const aiRequestLogs = sqliteTable('ai_request_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  conversationId: text('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }),
  conceptId: text('concept_id').references(() => learningConcepts.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),
  totalTokens: integer('total_tokens'),
  cost: real('cost'),
  responseTime: integer('response_time'), // milliseconds
  success: integer('success', { mode: 'boolean' }).default(true),
  errorMessage: text('error_message'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

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
  
  // Multi-AI Context System additions
  conceptId: text('concept_id').references(() => learningConcepts.id, { onDelete: 'set null' }),
  aiProvider: text('ai_provider'), // which AI provider was used
  contextSummary: text('context_summary'), // compressed context summary
  totalCost: real('total_cost').default(0), // total cost for this conversation
  
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
  
  // Multi-AI Context System additions
  conceptId: text('concept_id').references(() => learningConcepts.id, { onDelete: 'set null' }),
  contextUsed: text('context_used'), // JSON context metadata
  cost: real('cost'), // cost for this specific message
  processingTime: integer('processing_time'), // processing time in milliseconds
  
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
  reminderTime: text('reminder_time').default('18:00'), // daily reminder time
  studyReminders: integer('study_reminders', { mode: 'boolean' }).default(true),
  progressUpdates: integer('progress_updates', { mode: 'boolean' }).default(true),
  newFeatures: integer('new_features', { mode: 'boolean' }).default(false),
  marketingEmails: integer('marketing_emails', { mode: 'boolean' }).default(false),
  
  // Privacy Settings
  shareProgress: integer('share_progress', { mode: 'boolean' }).default(false),
  publicProfile: integer('public_profile', { mode: 'boolean' }).default(false),
  analyticsOptIn: integer('analytics_opt_in', { mode: 'boolean' }).default(true),
  dataRetention: text('data_retention').default('2years'), // '1year', '2years', '5years', 'forever'
  anonymizeData: integer('anonymize_data', { mode: 'boolean' }).default(true),
  thirdPartySharing: integer('third_party_sharing', { mode: 'boolean' }).default(false),
  
  // Metadata
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// Export types for TypeScript
export type AIProvider = typeof aiProviders.$inferSelect;
export type NewAIProvider = typeof aiProviders.$inferInsert;
export type LearningConcept = typeof learningConcepts.$inferSelect;
export type NewLearningConcept = typeof learningConcepts.$inferInsert;
export type Milestone = typeof milestones.$inferSelect;
export type NewMilestone = typeof milestones.$inferInsert;
export type ContextEmbedding = typeof contextEmbeddings.$inferSelect;
export type NewContextEmbedding = typeof contextEmbeddings.$inferInsert;
export type LearningPlan = typeof learningPlans.$inferSelect;
export type NewLearningPlan = typeof learningPlans.$inferInsert;
export type AIRequestLog = typeof aiRequestLogs.$inferSelect;
export type NewAIRequestLog = typeof aiRequestLogs.$inferInsert;
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
