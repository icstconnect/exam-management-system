const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5433/exam_db' });
async function check() {
  try {
    const textBn1 = 'ভারী আর্থিক ডেটা গণনার পরিবর্তে একটি ওয়ার্ড প্রসেসর প্রাথমিকভাবে পাঠ্য নথিগুলি সম্পাদনা, বিন্যাস এবং মুদ্রণের জন্য ব্যবহৃত হয়।';
    await pool.query("UPDATE questions SET question_text_bn = $1 WHERE question_text_en LIKE 'A Word Processor is primarily used to edit%'", [textBn1]);

    const textBn2 = 'নির্বাচিত টেক্সটকে তির্যক (tilted) দেখাতে এবং জোর (emphasis) প্রদান করতে Ctrl + I শর্টকাটটি ব্যবহৃত হয়।';
    await pool.query("UPDATE questions SET question_text_bn = $1 WHERE question_text_en LIKE 'The key shortcut Ctrl + I is used%'", [textBn2]);

    console.log('Database updated successfully!');
  } finally {
    await pool.end();
  }
}
check();
