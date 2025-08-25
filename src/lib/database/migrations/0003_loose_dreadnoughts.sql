CREATE TABLE `milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`concept_id` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`target_value` real,
	`current_value` real DEFAULT 0,
	`is_completed` integer DEFAULT false,
	`completed_at` text,
	`priority` integer DEFAULT 1,
	`metadata` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`concept_id`) REFERENCES `learning_concepts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `context_embeddings` ADD `updated_at` text DEFAULT (datetime('now'));