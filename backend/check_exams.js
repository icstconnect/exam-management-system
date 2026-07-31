const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5433/exam_db' });
pool.query("SELECT exam_id, title, target_batch, status FROM exams").then(res => console.log(res.rows)).catch(console.error).finally(() => pool.end());
