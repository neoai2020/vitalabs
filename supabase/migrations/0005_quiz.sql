-- Phase 2 quiz: questions + options. The branching logic in
-- src/data/quizData.ts uses TS predicate functions which can't be
-- serialised to JSONB. This migration captures the editable parts
-- (title, subtitle, image, options) so admins can tweak copy without
-- a code change. Conditional visibility stays in code for now.

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  brand brand not null,
  key text not null,
  gender text,
  title text not null,
  subtitle text,
  image text,
  type text not null default 'question' check (type in ('question', 'interstitial')),
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand, key, gender)
);

create trigger quiz_questions_touch_updated_at
  before update on public.quiz_questions
  for each row execute function public.touch_updated_at();

alter table public.quiz_questions enable row level security;

create policy "anyone reads quiz_questions" on public.quiz_questions
  for select using (true);

create policy "admins write quiz_questions" on public.quiz_questions
  for all using (public.is_admin()) with check (public.is_admin());


create table public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  label text not null,
  value text not null,
  icon text,
  weights jsonb not null default '{}'::jsonb,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

create index quiz_options_question_id on public.quiz_options (question_id, sort_order);

alter table public.quiz_options enable row level security;

create policy "anyone reads quiz_options" on public.quiz_options
  for select using (true);

create policy "admins write quiz_options" on public.quiz_options
  for all using (public.is_admin()) with check (public.is_admin());
