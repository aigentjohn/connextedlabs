# Cloud Storage Integration Plan

Last updated: April 2026

---

## 1. The Opportunity

Users already organize their working files in Google Drive, OneDrive, or Dropbox.
When they want to build a course, library, or resource collection on this platform,
they have to manually re-enter URLs they already know. A folder import flow bridges
their existing file organization into the platform's content model with minimal friction.

The core user story:

> "I have a Google Drive folder called 'Q3 Workshop Materials' with 12 files in it.
> I want to create a Course on this platform using those files. I should not have to
> copy and paste 12 URLs by hand."

A second story:

> "I maintain a shared Dropbox folder for my team. I want my My URL List on this
> platform to reflect that folder so I can reference those links when building content."

---

## 2. How Each Provider Works

### Google Drive
- **Picker API** — Google's official JavaScript widget. User authenticates via an
  OAuth popup (handled entirely in the browser), selects files or a folder, and the
  widget returns file metadata: ID, name, MIME type, `webViewLink`.
- **API key + OAuth client ID** required. Both are set in Google Cloud Console and
  stored as environment variables — no user tokens need to be stored on the platform.
- **No backend token storage needed** for the Picker approach — the OAuth token lives
  in the browser session only.
- View URL format: `https://drive.google.com/file/d/{fileId}/view`
- Folder URL: `https://drive.google.com/drive/folders/{folderId}`

### Microsoft OneDrive
- **File Picker v8** — Microsoft's equivalent JavaScript widget. Requires an Azure AD
  app registration. Authentication via Microsoft identity popup.
- Returns file objects with `@microsoft.graph.downloadUrl` and `webUrl`.
- Slightly more complex setup (Azure AD tenant config) but same client-side-only
  token approach as Google Picker.

### Dropbox
- **Chooser** — the simplest of the three. Drop in a `<script>` tag and call
  `Dropbox.choose()`. User logs in within the Dropbox popup, selects files.
- No backend registration beyond a free Dropbox app key.
- Returns `link` (preview URL) and `directLink` per file.
- Only supports file selection, not folder listing within the platform — the user
  selects individual files or the whole folder as a single shareable link.

---

## 3. The Access/Sharing Problem

This is the critical constraint: importing a file into My URL List only works for
other users (course participants, circle members) if the file's Drive/OneDrive/Dropbox
link is set to **"Anyone with the link can view."**

The Picker widget does not make files public. It only tells the platform what the
file's URL is. If the file is private, that URL will fail for anyone else.

**Required UX response:** After importing from cloud storage, show each file's
inferred sharing status and surface a warning before publishing content that
references files that may be private:

```
⚠ 3 of your imported files may not be accessible to others.
  Make sure each file is set to "Anyone with the link" in Google Drive
  before sharing this course with participants.
```

For the course use case, the correct workflow is:
1. User creates a shared Drive folder (sets to "Anyone with link")
2. User imports that folder into the platform
3. Platform displays all files as My URL entries ready to use

---

## 4. MIME Type to Content Type Mapping

When files are imported from Drive/OneDrive, their MIME type maps to platform
content categories:

| MIME type | Provider | Platform type |
|---|---|---|
| `application/pdf` | Any | document |
| `application/vnd.google-apps.document` | Drive | document |
| `application/vnd.google-apps.presentation` | Drive | document |
| `application/vnd.google-apps.spreadsheet` | Drive | document |
| `application/vnd.openxmlformats-officedocument.*` | OneDrive | document |
| `video/mp4`, `video/quicktime` | Any | video |
| `audio/mpeg`, `audio/mp4` | Any | audio |
| `image/jpeg`, `image/png`, `image/webp` | Any | image |
| `text/markdown` | Any | document |
| `application/zip` | Any | resource |
| All others | Any | resource (generic) |

These map to `folder_type` in the `my_contents` table.

---

## 5. Folder → Platform Folder Mapping

Drive/OneDrive have nested folder hierarchies. The platform uses `folder_path` in
`my_contents` (e.g. `/Course Materials/Week 1`). The import flow should:

1. Detect the root folder the user selected
2. Preserve subfolders as nested `folder_path` entries
3. Default the folder name to the Drive folder's name

Example: A Drive folder named "Intro to Marketing" with subfolders "Week 1", "Week 2"
becomes `my_contents` entries with:
- `folder_path = "/Intro to Marketing/Week 1"`
- `folder_path = "/Intro to Marketing/Week 2"`

This lets the existing folder tree in My Links display imported files in a familiar
hierarchy without any schema changes.

---

## 6. Two Distinct Flows

### Flow A: Add to My URL List
Entry point: ImportUrlDialog → new "Cloud Storage" tab (extends the existing
`ImportType` options alongside Manual / JSON / CSV / Bookmarks).

Steps:
1. User opens Import dialog in My Links
2. Selects "Cloud Storage" tab
3. Picks provider (Google Drive / OneDrive / Dropbox)
4. Authenticates via provider popup
5. Selects files or a folder
6. Platform shows a preview list with inferred titles, types, and sharing warnings
7. User confirms → `my_contents` records created

This flow is a direct extension of what already exists. No new page needed.

### Flow B: Course Import Wizard
Entry point: Program or Course create flow → "Import from Cloud Folder" option.

Steps:
1. User is building a new Program/Course
2. Clicks "Import from Cloud Folder" instead of adding resources manually
3. Authenticates and selects a folder
4. Platform lists all files in the folder with their inferred content types
5. User assigns a role to each file: **Intro**, **Resource**, **Assignment**, **Reference**
6. Optional: set visibility per file (all participants / instructors only / public)
7. Confirm → creates `my_contents` records AND attaches them to the program as resources

This is the highest-value flow for the education use case. It requires a new wizard
component but no new DB schema (uses existing `my_contents` + a program_resources join).

---

## 7. What Needs to Be Built

### Phase 1 — Cloud Storage tab in ImportUrlDialog

**Frontend:**
- Add `'cloud'` to `ImportType` union in `ImportUrlDialog.tsx`
- Build a `CloudStorageImporter` component with:
  - Provider selector (Drive / OneDrive / Dropbox)
  - OAuth/Chooser initialization per provider
  - File list preview with MIME-type detection, title, sharing warning
  - Folder path mapping
  - Confirm → bulk insert to `my_contents`

**Configuration (env vars):**
```
VITE_GOOGLE_PICKER_API_KEY=...
VITE_GOOGLE_OAUTH_CLIENT_ID=...
VITE_ONEDRIVE_CLIENT_ID=...
VITE_DROPBOX_APP_KEY=...
```

**Dependencies:**
- Google Picker: no npm package — load `https://apis.google.com/js/api.js` dynamically
- OneDrive: `@microsoft/microsoft-graph-client` or dynamic script load
- Dropbox Chooser: dynamic script load from Dropbox CDN

**Effort:** 3–5 days (setup + all three providers + preview UI)

### Phase 2 — Course Import Wizard

**Frontend:**
- New `CourseImportWizard` component or page
- Step 1: Provider selection + folder auth
- Step 2: File list with role assignment (Intro / Resource / Assignment / Reference)
- Step 3: Confirm + optional visibility per file
- Creates `my_contents` + links to program

**Backend:**
- A `program_resources` table may already exist — check before creating
- If not: `CREATE TABLE program_resources (id, program_id, content_id FK my_contents, role, sort_order, created_at)`

**Effort:** 3–4 days

### Phase 3 — Folder Sync (background, future)

Allow the platform to monitor a Drive/OneDrive folder for new files and automatically
add them to `my_contents`. Requires:
- Storing OAuth refresh tokens (encrypted in Supabase Vault or a `user_cloud_tokens` table with RLS)
- Webhook from each provider (Drive Push Notifications, OneDrive webhooks, Dropbox webhooks)
- Background Supabase Edge Function to process events

**Effort:** 1–2 weeks. Deferred until Phase 1/2 are validated.

---

## 8. Provider Priority and Recommendation

Start with **Google Drive** only for Phase 1. Reasons:
- Google Picker is the most mature and widely documented
- Google Workspace is the most common among knowledge workers and educators
- No backend token storage required for the Picker approach
- Largest potential user overlap with existing Google accounts

Add **Dropbox** second (simplest setup, good for creative and media professionals).
Add **OneDrive** third (most complex Azure AD setup, but important for enterprise users).

---

## 9. Connection to Existing Infrastructure

| Existing piece | How it's used |
|---|---|
| `my_contents` table | All imported files land here as URL records — no schema changes needed for Phase 1 |
| `ImportUrlDialog.tsx` | Add Cloud Storage as a new `importType` tab — extend, not replace |
| `BulkEnrichDialog.tsx` | After import, user can run AI enrichment on the imported batch to get better titles/descriptions |
| `UrlHealthCheck.tsx` | After import, health check confirms each file URL is accessible |
| `folder_path` + `folder_type` in `my_contents` | Drive folder hierarchy maps directly |
| `source_type` field in `my_contents` | Set to `'google_drive'`, `'onedrive'`, or `'dropbox'` for provenance tracking |

---

## 10. Open Questions

1. **Who registers the OAuth apps?** The platform needs a Google Cloud project,
   Azure AD app, and Dropbox app. These are registered once by the platform admin
   and the keys become environment variables. Users do not need their own developer
   accounts.

2. **Does the platform store user OAuth tokens?** For Phase 1 (Picker only): no.
   The token lives in the browser session and is discarded. For Phase 3 (background sync): yes,
   requires `user_cloud_tokens` table with encrypted token storage.

3. **What if the user revokes access?** For Phase 1: no impact — we just stored URLs,
   not an ongoing connection. The URLs either work or they don't. For Phase 3: the
   sync job would fail gracefully and notify the user to reconnect.

4. **Drive Docs vs. exported PDF?** Google Docs, Slides, and Sheets don't have a
   static downloadable URL — they have a `webViewLink` that opens the Google editor.
   The platform should store that `webViewLink` as the URL (it works for viewing
   if the file is shared). If a PDF is needed, the user should export it from Drive first.
