import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import ExamWorkspace from './pages/ExamWorkspace';
import TeacherDashboard from './pages/TeacherDashboard';
import { io } from 'socket.io-client';

// Connect to the backend (adjust IP for LAN deployment)
export const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001');

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-primary-500 selection:text-white">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Placeholder for Logo */}
              <div className="w-10 h-10 bg-gradient-vibrant rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">
                IC
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800 leading-tight">INSTITUTE OF COMPUTER SCIENCE</h1>
                <h2 className="text-sm font-medium text-slate-500 leading-tight">AND TECHNOLOGY CHOWBERIA</h2>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Route */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/exam/:session_id" element={<ExamWorkspace />} />
            <Route path="/teacher" element={<TeacherDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
