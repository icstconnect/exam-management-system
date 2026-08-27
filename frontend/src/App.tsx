import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Login from './pages/Login';
import ExamWorkspace from './pages/ExamWorkspace';
import TeacherDashboard from './pages/TeacherDashboard';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { io } from 'socket.io-client';

// Connect to the backend (dynamically use current hostname to support LAN devices)
export const API_BASE = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:3001`;
export const socket = io(API_BASE);

function HeaderThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
      <button
        type="button"
        onClick={() => setTheme('light')}
        title="Minimalist Swiss Bento (Light Mode)"
        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
          theme === 'light'
            ? 'bg-white text-primary-700 shadow-sm border border-slate-200/80 scale-[1.02]'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
        }`}
        aria-label="Switch to Light Theme"
      >
        <Sun size={15} className={theme === 'light' ? 'text-amber-500' : 'text-slate-400'} />
        <span>Light</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme('dark')}
        title="Dark Modern Cyber UI (Dark Mode)"
        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
          theme === 'dark'
            ? 'bg-[#1e293b] text-white shadow-sm border border-slate-600/80 scale-[1.02]'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
        }`}
        aria-label="Switch to Dark Theme"
      >
        <Moon size={15} className={theme === 'dark' ? 'text-blue-400' : 'text-slate-400'} />
        <span>Dark</span>
      </button>
    </div>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 font-sans selection:bg-primary-500 selection:text-white transition-colors duration-200">
      {/* Universal Header */}
      <header className="bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-50 transition-colors shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            {/* Logo */}
            <img src="/logo.jpg" alt="Institute Logo" className="w-10 h-10 object-contain rounded-xl shadow-sm border border-slate-200 dark:border-slate-700" />
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-800 dark:text-white leading-tight tracking-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                INSTITUTE OF COMPUTER SCIENCE
              </h1>
              <h2 className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 leading-tight">
                AND TECHNOLOGY CHOWBERIA
              </h2>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <HeaderThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Route */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/exam/:session_id" element={<ExamWorkspace />} />
          <Route path="/teacher" element={<TeacherDashboard />} />
        </Routes>
      </main>

      {/* Universal Footer */}
      <footer className="bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 py-4 mt-auto transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold gap-2">
          <span>⚡ Institute of Computer Science and Technology (ICST) Examination Portal</span>
          <span>Bilingual Evaluation & Live Invigilation System</span>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;
