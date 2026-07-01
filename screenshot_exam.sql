DO $$
DECLARE
    new_exam_id UUID;
    fitb_section_id UUID;
    mcq_section_id UUID;
    tf_section_id UUID;
    match_section_id UUID;
BEGIN
    -- 1. Create the Exam
    INSERT INTO exams (title, duration_minutes, target_batch, full_marks, status)
    VALUES ('TERM 2: MS Word, MS PowerPoint', 40, 'V,VI Batch 1', 20, 'DRAFT')
    RETURNING exam_id INTO new_exam_id;

    -- 2. Create Sections
    -- FITB Section (5 marks) - As seen in screenshot
    INSERT INTO exam_sections (exam_id, title, section_marks, section_type)
    VALUES (new_exam_id, 'Fill in the blanks.', 5, 'FITB')
    RETURNING section_id INTO fitb_section_id;

    -- MCQ Section (5 marks)
    INSERT INTO exam_sections (exam_id, title, section_marks, section_type)
    VALUES (new_exam_id, 'Multiple Choice Questions.', 5, 'MCQ')
    RETURNING section_id INTO mcq_section_id;

    -- TF Section (5 marks)
    INSERT INTO exam_sections (exam_id, title, section_marks, section_type)
    VALUES (new_exam_id, 'True or False.', 5, 'TF')
    RETURNING section_id INTO tf_section_id;

    -- MATCH Section (5 marks)
    INSERT INTO exam_sections (exam_id, title, section_marks, section_type)
    VALUES (new_exam_id, 'Left-Right Matching.', 5, 'MATCH')
    RETURNING section_id INTO match_section_id;

    -- 3. Insert FITB Questions (From Screenshot + Extras)
    INSERT INTO questions (exam_id, section_id, question_type, question_text_en, question_text_bn, options_json, correct_answer, marks) VALUES
    (new_exam_id, fitb_section_id, 'FITB', 'The shortcut combination used to instantly Paste a copied segment of text into a new location is ___.', 'কপি করা কোনো লেখা নতুন কোনো জায়গায় তৎক্ষণাৎ বসানোর (Paste করার) শর্টকাট কম্বিনেশন হলো ___।', '[]', '["Ctrl + V"]', 1),
    (new_exam_id, fitb_section_id, 'FITB', 'The tool inside the Paragraph group that flushes your lines evenly along both the left and right margins, like a professional school textbook, is called ___ Alignment.', 'প্যারাগ্রাফ গ্রুপের অন্তর্গত যে টুলটি লেখার দুই পাশের মার্জিন সমান করে সাজায় (যেমন পাঠ্যবইয়ে থাকে), তাকে ___ অ্যালাইনমেন্ট বলা হয়।', '[]', '["Justify"]', 1),
    (new_exam_id, fitb_section_id, 'FITB', 'Shreya accidentally dragged an image behind a solid colored background shape. She can bring the hidden image back to the top visible layer using the ___ command under the Arrange tool settings.', 'শ্রেয়া ভুলবশত একটি রঙিন ব্যাকগ্রাউন্ড শেপের পেছনে একটি ছবি ড্র্যাগ করে ফেলেছে। সে অ্যারেঞ্জ টুল সেটিংসের অধীনে থাকা ___ কমান্ডটি ব্যবহার করে লুকানো ছবিটিকে সবার উপরে দৃশ্যমান স্তরে ফিরিয়ে আনতে পারবে।', '[]', '["Bring to Front"]', 1),
    (new_exam_id, fitb_section_id, 'FITB', 'In MS PowerPoint, the ___ tab contains the options to add a new slide to your presentation.', 'MS PowerPoint-এ, আপনার প্রেজেন্টেশনে একটি নতুন স্লাইড যোগ করার বিকল্পগুলো ___ ট্যাবে থাকে।', '[]', '["Home"]', 1),
    (new_exam_id, fitb_section_id, 'FITB', 'To start a PowerPoint slide show from the very first slide, you press the ___ key on your keyboard.', 'পাওয়ারপয়েন্ট স্লাইড শো একেবারে প্রথম স্লাইড থেকে শুরু করতে, আপনাকে কীবোর্ডের ___ কী চাপতে হবে।', '[]', '["F5"]', 1);

    -- 4. Insert MCQ Questions
    INSERT INTO questions (exam_id, section_id, question_type, question_text_en, question_text_bn, options_json, correct_answer, marks) VALUES
    (new_exam_id, mcq_section_id, 'MCQ', 'Which feature allows you to change the case of selected text to ALL CAPS in MS Word?', 'MS Word-এ নির্বাচিত টেক্সটের কেস পরিবর্তন করে ALL CAPS করতে কোন বৈশিষ্ট্যটি ব্যবহার করা হয়?', '["Change Case", "Font Size", "Text Effects", "WordArt"]', 'Change Case', 1),
    (new_exam_id, mcq_section_id, 'MCQ', 'What is the primary use of MS PowerPoint?', 'MS PowerPoint-এর প্রধান ব্যবহার কী?', '["Word Processing", "Data Calculation", "Creating Presentations", "Editing Images"]', 'Creating Presentations', 1),
    (new_exam_id, mcq_section_id, 'MCQ', 'In MS Word, which shortcut key is used to Undo the last action?', 'MS Word-এ শেষ কাজটি বাতিল (Undo) করতে কোন শর্টকাট কী ব্যবহার করা হয়?', '["Ctrl + Z", "Ctrl + Y", "Ctrl + X", "Ctrl + U"]', 'Ctrl + Z', 1),
    (new_exam_id, mcq_section_id, 'MCQ', 'What is a single page of a PowerPoint presentation called?', 'পাওয়ারপয়েন্ট প্রেজেন্টেশনের একটি একক পৃষ্ঠাকে কী বলা হয়?', '["Slide", "Page", "Sheet", "Canvas"]', 'Slide', 1),
    (new_exam_id, mcq_section_id, 'MCQ', 'Which feature in Word is used to check spelling and grammar?', 'Word-এ বানান এবং ব্যাকরণ পরীক্ষা করতে কোন বৈশিষ্ট্যটি ব্যবহার করা হয়?', '["AutoFormat", "Spell Check", "Spelling & Grammar", "Word Count"]', 'Spelling & Grammar', 1);

    -- 5. Insert TF Questions
    INSERT INTO questions (exam_id, section_id, question_type, question_text_en, question_text_bn, options_json, correct_answer, marks) VALUES
    (new_exam_id, tf_section_id, 'TF', 'You can add video and audio files to a MS PowerPoint presentation.', 'আপনি MS PowerPoint প্রেজেন্টেশনে ভিডিও এবং অডিও ফাইল যোগ করতে পারেন।', '[]', 'True', 1),
    (new_exam_id, tf_section_id, 'TF', 'MS Word automatically saves your document every 1 second by default without setting it up.', 'MS Word কোনো সেটআপ ছাড়াই ডিফল্টরূপে প্রতি ১ সেকেন্ড পর পর আপনার ডকুমেন্ট স্বয়ংক্রিয়ভাবে সেভ করে।', '[]', 'False', 1),
    (new_exam_id, tf_section_id, 'TF', 'Slide Sorter view displays miniature versions of all slides in a presentation.', 'স্লাইড সর্টার ভিউ একটি প্রেজেন্টেশনের সমস্ত স্লাইডের ক্ষুদ্র সংস্করণ প্রদর্শন করে।', '[]', 'True', 1),
    (new_exam_id, tf_section_id, 'TF', 'In MS Word, Watermarks can only be text, they cannot be pictures.', 'MS Word-এ জলছাপ (Watermarks) শুধুমাত্র টেক্সট হতে পারে, এগুলো ছবি হতে পারে না।', '[]', 'False', 1),
    (new_exam_id, tf_section_id, 'TF', 'The shortcut Ctrl+S is used to Save the current document or presentation.', 'বর্তমান ডকুমেন্ট বা প্রেজেন্টেশন সেভ করার জন্য Ctrl+S শর্টকাট ব্যবহার করা হয়।', '[]', 'True', 1);

    -- 6. Insert MATCH Question
    INSERT INTO questions (exam_id, section_id, question_type, question_text_en, question_text_bn, options_json, correct_answer, marks) VALUES
    (new_exam_id, match_section_id, 'MATCH', 'Match the MS Word shortcut keys to their correct functions:', 'MS Word-এর শর্টকাট কীগুলোকে তাদের সঠিক কাজের সাথে মিল করুন:', '[]', '{"Ctrl + B": "Bold", "Ctrl + I": "Italic", "Ctrl + U": "Underline", "Ctrl + C": "Copy", "Ctrl + X": "Cut"}', 5);

END $$;
