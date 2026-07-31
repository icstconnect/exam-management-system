const fs = require('fs');
const path = 'frontend/src/pages/TeacherDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldCode = `    socket.emit('join_teacher_dashboard');
    fetchData();`;

const newCode = `    socket.emit('join_teacher_dashboard');
    fetchData();

    // Ensure we rejoin rooms if socket reconnects after backend restarts
    socket.on('connect', () => {
      socket.emit('join_teacher_dashboard');
      if (selectedMonitorExamId) {
        socket.emit('monitor_exam', { exam_id: selectedMonitorExamId });
      }
    });`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(path, content);
console.log('Added socket connect listener');
