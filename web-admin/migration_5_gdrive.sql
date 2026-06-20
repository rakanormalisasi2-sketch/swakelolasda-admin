-- Migration 5: Add Google Drive integration logic
ALTER TABLE section_settings
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_root_folder_id TEXT;
