const http = require('http');

const data = JSON.stringify({
  title: "TERM 1: Computer Studies",
  duration_minutes: 50,
  full_marks: 25,
  target_batch: "KIDS III, IV, V"
});

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/exams/1',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Response:', body));
});

req.on('error', console.error);
req.write(data);
req.end();
