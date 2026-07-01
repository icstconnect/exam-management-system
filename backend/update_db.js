const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5433/exam_db' });
async function check() {
  try {
    const textBn = 'একটি প্রেজেন্টেশন স্লাইডে টেক্সট ফরম্যাট করার সময়, কোন নির্দিষ্ট টুলটি আপনার নির্বাচিত অক্ষরের ঠিক পিছনে একটি সূক্ষ্ম থ্রিডি শ্যাডো ডেপথ ইফেক্ট যোগ করে?';
    const res = await pool.query("UPDATE questions SET question_text_bn = $1 WHERE question_text_en LIKE '%While formatting text%'", [textBn]);
    console.log('Database updated successfully! Rows affected:', res.rowCount);
  } finally {
    await pool.end();
  }
}
check();
