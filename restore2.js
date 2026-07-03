const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/ExamWorkspace.tsx', 'utf8');

const startStr = "{(currentQuestion.question_type === 'TF' ? ['True', 'False'] : (currentQuestion.options_json || [])).map((option, optIdx) => {";
const endStr = "{/* Navigation Controls */}";

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);

const replacement = `{(currentQuestion.question_type === 'TF' ? ['True', 'False'] : (currentQuestion.options_json || [])).map((option, optIdx) => {
                            const isSelected = answers[currentQuestion.question_id] === option;
                            return (
                              <button
                                key={optIdx}
                                onClick={() => handleAnswerSelect(currentQuestion.question_id, option)}
                                className={\`text-left px-6 py-5 rounded-2xl border-2 font-bold transition-all transform hover:scale-[1.01] \${
                                  isSelected 
                                    ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm' 
                                    : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50 text-slate-600'
                                }\`}
                              >
                                {currentQuestion.question_type === 'TF' ? (lang === 'bn' ? (option === 'True' ? 'সত্য' : 'মিথ্যা') : option) : option}
                              </button>
                            )
                          })}
                        </div>
                      </>
                    )}

                  </div>
                </div>
              </div>

              `;

content = content.slice(0, startIdx) + replacement + content.slice(endIdx);
fs.writeFileSync('frontend/src/pages/ExamWorkspace.tsx', content, 'utf8');
