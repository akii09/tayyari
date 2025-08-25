CREATE TABLE `ai_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`enabled` integer DEFAULT true,
	`priority` integer DEFAULT 1,
	`config` text,
	`health_status` text DEFAULT 'unknown',
	`last_health_check` text,
	`total_requests` integer DEFAULT 0,
	`total_cost` real DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `ai_request_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`conversation_id` text,
	`concept_id` text,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`prompt_tokens` integer,
	`completion_tokens` integer,
	`total_tokens` integer,
	`cost` real,
	`response_time` integer,
	`success` integer DEFAULT true,
	`error_message` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`concept_id`) REFERENCES `learning_concepts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `context_embeddings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`concept_id` text,
	`conversation_id` text,
	`content` text NOT NULL,
	`embedding` blob,
	`metadata` text,
	`relevance_score` real,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`concept_id`) REFERENCES `learning_concepts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `learning_concepts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text NOT NULL,
	`difficulty` text NOT NULL,
	`estimated_hours` integer,
	`prerequisites` text,
	`learning_objectives` text,
	`custom_prompts` text,
	`is_active` integer DEFAULT true,
	`completion_percentage` real DEFAULT 0,
	`current_module` text,
	`time_spent` real DEFAULT 0,
	`last_studied` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `learning_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`concepts` text NOT NULL,
	`schedule` text,
	`adaptive_settings` text,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `conversations` ADD `concept_id` text REFERENCES learning_concepts(id);--> statement-breakpoint
ALTER TABLE `conversations` ADD `ai_provider` text;--> statement-breakpoint
ALTER TABLE `conversations` ADD `context_summary` text;--> statement-breakpoint
ALTER TABLE `conversations` ADD `total_cost` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `messages` ADD `concept_id` text REFERENCES learning_concepts(id);--> statement-breakpoint
ALTER TABLE `messages` ADD `context_used` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `cost` real;--> statement-breakpoint
ALTER TABLE `messages` ADD `processing_time` integer;