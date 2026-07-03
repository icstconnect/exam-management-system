const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/ExamWorkspace.tsx', 'utf8');

const targetStr = "className={`text-left px-6 py-5 rounded-2xl border-2 font-bold transition-all transform hover:scale-[1.01] ${\n\n                  </div>";
const replacementStr = `className={\`text-left px-6 py-5 rounded-2xl border-2 font-bold transition-all transform hover:scale-[1.01] \${
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

                  </div>`;

content = content.replace(targetStr, replacementStr);

fs.writeFileSync('frontend/src/pages/ExamWorkspace.tsx', content, 'utf8');
