const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/ExamWorkspace.tsx', 'utf8');

const uiTextStart = content.indexOf('const UI_TEXT = {');
const uiTextEnd = content.indexOf('};', uiTextStart) + 2;

const newUIText = `const getLocalizedSectionTitle = (title: string, lang: string) => {
  if (lang === 'en') return title;
  const t = title.toUpperCase();
  if (t.includes('MULTIPLE CHOICE')) return 'বহুনির্বাচনী প্রশ্ন';
  if (t.includes('FILL IN THE BLANKS')) return 'শূন্যস্থান পূরণ করো';
  if (t.includes('TRUE/ FALSE') || t.includes('TRUE/FALSE') || t.includes('TRUE / FALSE')) return 'সত্য/মিথ্যা নির্বাচন করো';
  if (t.includes('MATCH')) return 'বামদিকের সাথে ডানদিক মেলাও';
  return title;
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
    yourSubmission: "Your Submission:",
    timeRemaining: "TIME REMAINING",
    palette: "Palette",
    answered: "Answered",
    notVisited: "Not Visited / Left",
    question: "QUESTION",
    waitingForTeacher: "Waiting for Teacher",
    waitQuietly: "Please wait quietly. The exam will start automatically when the teacher is ready.",
    screenLocked: "Screen Locked",
    pausedDesc: "Your exam has been paused. Please wait for the teacher to resume."
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
    yourSubmission: "আপনার জমা দেওয়া উত্তর:",
    timeRemaining: "অবশিষ্ট সময়",
    palette: "প্যালেট",
    answered: "উত্তর দেওয়া হয়েছে",
    notVisited: "দেখা হয়নি / বাকি আছে",
    question: "প্রশ্ন",
    waitingForTeacher: "শিক্ষকের জন্য অপেক্ষা করা হচ্ছে",
    waitQuietly: "দয়া করে শান্ত হয়ে অপেক্ষা করুন। শিক্ষক প্রস্তুত হলে পরীক্ষা স্বয়ংক্রিয়ভাবে শুরু হবে।",
    screenLocked: "স্ক্রিন লক করা হয়েছে",
    pausedDesc: "আপনার পরীক্ষা বিরতিতে আছে। শিক্ষকের পুনরায় শুরু করার জন্য অপেক্ষা করুন।"
  }
};`;

content = content.substring(0, uiTextStart) + newUIText + content.substring(uiTextEnd);

// Replacements in JSX
content = content.replace(
  'TIME REMAINING',
  "{lang === 'bn' ? UI_TEXT.bn.timeRemaining : UI_TEXT.en.timeRemaining}"
);

content = content.replace(
  '<span>Palette</span>',
  "<span>{lang === 'bn' ? UI_TEXT.bn.palette : UI_TEXT.en.palette}</span>"
);

content = content.replace(
  '<span>Answered</span>',
  "<span>{lang === 'bn' ? UI_TEXT.bn.answered : UI_TEXT.en.answered}</span>"
);

content = content.replace(
  '<span>Not Visited / Left</span>',
  "<span>{lang === 'bn' ? UI_TEXT.bn.notVisited : UI_TEXT.en.notVisited}</span>"
);

content = content.replace(
  '<span className="text-slate-400">Question {currentQuestionIndex + 1}</span>',
  '<span className="text-slate-400">{lang === \'bn\' ? UI_TEXT.bn.question : UI_TEXT.en.question} {currentQuestionIndex + 1}</span>'
);

content = content.replace(
  '<span>{currentSection.title}</span>',
  '<span>{getLocalizedSectionTitle(currentSection.title, lang)}</span>'
);

content = content.replace(
  '{sec.title}',
  '{getLocalizedSectionTitle(sec.title, lang)}'
);

content = content.replace(
  'Waiting for Teacher',
  "{lang === 'bn' ? UI_TEXT.bn.waitingForTeacher : UI_TEXT.en.waitingForTeacher}"
);

content = content.replace(
  'Please wait quietly. The exam will start automatically when the teacher is ready.',
  "{lang === 'bn' ? UI_TEXT.bn.waitQuietly : UI_TEXT.en.waitQuietly}"
);

content = content.replace(
  'Screen Locked',
  "{lang === 'bn' ? UI_TEXT.bn.screenLocked : UI_TEXT.en.screenLocked}"
);

content = content.replace(
  'Your exam has been paused. Please wait for the teacher to resume.',
  "{lang === 'bn' ? UI_TEXT.bn.pausedDesc : UI_TEXT.en.pausedDesc}"
);

fs.writeFileSync('frontend/src/pages/ExamWorkspace.tsx', content, 'utf8');
