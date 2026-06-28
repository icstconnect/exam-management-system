import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../App';
import { Languages, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

interface Question {
  question_id: string;
  question_type: 'MCQ' | 'FITB' | 'TF';
  question_text_en: string;
  question_text_bn: string;
  options_json: string[];
}

export default function ExamWorkspace() {
  const { session_id } = useParams();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<'WAITING' | 'STARTED' | 'PAUSED' | 'COMPLETED'>('WAITING');
  const [lang, setLang] = useState<'en' | 'bn'>('en');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!session_id) {
      navigate('/');
      return;
    }

    // Join session logic is handled at login, but we can emit a heartbeat or reconnect here
    socket.emit('workspace_ready', { session_id });

    socket.on('exam_started', (data: { questions: Question[], seconds_left: number }) => {
      setQuestions(data.questions);
      setSecondsLeft(data.seconds_left);
      setStatus('STARTED');
    });

    socket.on('exam_paused', () => {
      setStatus('PAUSED');
    });

    socket.on('exam_resumed', () => {
      setStatus('STARTED');
    });
    
    socket.on('exam_completed', () => {
      setStatus('COMPLETED');
    });

    socket.on('time_tick', (data: { seconds_left: number }) => {
      setSecondsLeft(data.seconds_left);
    });

    // Tab visibility violation handler
    const handleVisibilityChange = () => {
      if (document.hidden && status === 'STARTED') {
        socket.emit('tab_violation', { session_id });
        setStatus('PAUSED'); // Optimistically pause
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      socket.off('exam_started');
      socket.off('exam_paused');
      socket.off('exam_resumed');
      socket.off('exam_completed');
      socket.off('time_tick');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session_id, status, navigate]);

  const handleAnswerSelect = (question_id: string, option: string) => {
    setAnswers(prev => ({ ...prev, [question_id]: option }));
    // Instant write strategy
    socket.emit('submit_answer', { session_id, question_id, selected_option: option });
  };

  const formatTime = (totalSeconds: number | null) => {
    if (totalSeconds === null) return '--:--';
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (status === 'WAITING') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-24 h-24 mb-6 rounded-full bg-blue-100 flex items-center justify-center animate-pulse">
          <Clock className="text-primary-500" size={40} />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-800 mb-2">Waiting for Teacher</h2>
        <p className="text-slate-500 font-medium max-w-sm">
          Please wait quietly. The exam will start automatically when the teacher is ready.
        </p>
      </div>
    );
  }

  if (status === 'PAUSED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-24 h-24 mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle className="text-red-500" size={40} />
        </div>
        <h2 className="text-3xl font-extrabold text-red-600 mb-2">Screen Locked</h2>
        <p className="text-slate-600 font-medium max-w-sm mb-6">
          You have changed tabs or minimized the window. Please raise your hand and wait for the teacher to unlock your screen.
        </p>
      </div>
    );
  }
  
  if (status === 'COMPLETED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-24 h-24 mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="text-green-500" size={40} />
        </div>
        <h2 className="text-3xl font-extrabold text-green-600 mb-2">Exam Finished!</h2>
        <p className="text-slate-600 font-medium max-w-sm">
          Your answers have been saved successfully. You may now close this window.
        </p>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Exam Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-8 sticky top-20 z-40">
        <div className="flex items-center gap-3">
          <div className="bg-primary-50 p-2 rounded-xl text-primary-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Time Remaining</p>
            <p className={`text-2xl font-extrabold ${secondsLeft && secondsLeft < 300 ? 'text-red-500' : 'text-slate-800'}`}>
              {formatTime(secondsLeft)}
            </p>
          </div>
        </div>

        <button 
          onClick={() => setLang(l => l === 'en' ? 'bn' : 'en')}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold transition-colors"
        >
          <Languages size={20} />
          {lang === 'en' ? 'বাংলা' : 'English'}
        </button>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((q, index) => (
          <div key={q.question_id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-primary-100 text-primary-600 font-bold rounded-full flex items-center justify-center text-lg">
                {index + 1}
              </div>
              <div className="flex-grow">
                <h3 className="text-xl font-semibold text-slate-800 mb-6 mt-1">
                  {lang === 'en' ? q.question_text_en : q.question_text_bn}
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {q.options_json.map((option, optIdx) => {
                    const isSelected = answers[q.question_id] === option;
                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleAnswerSelect(q.question_id, option)}
                        className={`text-left px-5 py-4 rounded-xl border-2 font-medium transition-all ${
                          isSelected 
                            ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm' 
                            : 'border-slate-200 hover:border-primary-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        {option}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
