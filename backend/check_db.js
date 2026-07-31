const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5433/exam_db' });
pool.query("SELECT * FROM students WHERE batch = 'V,VI Batch 1'").then(res => console.log('V,VI Batch 1:', res.rows.length)).catch(console.error).finally(() => pool.end());
