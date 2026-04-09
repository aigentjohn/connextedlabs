-- =====================================================
-- Surveys / Quizzes / Assessments
--
-- Three modes in one feature set, controlled by survey_type:
--   survey     — multi-question data collection, no scoring
--   quiz       — questions with correct answers and point scoring
--   assessment — weighted answers that resolve to one of N conclusions
--
-- Scoping:
--   Standalone  — circle_id IS NULL AND program_id IS NULL
--   Circle      — circle_id IS NOT NULL
--   Program     — program_id IS NOT NULL (course/program scoped, future)
--
-- Pathway integration:
--   pathway_steps.step_type = 'survey' references surveys.id via step_id
--   Quiz steps can optionally require passing_score to mark complete
-- =====================================================


-- ─── surveys ───────────────────────────────────────────────────────────────────

CREATE TABLE public.surveys (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name                  text        NOT NULL,
  slug                  text        NOT NULL UNIQUE,
  description           text,
  short_description     text,

  -- Mode
  survey_type           text        NOT NULL DEFAULT 'survey'
                          CHECK (survey_type IN ('survey', 'quiz', 'assessment')),

  -- Status & lifecycle
  status                text        NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'active', 'closed')),
  closes_at             timestamptz,

  -- Visibility & access (standard container pattern)
  visibility            text        NOT NULL DEFAULT 'member'
                          CHECK (visibility IN ('public', 'member', 'unlisted', 'private')),
  member_ids            uuid[]      NOT NULL DEFAULT '{}',
  admin_ids             uuid[]      NOT NULL DEFAULT '{}',
  tags                  text[]      NOT NULL DEFAULT '{}',

  -- Scoping (mutually exclusive — only one can be set)
  circle_id             uuid        REFERENCES public.circles(id)   ON DELETE SET NULL,
  program_id            uuid        REFERENCES public.programs(id)  ON DELETE SET NULL,

  -- Quiz settings
  passing_score         integer,    -- minimum score to pass (quiz only)

  -- Display settings
  show_results_after    text        NOT NULL DEFAULT 'submission'
                          CHECK (show_results_after IN ('submission', 'close', 'never')),
  allow_anonymous       boolean     NOT NULL DEFAULT false,
  randomize_questions   boolean     NOT NULL DEFAULT false,

  -- Ownership
  created_by            uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT surveys_one_scope CHECK (
    (circle_id IS NULL) OR (program_id IS NULL)
  )
);

CREATE INDEX surveys_circle_id_idx  ON public.surveys(circle_id)  WHERE circle_id  IS NOT NULL;
CREATE INDEX surveys_program_id_idx ON public.surveys(program_id) WHERE program_id IS NOT NULL;
CREATE INDEX surveys_created_by_idx ON public.surveys(created_by);
CREATE INDEX surveys_status_idx     ON public.surveys(status);


-- ─── survey_questions ──────────────────────────────────────────────────────────

CREATE TABLE public.survey_questions (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id       uuid    NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  order_index     integer NOT NULL DEFAULT 0,

  -- Question content
  question_type   text    NOT NULL
                    CHECK (question_type IN (
                      'multiple_choice',  -- pick one
                      'multi_select',     -- pick many
                      'text',             -- short free text
                      'long_text',        -- paragraph free text
                      'rating',           -- 1–5 or 1–10 scale
                      'yes_no'            -- boolean
                    )),
  text            text    NOT NULL,
  description     text,                   -- optional helper text under question
  is_required     boolean NOT NULL DEFAULT true,

  -- Options (multiple_choice, multi_select, yes_no)
  -- Array of {id: uuid, text: string}
  options         jsonb   NOT NULL DEFAULT '[]',

  -- Quiz fields
  -- Array of option IDs that are correct answers
  correct_option_ids  jsonb   NOT NULL DEFAULT '[]',
  points              integer NOT NULL DEFAULT 1,
  explanation         text,               -- shown after submission explaining correct answer

  -- Assessment fields
  -- {option_id: {conclusion_key: weight, ...}, ...}
  weights         jsonb   NOT NULL DEFAULT '{}',

  -- Rating scale config
  rating_min      integer NOT NULL DEFAULT 1,
  rating_max      integer NOT NULL DEFAULT 5,
  rating_min_label text,
  rating_max_label text,

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX survey_questions_survey_id_idx ON public.survey_questions(survey_id);
CREATE INDEX survey_questions_order_idx     ON public.survey_questions(survey_id, order_index);


-- ─── survey_conclusions ────────────────────────────────────────────────────────
-- Assessment mode only — the 3-4 possible outcomes

CREATE TABLE public.survey_conclusions (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id       uuid    NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  key             text    NOT NULL,       -- internal key e.g. 'analytical', 'creative'
  title           text    NOT NULL,       -- shown to member e.g. 'The Analytical Leader'
  description     text    NOT NULL,       -- rich explanation of this conclusion
  recommendation  text,                   -- suggested next steps / pathways
  color           text    NOT NULL DEFAULT 'from-indigo-500 to-purple-600',
  icon            text,                   -- lucide icon name
  order_index     integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (survey_id, key)
);

CREATE INDEX survey_conclusions_survey_id_idx ON public.survey_conclusions(survey_id);


-- ─── survey_responses ──────────────────────────────────────────────────────────
-- One row per member per survey — captures all answers in one submission

CREATE TABLE public.survey_responses (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id       uuid        NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,

  -- Answers stored as {question_id: answer_value}
  -- answer_value is string | string[] | number depending on question_type
  answers         jsonb       NOT NULL DEFAULT '{}',

  -- Quiz results
  score           integer,                -- total points earned
  max_score       integer,                -- total possible points
  passed          boolean,                -- score >= surveys.passing_score

  -- Assessment result
  conclusion_key  text,                   -- key of the winning conclusion

  submitted_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (survey_id, user_id)             -- one submission per member
);

CREATE INDEX survey_responses_survey_id_idx ON public.survey_responses(survey_id);
CREATE INDEX survey_responses_user_id_idx   ON public.survey_responses(user_id);


-- ─── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.surveys            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_conclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses   ENABLE ROW LEVEL SECURITY;

-- surveys: active surveys visible to all authenticated users
--          admins can see all (including drafts) and write
CREATE POLICY "surveys_read_active"
  ON public.surveys FOR SELECT
  USING (status = 'active' AND auth.uid() IS NOT NULL);

CREATE POLICY "surveys_read_admin"
  ON public.surveys FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super'))
  );

CREATE POLICY "surveys_write_admin"
  ON public.surveys FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super'))
  );

-- survey_questions: readable by all authenticated users (needed to render the survey)
CREATE POLICY "survey_questions_read_authenticated"
  ON public.survey_questions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "survey_questions_write_admin"
  ON public.survey_questions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super'))
  );

-- survey_conclusions: readable by all authenticated users
CREATE POLICY "survey_conclusions_read_authenticated"
  ON public.survey_conclusions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "survey_conclusions_write_admin"
  ON public.survey_conclusions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super'))
  );

-- survey_responses: users read and insert their own responses
--                   admins can read all responses
CREATE POLICY "survey_responses_read_own"
  ON public.survey_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "survey_responses_read_admin"
  ON public.survey_responses FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super'))
  );

CREATE POLICY "survey_responses_insert_own"
  ON public.survey_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ─── pathway_steps: add 'survey' as a valid step_type ─────────────────────────
-- The existing check constraint on pathway_steps.step_type needs to include 'survey'.
-- Drop and recreate the constraint to add the new value.

DO $$
BEGIN
  -- Drop the existing check constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'pathway_steps'
      AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%step_type%'
  ) THEN
    ALTER TABLE public.pathway_steps
      DROP CONSTRAINT IF EXISTS pathway_steps_step_type_check;
  END IF;

  -- Add updated constraint including 'survey'
  ALTER TABLE public.pathway_steps
    ADD CONSTRAINT pathway_steps_step_type_check
    CHECK (step_type IN ('course', 'program', 'activity', 'survey'));
END $$;
