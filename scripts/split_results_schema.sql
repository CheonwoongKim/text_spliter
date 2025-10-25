-- Split Results Table Schema
-- Stores text splitting results from various splitter types

CREATE TABLE IF NOT EXISTS split_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  splitter_type VARCHAR(100) NOT NULL,
  original_text MEDIUMTEXT NOT NULL,
  chunk_size INT,
  chunk_overlap INT,
  separator VARCHAR(255),
  separators JSON,
  encoding_name VARCHAR(50),
  language VARCHAR(50),
  breakpoint_type VARCHAR(50),
  chunks JSON NOT NULL,
  chunk_count INT NOT NULL,
  processing_time INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user_email (user_email),
  INDEX idx_created_at (created_at),
  INDEX idx_splitter_type (splitter_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
