-- =====================================================
-- Interactive Journey Item Types
--
-- Adds five new content types usable only as journey steps:
--   poll             — single-question vote with live aggregate results (reuses surveys)
--   reflection       — private journaling prompt tied to a journey step
--   assignment       — structured submission task (text or link)
--   faq              — curated Q&A accordion
--   schedule_picker  — Doodle-style availability grid
-- =====================================================


-- ─── surveys: add 'poll' type ────────────────────────────────────────────────

ALTER TABLE public.surveys
  DROP CONSTRAINT surveys_survey_type_check;

ALTER TABLE public.surveys
  ADD CONSTRAINT surveys_survey_type_check
    CHECK (survey_type IN ('survey', 'quiz', 'assessment', 'poll'));

ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS show_results_before_vote boolean NOT NULL DEFAULT false;


-- ─── reflections ─────────────────────────────────────────────────────────────

CREATE TABLE public.reflections (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,
  prompt       text        NOT NULL,
  description  text,
  created_by   uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.reflection_responses (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reflection_id   uuid        NOT NULL REFERENCES public.reflections(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES public.users(id)        ON DELETE CASCADE,
  content         text        NOT NULL,
  shared_with_admin boolean   NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reflection_id, user_id)
);

CREATE INDEX reflection_responses_reflection_id_idx ON public.reflection_responses(reflection_id);
CREATE INDEX reflection_responses_user_id_idx       ON public.reflection_responses(user_id);


-- ─── assignments ─────────────────────────────────────────────────────────────

CREATE TABLE public.assignments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text        NOT NULL,
  description     text,
  rubric          text,
  due_at          timestamptz,
  allow_late      boolean     NOT NULL DEFAULT true,
  submission_type text        NOT NULL DEFAULT 'text'
                    CHECK (submission_type IN ('text', 'link', 'both')),
  created_by      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.assignment_submissions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id   uuid        NOT NULL REFERENCES public.assignments(id)   ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES public.users(id)          ON DELETE CASCADE,
  content         text,
  link_url        text,
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  score           integer,
  feedback        text,
  reviewed_by     uuid        REFERENCES public.users(id),
  reviewed_at     timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, user_id)
);

CREATE INDEX assignment_submissions_assignment_id_idx ON public.assignment_submissions(assignment_id);
CREATE INDEX assignment_submissions_user_id_idx       ON public.assignment_submissions(user_id);


-- ─── faqs ────────────────────────────────────────────────────────────────────

CREATE TABLE public.faqs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  description text,
  created_by  uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.faq_items (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  faq_id      uuid        NOT NULL REFERENCES public.faqs(id) ON DELETE CASCADE,
  question    text        NOT NULL,
  answer      text        NOT NULL,
  order_index integer     NOT NULL DEFAULT 0,
  tags        text[]      NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX faq_items_faq_id_idx ON public.faq_items(faq_id);


-- ─── schedule_polls ──────────────────────────────────────────────────────────

CREATE TABLE public.schedule_polls (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title              text        NOT NULL,
  description        text,
  closes_at          timestamptz,
  confirmed_slot_id  uuid,       -- filled when admin confirms a slot (FK added below)
  created_by         uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.schedule_slots (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_poll_id uuid    NOT NULL REFERENCES public.schedule_polls(id) ON DELETE CASCADE,
  label            text    NOT NULL,
  order_index      integer NOT NULL DEFAULT 0
);

ALTER TABLE public.schedule_polls
  ADD CONSTRAINT schedule_polls_confirmed_slot_fk
    FOREIGN KEY (confirmed_slot_id) REFERENCES public.schedule_slots(id)
    ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE public.schedule_responses (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_poll_id uuid    NOT NULL REFERENCES public.schedule_polls(id) ON DELETE CASCADE,
  slot_id          uuid    NOT NULL REFERENCES public.schedule_slots(id) ON DELETE CASCADE,
  user_id          uuid    NOT NULL REFERENCES public.users(id)           ON DELETE CASCADE,
  available        boolean NOT NULL DEFAULT true,
  UNIQUE (slot_id, user_id)
);

CREATE INDEX schedule_slots_poll_id_idx      ON public.schedule_slots(schedule_poll_id);
CREATE INDEX schedule_responses_poll_id_idx  ON public.schedule_responses(schedule_poll_id);
CREATE INDEX schedule_responses_user_id_idx  ON public.schedule_responses(user_id);


-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.reflections          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reflection_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_polls       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_slots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_responses   ENABLE ROW LEVEL SECURITY;

-- reflections: any authenticated user can read; admins can write
CREATE POLICY "reflections_read_authenticated"
  ON public.reflections FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "reflections_write_admin"
  ON public.reflections FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','super')));

-- reflection_responses: users own their responses; admins can read all
CREATE POLICY "reflection_responses_own"
  ON public.reflection_responses FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reflection_responses_read_admin"
  ON public.reflection_responses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','super')));

-- assignments: any authenticated user can read; admins can write
CREATE POLICY "assignments_read_authenticated"
  ON public.assignments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "assignments_write_admin"
  ON public.assignments FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','super')));

-- assignment_submissions: users own theirs; admins can read+update all
CREATE POLICY "assignment_submissions_own"
  ON public.assignment_submissions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "assignment_submissions_read_admin"
  ON public.assignment_submissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','super')));
CREATE POLICY "assignment_submissions_update_admin"
  ON public.assignment_submissions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','super')));

-- faqs / faq_items: any authenticated user can read; admins can write
CREATE POLICY "faqs_read_authenticated"
  ON public.faqs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "faqs_write_admin"
  ON public.faqs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','super')));
CREATE POLICY "faq_items_read_authenticated"
  ON public.faq_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "faq_items_write_admin"
  ON public.faq_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','super')));

-- schedule_polls + slots: any authenticated user can read; admins can write
CREATE POLICY "schedule_polls_read_authenticated"
  ON public.schedule_polls FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "schedule_polls_write_admin"
  ON public.schedule_polls FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','super')));
CREATE POLICY "schedule_slots_read_authenticated"
  ON public.schedule_slots FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "schedule_slots_write_admin"
  ON public.schedule_slots FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','super')));

-- schedule_responses: all authenticated users can read (social); users write their own; admins write all
CREATE POLICY "schedule_responses_read_authenticated"
  ON public.schedule_responses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "schedule_responses_own"
  ON public.schedule_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "schedule_responses_update_own"
  ON public.schedule_responses FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "schedule_responses_write_admin"
  ON public.schedule_responses FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','super')));

-- survey_responses: add policy so all poll responses are readable (for aggregate results)
CREATE POLICY "survey_responses_read_poll"
  ON public.survey_responses FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.surveys WHERE id = survey_id AND survey_type = 'poll')
  );
