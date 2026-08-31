-- Add judgement question type for true/false questions
alter type public.question_type add value if not exists 'judgement';
