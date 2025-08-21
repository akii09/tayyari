CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`title` text,
	`context` text,
	`message_count` integer DEFAULT 0,
	`last_message_at` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`attachments` text,
	`tokens` integer,
	`model` text,
	`feedback` text,
	`feedback_note` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `study_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_type` text NOT NULL,
	`topic` text,
	`duration` integer NOT NULL,
	`questions_attempted` integer DEFAULT 0,
	`questions_completed` integer DEFAULT 0,
	`difficulty_level` text,
	`score` real,
	`notes` text,
	`started_at` text NOT NULL,
	`completed_at` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`category` text NOT NULL,
	`subcategory` text,
	`total_questions` integer DEFAULT 0,
	`completed_questions` integer DEFAULT 0,
	`correct_answers` integer DEFAULT 0,
	`average_time` real,
	`easy_completed` integer DEFAULT 0,
	`medium_completed` integer DEFAULT 0,
	`hard_completed` integer DEFAULT 0,
	`last_practiced` text,
	`current_streak` integer DEFAULT 0,
	`best_streak` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`theme` text DEFAULT 'dark',
	`language` text DEFAULT 'en',
	`font_size` text DEFAULT 'medium',
	`email_notifications` integer DEFAULT true,
	`push_notifications` integer DEFAULT true,
	`weekly_reports` integer DEFAULT true,
	`reminder_time` text,
	`share_progress` integer DEFAULT false,
	`public_profile` integer DEFAULT false,
	`analytics_opt_in` integer DEFAULT true,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`role` text NOT NULL,
	`experience_level` text NOT NULL,
	`years_of_experience` integer,
	`current_company` text,
	`current_title` text,
	`target_companies` text,
	`target_roles` text,
	`interview_types` text,
	`target_date` text,
	`hours_per_week` integer DEFAULT 5 NOT NULL,
	`preferred_study_time` text,
	`current_skills` text,
	`weak_areas` text,
	`strong_areas` text,
	`difficulty_preference` text DEFAULT 'medium',
	`learning_style` text,
	`notification_preferences` text,
	`onboarding_completed` integer DEFAULT false,
	`current_streak` integer DEFAULT 0,
	`total_study_hours` real DEFAULT 0,
	`last_active_date` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);