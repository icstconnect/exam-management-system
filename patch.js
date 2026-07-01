const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/ExamWorkspace.tsx', 'utf8');

const insertIndex = content.indexOf('const MatchQuestion');
const helpers = `
const getLocalizedText = (textEn: string, textBn: string, currentLang: string) => {
  if (currentLang === 'bn' && textBn && textBn.trim() !== '') return textBn;
  if (currentLang === 'en' && textEn && textEn.trim() !== '') return textEn;
  return textEn || textBn || '';
};

const UI_TEXT = {
  en: {
    next: "Next",
    previous: "Previous",
    submit: "Submit Exam",
    submitConfirm: "Submit Exam?",
    submitDesc: "Are you sure you want to submit your exam? You cannot change your answers after submitting.",
    cancel: "Cancel",
    yesSubmit: "Yes, Submit",
    clear: "Clear Match",
    noAnswer: "No Answer Submitted",
    studentResponse: "Student Response Sheet (Not Evaluated)",
    clickLeftRight: "Click a left item, then a right item to draw a line. Double-click a left item to remove its match.",
    yourSubmission: "Your Submission:"
  },
  bn: {
    next: "পরবর্তী",
    previous: "পূর্ববর্তী",
    submit: "পরীক্ষা জমা দিন",
    submitConfirm: "পরীক্ষা জমা দেবেন?",
    submitDesc: "আপনি কি আপনার পরীক্ষা জমা দিতে নিশ্চিত? জমা দেওয়ার পরে আপনি আপনার উত্তর পরিবর্তন করতে পারবেন না।",
    cancel: "বাতিল",
    yesSubmit: "হ্যাঁ, জমা দিন",
    clear: "ম্যাচ মুছুন",
    noAnswer: "কোনো উত্তর জমা দেওয়া হয়নি",
    studentResponse: "শিক্ষার্থীর উত্তরপত্র (মূল্যায়ন করা হয়নি)",
    clickLeftRight: "একটি লাইন আঁকতে বাম দিকের আইটেম এবং তারপর ডান দিকের আইটেমে ক্লিক করুন। ম্যাচ মুছতে বাম আইটেমে ডাবল-ক্লিক করুন।",
    yourSubmission: "আপনার জমা দেওয়া উত্তর:"
  }
};

`;
content = content.slice(0, insertIndex) + helpers + content.slice(insertIndex);

content = content.replace(
  "const MatchQuestion = ({ question, savedMatches, onMatchChange }: { question: any, savedMatches: Record<string, string>, onMatchChange: (matches: Record<string, string>) => void }) => {",
  "const MatchQuestion = ({ question, savedMatches, onMatchChange, lang }: { question: any, savedMatches: Record<string, string>, onMatchChange: (matches: Record<string, string>) => void, lang: 'en' | 'bn' }) => {"
);
content = content.replace(
  "Click a left item, then a right item to draw a line. Double-click a left item to remove its match.",
  "{lang === 'bn' ? UI_TEXT.bn.clickLeftRight : UI_TEXT.en.clickLeftRight}"
);
content = content.replace(
  "const partsEn = q.question_text_en.split(/_{2,}/);",
  "const text = getLocalizedText(q.question_text_en, q.question_text_bn, lang);\n      const partsEn = text.split(/_{2,}/);"
);
content = content.replace(
  "const partsEn = q.question_text_en.split(/_{2,}/);",
  "const text = getLocalizedText(q.question_text_en, q.question_text_bn, lang);\n        const partsEn = text.split(/_{2,}/);"
);
content = content.replace(
  "const text = lang === 'en' ? q.question_text_en : q.question_text_bn;",
  "const text = getLocalizedText(q.question_text_en, q.question_text_bn, lang);"
);
content = content.replace(
  "Student Response Sheet (Not Evaluated)",
  "{lang === 'bn' ? UI_TEXT.bn.studentResponse : UI_TEXT.en.studentResponse}"
);
content = content.replace(
  "q.question_text_en.split(/_{2,}/).map((part: string, pIdx: number, partsArr: string[]) => (",
  "getLocalizedText(q.question_text_en, q.question_text_bn, lang).split(/_{2,}/).map((part: string, pIdx: number, partsArr: string[]) => ("
);
content = content.replace(
  "q.question_text_en",
  "getLocalizedText(q.question_text_en, q.question_text_bn, lang)"
);
content = content.replace(
  "Your Submission:",
  "{lang === 'bn' ? UI_TEXT.bn.yourSubmission : UI_TEXT.en.yourSubmission}"
);
content = content.replaceAll(
  "'No Answer Submitted'",
  "(lang === 'bn' ? UI_TEXT.bn.noAnswer : UI_TEXT.en.noAnswer)"
);
content = content.replaceAll(
  "No Answer Submitted",
  "{lang === 'bn' ? UI_TEXT.bn.noAnswer : UI_TEXT.en.noAnswer}"
);
content = content.replace(
  "Submit Exam",
  "{lang === 'bn' ? UI_TEXT.bn.submit : UI_TEXT.en.submit}"
);
content = content.replace(
  "Submit Exam",
  "{lang === 'bn' ? UI_TEXT.bn.submit : UI_TEXT.en.submit}"
);
content = content.replace(
  "lang === 'en' ? currentQuestion.question_text_en : currentQuestion.question_text_bn",
  "getLocalizedText(currentQuestion.question_text_en, currentQuestion.question_text_bn, lang)"
);
content = content.replace(
  "<MatchQuestion \n                            question={currentQuestion} ",
  "<MatchQuestion \n                            question={currentQuestion} lang={lang} "
);
content = content.replace(
  "lang === 'en' ? currentQuestion.question_text_en : currentQuestion.question_text_bn",
  "getLocalizedText(currentQuestion.question_text_en, currentQuestion.question_text_bn, lang)"
);
content = content.replace(
  "Previous",
  "{lang === 'bn' ? UI_TEXT.bn.previous : UI_TEXT.en.previous}"
);
content = content.replace(
  "Next",
  "{lang === 'bn' ? UI_TEXT.bn.next : UI_TEXT.en.next}"
);
content = content.replace(
  "Submit Exam?",
  "{lang === 'bn' ? UI_TEXT.bn.submitConfirm : UI_TEXT.en.submitConfirm}"
);
content = content.replace(
  "Are you sure you want to submit your exam? You cannot change your answers after submitting.",
  "{lang === 'bn' ? UI_TEXT.bn.submitDesc : UI_TEXT.en.submitDesc}"
);
content = content.replace(
  "Cancel",
  "{lang === 'bn' ? UI_TEXT.bn.cancel : UI_TEXT.en.cancel}"
);
content = content.replace(
  "Yes, Submit",
  "{lang === 'bn' ? UI_TEXT.bn.yesSubmit : UI_TEXT.en.yesSubmit}"
);

fs.writeFileSync('frontend/src/pages/ExamWorkspace.tsx', content, 'utf8');
