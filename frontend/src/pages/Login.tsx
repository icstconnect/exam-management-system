import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../App';
import { UserCircle, KeyRound, ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';

export default function Login() {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [examId] = useState('00000000-0000-0000-0000-000000000000');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Student Portal - ICST Examination";
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    socket.emit('student_login', { student_id: studentId, password_provided: password, exam_id: examId });

    socket.once('login_success', (data: { session_id: string }) => {
      setIsLoading(false);
      navigate(`/exam/${data.session_id}`);
    });

    socket.once('login_error', (data: { message: string }) => {
      setIsLoading(false);
      setError(data.message);
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[72vh] px-4">
      <div className="w-full max-w-md bg-white dark:bg-[#111827] rounded-3xl shadow-xl dark:shadow-2xl dark:shadow-blue-950/20 overflow-hidden border border-slate-200/80 dark:border-slate-800 transition-all">
        {/* Bento Header Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-600 dark:via-indigo-700 dark:to-violet-800 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 opacity-10 text-white">
            <Sparkles size={120} />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 dark:bg-white/10 backdrop-blur-sm text-white text-xs font-bold mb-3 border border-white/20">
            <ShieldCheck size={14} /> Secure Examination Environment
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-1.5 tracking-tight">Student Login</h2>
          <p className="text-blue-100 font-medium text-xs sm:text-sm">Enter your credentials to enter your workspace</p>
        </div>
        
        <div className="p-6 sm:p-8">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 p-3.5 rounded-2xl text-xs font-bold mb-6 text-center border border-red-200 dark:border-red-900/60 animate-shake">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Student ID (Roll Number)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <UserCircle size={19} />
                </div>
                <input
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-3 bg-slate-50 dark:bg-[#1e293b]/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-bold text-sm"
                  placeholder="e.g. 104"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Examination Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <KeyRound size={19} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-11 py-3 bg-slate-50 dark:bg-[#1e293b]/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-bold text-sm"
                  placeholder="e.g. SOUVICK@104"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 focus:outline-none transition-colors"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <input type="hidden" value={examId} />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? 'Authenticating Session...' : 'Enter Examination Workspace'}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
