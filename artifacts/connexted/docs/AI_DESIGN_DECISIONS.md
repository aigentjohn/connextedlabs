# AI Features — Design Decisions

**Status:** Open for decision  
**Context:** Expanding Sprint 8 (AI Draft Generation) into a broader AI strategy covering circle-scoped assistants, transcripts, summarisation, and auto-tagging.

---

## Decision 1 — Where does the AI assistant live?

### Context
An AI assistant that draws from circle resources would be the most contextually useful surface on the platform. A circle contains: posts, documents shared to it, Table resources, Pages, events, members, and linked programs.

### Options

**A) Circle-scoped assistant (recommended)**  
Lives as a tab or panel inside the Circle. Knows only about that circle's content. Each circle has its own assistant persona configurable by the admin (e.g. "You are the assistant for the Founder Cohort circle. Help members find resources and answer questions about the program.").

- Context sources: circle posts, Table resources, linked documents, Pages, events, member directory
- Admin sets persona instructions and toggles the feature on/off per circle
- Members interact with it from within the circle only

**B) Platform-wide assistant**  
A global assistant icon in the sidebar. Has access to everything the user has access to across the platform.

- Broader but less focused; harder to give useful answers without tight context
- Higher cost per query (more context = more tokens)
- More complex to implement well

**C) Content-page assistant**  
Each content type (episode, book, document) gets an inline "Ask about this" button. Assistant is scoped to that single item.

- Narrow but highly accurate
- Good companion to transcripts and summaries
- Can be added incrementally

### Decision needed
- Start with Circle-scoped (A) or Content-page (C), or both?
- Should non-circle contexts (programs, pathways) also get assistants?

---

## Decision 2 — Transcript: inside Episode or separate type?

### Context
Episodes currently store a `video_url` and `video_platform` (youtube / vimeo / loom / wistia). There is no transcript field. Transcripts are large text objects and have distinct lifecycle, display, and discovery needs.

### Options

**A) Column on the `episodes` table**  
Add `transcript text` and `transcript_generated_at timestamptz` directly to `episodes`.

```sql
ALTER TABLE public.episodes 
  ADD COLUMN transcript text,
  ADD COLUMN transcript_generated_at timestamptz,
  ADD COLUMN transcript_source text; -- 'youtube_api' | 'whisper' | 'manual'
```

- Pros: Simple, tightly coupled, appears automatically in episode detail view
- Cons: Large text in the main episodes row; transcript can't be independently searched, shared, or added to a journey; can't be versioned or edited without overwriting

**B) Separate `transcripts` table linked to episode**  
```sql
CREATE TABLE public.transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE,
  content text NOT NULL,
  source text, -- 'youtube_api' | 'whisper' | 'manual'
  language text DEFAULT 'en',
  generated_at timestamptz DEFAULT now(),
  edited_at timestamptz,
  created_by uuid REFERENCES users(id)
);
```

- Pros: Clean separation; transcript can be versioned, searched, shown in discovery; episode row stays lean
- Cons: One more table; join required in episode detail

**C) Transcript generates a Page linked to the episode**  
Reuse the existing Page content type. A "Generate Transcript" action creates a new Page with `content` = the transcript text and a `source_episode_id` FK (new column on `pages`).

- Pros: No new table; transcript is immediately a first-class content item — can be added to journeys, shared, commented on
- Cons: Loose coupling; pages can be deleted independently of the episode; "transcript" isn't obvious to users browsing Pages

### Recommendation
**Option B** for transcripts. They are large, structured objects with their own source/language metadata. A dedicated table keeps episodes clean and allows transcript-specific features (search, language toggle, edit history) without polluting the Pages content type.

### Decision needed
- Accept Option B?
- Should transcripts be surface-able as journey items independently of the episode?
- Should transcript editing (correct AI errors) be supported from day one?

---

## Decision 3 — Transcript source: YouTube API vs. Whisper vs. manual

### Context
All current episodes use external video platforms (YouTube, Vimeo, Loom, Wistia). There are no uploaded audio/video files.

| Platform | Transcript source | Notes |
|----------|------------------|-------|
| YouTube | YouTube Data API v3 — `captions` resource | Free; works only if captions exist on the video; requires OAuth or API key |
| Vimeo | No public transcript API | Would need Whisper on the audio stream — requires downloading audio first |
| Loom | No transcript API | Same as Vimeo |
| Wistia | Wistia API has transcript support for paid plans | Available but requires Wistia credentials |

### Options

**A) YouTube-first**  
Implement transcript fetch for YouTube only (covers the majority of episodes). Show a "Transcript not available" message for Vimeo/Loom/Wistia. Add a manual text input fallback.

**B) Manual upload fallback for all**  
Any platform can have a manually uploaded transcript (paste text or upload .txt/.srt file). Auto-fetch is an enhancement on top.

**C) Whisper for all (via Edge Function)**  
Download the audio stream via `yt-dlp` or platform API, send to OpenAI Whisper API. Platform-agnostic but adds cost (~$0.006/minute) and latency (not real-time).

### Recommendation
**Option A + B**: Start with YouTube API auto-fetch + manual paste/upload for all platforms. Whisper is a later enhancement when audio hosting is added to the platform.

### Decision needed
- Accept phased approach (YouTube API first, manual fallback)?
- Who triggers transcript generation — episode creator, circle admin, or any member?

---

## Decision 4 — Summarisation: auto-on-save vs. on-demand

### Context
Summaries are useful for blogs, documents, books, and episodes (via transcript). The question is when they run and who controls them.

### Options

**A) On-demand (user triggers)**  
A "Generate Summary" button appears in the content detail view. Runs an Edge Function → Claude API → stores result. User can regenerate or edit.

- Pros: User controls cost; no surprise AI content; works well for existing content
- Cons: Requires user action; won't automatically enrich new content

**B) Auto-on-save**  
When content is created or updated, an Edge Function fires automatically and generates a summary in the background.

- Pros: Seamless; all new content gets enriched
- Cons: Runs on every save (costly if user edits frequently); user may not want AI summary

**C) Opt-in per content type (admin toggle)**  
Platform admin enables auto-summarisation per content type. Runs once on creation, never on edits unless manually triggered.

- Pros: Platform operator controls cost exposure; predictable
- Cons: More configuration surface

### Recommendation
**Option A** for launch. On-demand with a clear "AI-generated" label and an editable summary field. Auto-on-save can be added once cost patterns are understood.

### Decision needed
- Accept on-demand as the starting model?
- Should AI-generated content be visually flagged as AI-generated?
- Should users be able to edit the AI summary, or is it read-only?

---

## Decision 5 — Auto-tagging: suggestions vs. silent assignment

### Context
The platform has an existing tag taxonomy and topic_interests table. Claude API can analyze content text and return matching tags/topics. The question is whether this is silent or user-facing.

### Options

**A) Suggest only — user approves**  
After saving content, a "Suggested tags" panel appears with AI-recommended tags. User clicks to accept each one. No tags are added without user action.

- Pros: User retains control; builds trust in the feature; avoids polluting tag data with bad AI picks
- Cons: Adds friction; users may skip it

**B) Silent auto-assign**  
Tags are added automatically in the background. User can remove them.

- Pros: Zero friction for users who don't care about tagging
- Cons: If Claude picks wrong tags, the content is miscategorised; hard to audit at scale

**C) Suggestions during creation (inline)**  
As part of the create/edit form, a "Suggest" button appears next to the tags field. Runs Claude on the title + description, returns suggestions inline. User picks before saving.

- Pros: Best UX — tagging decision is made once at creation time; no post-save flow
- Cons: Slightly longer create flow

### Recommendation
**Option C** for launch. Inline suggestions during creation are the most natural fit and keep the user in control without adding a separate approval step.

### Decision needed
- Accept inline suggestions (Option C)?
- Should suggestions cover both tags AND topic_interests in one action?
- Should existing content be retroactively taggable via a bulk admin tool?

---

## Decision 6 — AI infrastructure: one Edge Function or many?

### Context
All AI calls need a server-side Edge Function (to keep the Claude API key out of the browser). The question is architecture.

### Options

**A) Single `ai-assistant` Edge Function with action routing**  
One function handles all AI tasks via an `action` parameter:
```
POST /functions/v1/ai-assistant
{ action: 'summarise' | 'tag' | 'transcript' | 'draft' | 'chat', payload: {...} }
```

- Pros: One deployment, one place to manage API key and model config
- Cons: Gets large; harder to tune per-action (summarise needs different model/params than chat)

**B) Separate function per AI feature**  
`ai-summarise`, `ai-tag`, `ai-transcript`, `ai-draft`, `ai-chat`

- Pros: Each can be tuned independently; isolated failures; easy to add/remove
- Cons: More deployments to manage

**C) One function per category**  
`ai-content` (summarise + tag + draft), `ai-chat` (assistant)

- Pros: Logical grouping; manageable

### Recommendation
**Option C**: Separate `ai-content` (stateless enrichment tasks) from `ai-chat` (stateful conversation). Enrichment tasks are simple prompt→response; chat requires conversation history management.

### Model selection guidance:
| Task | Recommended model | Reason |
|------|------------------|--------|
| Tag suggestions | Claude Haiku | Fast, cheap, structured output |
| Summarisation | Claude Haiku | Simple extraction task |
| Draft generation | Claude Sonnet | Quality matters more |
| Circle assistant chat | Claude Sonnet | Reasoning over mixed context |
| Transcript enrichment | Claude Haiku | Text cleanup only |

---

## Decision 7 — Circle assistant context: how is it built?

### Context
For the circle assistant to give useful answers it needs to know what's in the circle. At scale, passing everything in the prompt is too expensive. Two approaches exist.

### Options

**A) Context injection (no vector DB)**  
On each chat message, fetch the N most recent/relevant items from the circle (last 20 posts, all table resources, pinned documents) and pass them as context in the system prompt. No indexing required.

- Pros: Simple; no new infrastructure; works well for small circles
- Cons: Token cost scales with circle size; doesn't retrieve semantically relevant older content

**B) RAG with pgvector (Supabase)**  
Store embeddings for circle content in a `content_embeddings` table using Supabase's `pgvector` extension. On each query, retrieve the top-K relevant chunks by cosine similarity, then pass only those to Claude.

- Pros: Scales to large circles; semantically relevant retrieval; cheaper per query once indexed
- Cons: Requires embedding pipeline (index on create/update); pgvector extension must be enabled in Supabase; more complex

**C) Start with A, migrate to B**  
Launch with context injection for circles up to ~100 items. Add pgvector when a circle exceeds that or when cost becomes a concern.

### Recommendation
**Option C**. Context injection is viable for early advisory cohort circles (small, well-defined content). pgvector is the right long-term architecture and Supabase supports it natively — design the schema for it now but don't build the indexing pipeline until needed.

### Decision needed
- Accept phased approach?
- Should circle admin be able to see/control what the assistant has access to?
- Should the assistant have memory of past conversations per user, or start fresh each session?

---

## Summary of open decisions

| # | Decision | Recommendation | Status |
|---|----------|---------------|--------|
| 1 | Where does assistant live? | Circle-scoped first, then content-page | Open |
| 2 | Transcript: episode column vs. separate table | Separate `transcripts` table | Open |
| 3 | Transcript source | YouTube API first + manual fallback | Open |
| 4 | Summarisation timing | On-demand with "Generate" button | Open |
| 5 | Auto-tagging UX | Inline suggestions during creation | Open |
| 6 | AI infrastructure | `ai-content` + `ai-chat` Edge Functions | Open |
| 7 | Circle assistant context | Context injection now, pgvector later | Open |

---

## Proposed roadmap placement

These features don't fit neatly into Sprint 8 (which was narrowly scoped to Page drafts). Suggested restructure:

**Sprint 8 — AI Content Enrichment**
- On-demand summarisation for documents, books, blogs, episodes
- Auto-tag suggestions inline during content creation
- `ai-content` Edge Function

**Sprint 9 — Transcripts**
- `transcripts` table + migration
- YouTube API fetch + manual paste fallback
- Transcript display in episode detail view
- Transcript as searchable text in circle discovery

**Sprint 10 — Circle AI Assistant**
- Circle-scoped assistant panel
- Context injection from circle resources
- Admin persona configuration
- `ai-chat` Edge Function with conversation history
