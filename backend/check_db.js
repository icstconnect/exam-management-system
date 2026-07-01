const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5433/exam_db' });
async function check() {
  try {
    const res = await pool.query("SELECT correct_answer FROM questions WHERE question_type = 'MATCH' LIMIT 1");
    console.log(res.rows[0].correct_answer);
  } finally {
    await pool.end();
  }
}
check();
