import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../App';
import { UserCircle, KeyRound, ArrowRight } from 'lucide-react';

export default function Login() {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [examId] = useState('00000000-0000-0000-0000-000000000000'); // Default or fetched from active exams
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Exam Portal";
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // In a real app, you'd fetch the active exam_id first.
    // For now, we simulate a login attempt via socket
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
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-gradient-vibrant p-8 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Student Login</h2>
          <p className="text-primary-100 font-medium text-sm">Welcome back! Ready for your exam?</p>
        </div>
        
        <div className="p-8">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium mb-6 text-center border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Student ID (Roll Number)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserCircle size={20} />
                </div>
                <input
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium"
                  placeholder="e.g. 030"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound size={20} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium"
                  placeholder="e.g. ISHIKA@030"
                />
              </div>
            </div>
            
            {/* Hidden Exam ID for now - In reality, would be a dropdown or auto-selected */}
            <input type="hidden" value={examId} />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 bg-gradient-vibrant hover:opacity-90 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Connecting...' : 'Start Exam'}
              {!isLoading && <ArrowRight size={20} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
