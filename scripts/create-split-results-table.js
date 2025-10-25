const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

async function createTable() {
  let connection;

  try {
    // Create connection
    connection = await mysql.createConnection({
      host: envVars.DB_HOST,
      port: parseInt(envVars.DB_PORT || '3306'),
      user: envVars.DB_USER,
      password: envVars.DB_PASSWORD,
      database: envVars.DB_NAME,
    });

    console.log('Connected to database');

    // Create split_results table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS split_results (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        splitter_type VARCHAR(100) NOT NULL,
        original_text MEDIUMTEXT NOT NULL,
        chunk_size INT,
        chunk_overlap INT,
        \`separator\` VARCHAR(255),
        separators JSON,
        encoding_name VARCHAR(50),
        \`language\` VARCHAR(50),
        breakpoint_type VARCHAR(50),
        chunks JSON NOT NULL,
        chunk_count INT NOT NULL,
        processing_time INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_email (user_email),
        INDEX idx_created_at (created_at),
        INDEX idx_splitter_type (splitter_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✓ Table "split_results" created successfully');

    // Check if table exists
    const [rows] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = ?
      AND table_name = 'split_results'
    `, [envVars.DB_NAME]);

    if (rows[0].count > 0) {
      console.log('✓ Table verification: split_results exists');
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

createTable();
