-- Add file_storage_key column to parse_results table
-- This column will store the Storage API key for the original file
ALTER TABLE parse_results
ADD COLUMN file_storage_key VARCHAR(500) DEFAULT NULL AFTER mime_type,
ADD INDEX idx_storage_key (file_storage_key);
