const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5433/exam_db' });
async function check() {
  try {
    const res = await pool.query("SELECT exam_id FROM exam_sessions WHERE session_id = '81100450-5d79-46bb-9b6a-01edc94ec4c4'");
    console.log('Exam ID:', res.rows[0]?.exam_id);
    if (res.rows.length > 0) {
      const qRes = await pool.query('SELECT COUNT(*) FROM questions WHERE exam_id = $1', [res.rows[0].exam_id]);
      console.log('Questions count:', qRes.rows[0].count);
      const examRes = await pool.query('SELECT status FROM exams WHERE exam_id = $1', [res.rows[0].exam_id]);
      console.log('Exam status:', examRes.rows[0]?.status);
    }
  } finally {
    await pool.end();
  }
}
check();
