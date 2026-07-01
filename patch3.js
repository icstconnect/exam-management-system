const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/ExamWorkspace.tsx', 'utf8');

// 1. Insert activeMatchLeft state
const stateInsertIdx = content.indexOf('const [activeBlank, setActiveBlank]');
const stateCode = "const [activeMatchLeft, setActiveMatchLeft] = useState<string | null>(null);\n  ";
content = content.slice(0, stateInsertIdx) + stateCode + content.slice(stateInsertIdx);

// 2. Insert renderMatchQuestion function
const renderMatchInsertIdx = content.indexOf('const getOptionUsage = (option: string) => {');
const renderMatchCode = `const renderMatchQuestion = (q: Question) => {
    let options: any = { left: [], right: [] };
    try {
      options = q.options_json || { left: [], right: [] };
    } catch(e) {}
    
    const leftCol: string[] = options.left || [];
    const rightCol: string[] = options.right || [];
    
    let mapping: Record<string, string> = {};
    try {
      mapping = answers[q.question_id] ? JSON.parse(answers[q.question_id]) : {};
    } catch(e) {}
    
    const handleLeftClick = (leftText: string) => {
      if (activeMatchLeft === leftText) {
        const newMapping = { ...mapping };
        delete newMapping[leftText];
        handleAnswerSelect(q.question_id, JSON.stringify(newMapping));
        setActiveMatchLeft(null);
      } else {
        setActiveMatchLeft(leftText);
      }
    };
    
    const handleRightClick = (rightText: string) => {
      if (!activeMatchLeft) return;
      const newMapping = { ...mapping };
      for (const k in newMapping) {
        if (newMapping[k] === rightText) delete newMapping[k];
      }
      newMapping[activeMatchLeft] = rightText;
      handleAnswerSelect(q.question_id, JSON.stringify(newMapping));
      setActiveMatchLeft(null);
    };

    return (
      <div className="mt-8">
        <h3 className="text-2xl font-semibold text-slate-800 mb-4 mt-2 leading-relaxed">
          {getLocalizedText(q.question_text_en, q.question_text_bn, lang)}
        </h3>
        <p className="text-sm text-slate-500 mb-6 font-bold">{lang === 'bn' ? UI_TEXT.bn.clickLeftRight : UI_TEXT.en.clickLeftRight}</p>
        <div className="grid grid-cols-2 gap-8">
          <div className="flex flex-col gap-3">
            {leftCol.map((item, idx) => {
              const isMatched = mapping[item] !== undefined;
              const isActive = activeMatchLeft === item;
              return (
                <button
                  key={\`l-\${idx}\`}
                  onClick={() => handleLeftClick(item)}
                  className={\`p-4 text-left rounded-xl border-2 font-bold transition-colors \${isActive ? 'border-primary-500 bg-primary-50 text-primary-700' : isMatched ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 hover:border-primary-300 text-slate-700'}\`}
                >
                  {item}
                  {isMatched && <span className="block text-xs text-green-600 mt-1">{lang === 'bn' ? 'ম্যাচ করা হয়েছে: ' : 'Matched: '} {mapping[item]}</span>}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-3">
            {rightCol.map((item, idx) => {
              const isMatched = Object.values(mapping).includes(item);
              return (
                <button
                  key={\`r-\${idx}\`}
                  onClick={() => handleRightClick(item)}
                  className={\`p-4 text-left rounded-xl border-2 font-bold transition-colors \${activeMatchLeft ? 'border-dashed border-primary-400 hover:border-primary-500 hover:bg-primary-50 cursor-pointer text-slate-700' : isMatched ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-700 cursor-default'}\`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  `;
content = content.slice(0, renderMatchInsertIdx) + renderMatchCode + content.slice(renderMatchInsertIdx);

// 3. Hook it up in the render function
const renderFitbRegex = /\{currentQuestion\.question_type === 'FITB' \? \([\s\S]*?renderFitbQuestion\(currentQuestion\)[\s\S]*?\) : \(/;
content = content.replace(renderFitbRegex, `{currentQuestion.question_type === 'FITB' ? (
                      renderFitbQuestion(currentQuestion)
                    ) : currentQuestion.question_type === 'MATCH' ? (
                      renderMatchQuestion(currentQuestion)
                    ) : (`);

// 4. Update the Question type to include MATCH
content = content.replace("question_type: 'MCQ' | 'FITB' | 'TF';", "question_type: 'MCQ' | 'FITB' | 'TF' | 'MATCH';");
content = content.replace("section_type: 'MCQ' | 'FITB' | 'TF';", "section_type: 'MCQ' | 'FITB' | 'TF' | 'MATCH';");

fs.writeFileSync('frontend/src/pages/ExamWorkspace.tsx', content, 'utf8');
