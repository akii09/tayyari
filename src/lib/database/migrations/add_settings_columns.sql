-- Add missing notification settings columns
ALTER TABLE user_settings ADD COLUMN study_reminders INTEGER DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN progress_updates INTEGER DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN new_features INTEGER DEFAULT 0;
ALTER TABLE user_settings ADD COLUMN marketing_emails INTEGER DEFAULT 0;

-- Add missing privacy settings columns  
ALTER TABLE user_settings ADD COLUMN data_retention TEXT DEFAULT '2years';
ALTER TABLE user_settings ADD COLUMN anonymize_data INTEGER DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN third_party_sharing INTEGER DEFAULT 0;

-- Update reminder_time default for existing rows
UPDATE user_settings SET reminder_time = '18:00' WHERE reminder_time IS NULL;
