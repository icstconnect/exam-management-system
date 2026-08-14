const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'exam_db',
});

async function runMigration() {
  try {
    const migrationSql = fs.readFileSync(path.join(__dirname, 'src', 'db', 'migration_feature_expansion.sql')).toString();
    console.log('Running feature expansion migration...');
    await pool.query(migrationSql);
    console.log('Migration completed successfully!');

    // Verification queries
    const batches = await pool.query('SELECT count(*) FROM batches');
    const examBatches = await pool.query('SELECT count(*) FROM exam_batches');
    const examRuns = await pool.query('SELECT count(*) FROM exam_runs');
    console.log(`Verified counts -> Batches: ${batches.rows[0].count}, ExamBatches: ${examBatches.rows[0].count}, ExamRuns: ${examRuns.rows[0].count}`);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
