-- Add indexes for multi-AI context system tables for better performance

-- AI Providers indexes
CREATE INDEX IF NOT EXISTS `idx_ai_providers_type` ON `ai_providers` (`type`);
CREATE INDEX IF NOT EXISTS `idx_ai_providers_enabled` ON `ai_providers` (`enabled`);
CREATE INDEX IF NOT EXISTS `idx_ai_providers_priority` ON `ai_providers` (`priority`);

-- Learning Concepts indexes
CREATE INDEX IF NOT EXISTS `idx_learning_concepts_user_id` ON `learning_concepts` (`user_id`);
CREATE INDEX IF NOT EXISTS `idx_learning_concepts_category` ON `learning_concepts` (`category`);
CREATE INDEX IF NOT EXISTS `idx_learning_concepts_is_active` ON `learning_concepts` (`is_active`);
CREATE INDEX IF NOT EXISTS `idx_learning_concepts_last_studied` ON `learning_concepts` (`last_studied`);

-- Context Embeddings indexes
CREATE INDEX IF NOT EXISTS `idx_context_embeddings_user_id` ON `context_embeddings` (`user_id`);
CREATE INDEX IF NOT EXISTS `idx_context_embeddings_concept_id` ON `context_embeddings` (`concept_id`);
CREATE INDEX IF NOT EXISTS `idx_context_embeddings_conversation_id` ON `context_embeddings` (`conversation_id`);
CREATE INDEX IF NOT EXISTS `idx_context_embeddings_relevance_score` ON `context_embeddings` (`relevance_score`);

-- Learning Plans indexes
CREATE INDEX IF NOT EXISTS `idx_learning_plans_user_id` ON `learning_plans` (`user_id`);
CREATE INDEX IF NOT EXISTS `idx_learning_plans_is_active` ON `learning_plans` (`is_active`);

-- AI Request Logs indexes
CREATE INDEX IF NOT EXISTS `idx_ai_request_logs_user_id` ON `ai_request_logs` (`user_id`);
CREATE INDEX IF NOT EXISTS `idx_ai_request_logs_conversation_id` ON `ai_request_logs` (`conversation_id`);
CREATE INDEX IF NOT EXISTS `idx_ai_request_logs_concept_id` ON `ai_request_logs` (`concept_id`);
CREATE INDEX IF NOT EXISTS `idx_ai_request_logs_provider` ON `ai_request_logs` (`provider`);
CREATE INDEX IF NOT EXISTS `idx_ai_request_logs_created_at` ON `ai_request_logs` (`created_at`);
CREATE INDEX IF NOT EXISTS `idx_ai_request_logs_success` ON `ai_request_logs` (`success`);

-- Enhanced indexes for existing tables with new columns
CREATE INDEX IF NOT EXISTS `idx_conversations_concept_id` ON `conversations` (`concept_id`);
CREATE INDEX IF NOT EXISTS `idx_conversations_ai_provider` ON `conversations` (`ai_provider`);
CREATE INDEX IF NOT EXISTS `idx_messages_concept_id` ON `messages` (`concept_id`);
CREATE INDEX IF NOT EXISTS `idx_messages_cost` ON `messages` (`cost`);