const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/ExamWorkspace.tsx', 'utf8');

// 1. Add import
if (!content.includes('MatchQuestionViewer')) {
  const importInsert = "import { MatchQuestionViewer } from '../components/MatchQuestionViewer';\n";
  const lastImportIdx = content.lastIndexOf('import ');
  const insertIdx = content.indexOf('\n', lastImportIdx) + 1;
  content = content.slice(0, insertIdx) + importInsert + content.slice(insertIdx);
}

// 2. Remove activeMatchLeft state
content = content.replace("const [activeMatchLeft, setActiveMatchLeft] = useState<string | null>(null);\n  ", "");

// 3. Remove inline renderMatchQuestion function
const renderMatchStart = content.indexOf('const renderMatchQuestion = (q: Question) => {');
if (renderMatchStart !== -1) {
  const nextFuncStart = content.indexOf('const getOptionUsage', renderMatchStart);
  content = content.slice(0, renderMatchStart) + content.slice(nextFuncStart);
}

// 4. Update the render call
const oldRenderCall = 'renderMatchQuestion(currentQuestion)';
const newRenderCall = `<MatchQuestionViewer 
                        question={currentQuestion}
                        mapping={answers[currentQuestion.question_id] ? JSON.parse(answers[currentQuestion.question_id]) : {}}
                        onMappingChange={(qId, mappingStr) => handleAnswerSelect(qId, mappingStr)}
                        lang={lang}
                        uiText={UI_TEXT}
                      />`;
content = content.replace(oldRenderCall, newRenderCall);

fs.writeFileSync('frontend/src/pages/ExamWorkspace.tsx', content, 'utf8');
