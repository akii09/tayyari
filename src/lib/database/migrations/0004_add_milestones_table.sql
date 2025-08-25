-- Migration: Add milestones table for learning concept milestones
-- Created: 2025-01-25

CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  concept_id TEXT NOT NULL REFERENCES learning_concepts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'progress', 'achievement', 'skill', 'completion'
  target_value REAL, -- Target value for progress milestones
  current_value REAL DEFAULT 0, -- Current progress value
  is_completed INTEGER DEFAULT 0, -- Boolean: 0 = false, 1 = true
  completed_at TEXT,
  priority INTEGER DEFAULT 1, -- 1 = high, 2 = medium, 3 = low
  metadata TEXT, -- JSON metadata for additional data
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_milestones_concept_id ON milestones(concept_id);
CREATE INDEX IF NOT EXISTS idx_milestones_user_id ON milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_milestones_type ON milestones(type);
CREATE INDEX IF NOT EXISTS idx_milestones_completed ON milestones(is_completed);
CREATE INDEX IF NOT EXISTS idx_milestones_priority ON milestones(priority);