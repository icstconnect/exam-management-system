const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5433/exam_db' });
async function check() {
  try {
    const res = await pool.query("SELECT question_text_en, question_text_bn FROM questions WHERE question_type = 'TF'");
    console.log(res.rows);
  } finally {
    await pool.end();
  }
}
check();
