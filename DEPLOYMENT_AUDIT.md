# Mind Bloom — Deployment Audit Report
> **Phase A Output** | Date: 2026-10-12 | Engineer: Antigravity Deployment Agent

---

## 1. Existing Architecture

### Runtime
- **Platform**: Node.js v24.19.0 (local). No npm dependencies — uses only Node.js built-in modules.
- **Server**: Custom `http.createServer(...)` + `server.listen(PORT)` in `server.js`.
- **Database**: `node:sqlite` (built-in since Node.js v22.5) via `DatabaseSync` (synchronous API). Database file: `mind_bloom.db`.
- **Frontend**: Static Single-Page Application (SPA) served from `public/`. All routing is client-side.
- **AI**: OpenRouter API (external HTTPS), streaming NDJSON over `Content-Type: application/x-ndjson`.

### File Layout

```
mindbloom-main-before-vercel/
├── server.js               # Custom HTTP server + all API routes (403 lines)
├── database.js             # SQLite schema init, seed, repository methods (411 lines)
├── auth.js                 # Custom JWT-like token generation/verification (65 lines)
├── ai_friend.js            # Rule-based AI companion fallback (192 lines)
├── openrouter.js           # OpenRouter streaming + session analysis + mood extraction (275 lines)
├── app.js                  # Root-level copy of app.js (identical to public/app.js)
├── list_models.js          # Dev utility: list free OpenRouter models
├── test_actual.js          # Dev test script (CONTAINS HARDCODED API KEY)
├── test_analyze.js         # Dev test script (CONTAINS HARDCODED API KEY)
├── test_analyze_regex.js   # Dev test using openrouter.js module
├── package.json            # No npm dependencies declared
├── package-lock.json       # Lockfile (no packages)
├── .gitignore              # Excludes node_modules, .env*, .vercel/, *.db files
├── README.md               # Documentation + viva guide
├── start.bat               # Windows 1-click launcher
├── styles.css              # Root-level copy of styles.css (duplicate of public/)
├── favicon.svg             # Root-level copy of favicon (duplicate of public/)
├── index.html              # Root-level copy of index.html (duplicate of public/)
├── mind_bloom.db           # Local SQLite database (LIVE DATA)
├── mood_bloom.db           # Second SQLite database (purpose: unclear/legacy)
├── backup-before-vercel/
│   ├── mind_bloom.db       # Backup copy of main database
│   └── mood_bloom.db       # Backup copy of second database
└── public/                 # Served static assets
    ├── index.html          # Main SPA HTML
    ├── styles.css          # Application stylesheet
    ├── app.js              # Frontend JavaScript (1055 lines)
    ├── auth.js             # Duplicate of server-side auth.js (served as static file — SECURITY RISK)
    └── favicon.svg
```

> [!WARNING]
> `public/auth.js` is a copy of the server-side `auth.js`. It is currently served as a static file to the browser. While it does not expose the API key, it does expose the JWT secret fallback string and internal token logic. This file should **not** be in `public/`.

> [!NOTE]
> The root-level `app.js`, `index.html`, `styles.css`, `favicon.svg` appear to be duplicates not served by the server (which serves from `public/`). They are not harmful but add confusion.

---

## 2. Feature and API Inventory

### API Routes (all in `server.js`)

| Method | Path | Auth Required | Description | Side Effects |
|--------|------|---------------|-------------|--------------|
| OPTIONS | `*` | No | CORS preflight | None |
| POST | `/api/auth/signup` | No | Create user + seed default emergency contacts + issue token | DB write (users, emergency_contacts) |
| POST | `/api/auth/login` | No | Verify credentials + issue token | None |
| GET | `/api/auth/me` | Yes | User profile + mood/journal counts | None |
| POST | `/api/moods` | Yes | Create mood entry | DB write (moods) |
| GET | `/api/moods/recent` | Yes | Recent moods (default limit 10, query: `?limit=N`) | None |
| GET | `/api/moods/week` | Yes | Last 7 mood entries (all-time slice, not date-filtered) | None |
| GET | `/api/moods/today` | Yes | Today's most recent mood (query: `?date=YYYY-MM-DD`) | None |
| GET | `/api/journals` | Yes | All journals for user (newest first) | None |
| POST | `/api/journals` | Yes | Create journal entry | DB write (journals) |
| DELETE | `/api/journals/:id` | Yes | Delete journal (user-scoped) | DB write (journals) |
| GET | `/api/emergency-contacts` | Yes | All emergency contacts for user | None |
| POST | `/api/emergency-contacts` | Yes | Create emergency contact | DB write (emergency_contacts) |
| DELETE | `/api/emergency-contacts/:id` | Yes | Delete contact (user-scoped) | DB write (emergency_contacts) |
| GET | `/api/chat` | Yes | Chat history (limit 50, oldest first) | None |
| POST | `/api/chat/stream` | Yes | Streaming AI chat via OpenRouter; triggers background mood extraction | OpenRouter API call; background DB write (moods) |
| POST | `/api/analyze-session` | Yes | Non-streaming session emotion analysis via OpenRouter | OpenRouter API call |
| DELETE | `/api/chat` | Yes | Clear all chat history for user | DB write (chats) |
| GET | `/api/dashboard` | Yes | Consolidated dashboard data | None |
| GET | `/*` (non-API) | No | Serve static files from `public/`; SPA fallback to `index.html` | None |

### Frontend Features

- Login / Sign Up forms with tab switching
- Demo account one-click fill button
- Dashboard: greeting, today's mood spotlight, 4 stat cards, 7-day Canvas mood graph, recent mood list
- Mood Log: 5 mood selector cards + "Angry" tag chip, 1–5 slider, note textarea with tag chips, save button
- Journal: editor with rotating prompts, entry history with delete
- AI Friend Chat: streaming chat with Bloom AI, quick-start prompts, chat history, clear button
- Emergency Help: saved contacts with call links and delete, 4-7-8 breathing exercise widget
- Profile modal: name, email, user ID, mood/journal counts, join date, logout
- Desktop/mobile layout toggle (persisted to localStorage)
- Toast notifications

### Modules Not Used in Production Flow

- `ai_friend.js` — `generateSupportiveResponse` is imported in `server.js` but **never called** in any route handler. The application uses `openrouter.js` exclusively for all AI responses.
- `list_models.js` — Developer utility only.
- `test_actual.js`, `test_analyze.js`, `test_analyze_regex.js` — Developer test scripts.

---

## 3. Database Schema and Data Ownership

### Tables and Key Constraints

```sql
users (userId PK, name, email UNIQUE NOCASE, password, salt, createdAt)
moods (moodId PK, userId FK→users, moodScore CHECK(1-5), mood, note, date, time)
journals (journalId PK, userId FK→users, title, text, date, time, createdAt)
emergency_contacts (contactId PK, userId FK→users, name, phone, relationship)
chats (chatId PK, userId FK→users, message, response, date, time)
```

Foreign keys use `ON DELETE CASCADE`. `PRAGMA foreign_keys = ON` is set at init time.

### Ownership Enforcement

| Entity | Scoped by userId | Verified in |
|--------|-----------------|-------------|
| Mood entries | Yes | SQL `WHERE userId = ?` |
| Journal entries | Yes | SQL `WHERE userId = ?` in both read and delete |
| Emergency contacts | Yes | SQL `WHERE userId = ?` in both read and delete |
| Chat history | Yes | SQL `WHERE userId = ?` |
| User profile | Yes | `findById(user.userId)` from token |

### Seeding Behavior

`seedDemoData()` is called inside `initDatabase()` on every module load. It checks `WHERE email = 'demo@mindbloom.com'` before inserting — safe and idempotent.

### Two Database Files

- `mind_bloom.db` — The active database used by the application.
- `mood_bloom.db` — Appears to be a legacy or earlier copy. The README references `mood_bloom.db` in the schema section but the code uses `mind_bloom.db`. Do not merge or treat as interchangeable.

---

## 4. Security Findings

### CRITICAL

| # | Finding | Location | Risk |
|---|---------|----------|------|
| C-1 | **Hardcoded OpenRouter API key** | `openrouter.js` line 3 | Key exposed in source, committed to version control |
| C-2 | **Hardcoded API key in test scripts** | `test_actual.js` line 2, `test_analyze.js` line 2 | Same revoked key present in committed test scripts |
| C-3 | **`public/auth.js` served as static file** | `public/auth.js` | Exposes JWT secret fallback `mood-bloom-student-wellness-mvp-secret-key-2026` to any browser visitor; exposes internal token logic |
| C-4 | **JWT secret has weak hardcoded default** | `auth.js` line 4 | If `MOOD_BLOOM_SECRET` is not set in production, a predictable public string signs all tokens |

### HIGH

| # | Finding | Location | Risk |
|---|---------|----------|------|
| H-1 | **CORS allows `*`** | `server.js` lines 51, 91 | Any origin can make authenticated requests; acceptable for MVP but should be restricted in production |
| H-2 | **Error response leaks `err.message`** | `server.js` line 379 | Internal error messages sent to client; may reveal implementation details |
| H-3 | **No rate limiting** | `server.js` | Signup/login endpoints can be brute-forced |
| H-4 | **Request body size limit destroys socket** | `server.js` line 31 | `req.socket.destroy()` for oversized bodies; abrupt connection close is technically correct but harsh |

### MEDIUM

| # | Finding | Location | Risk |
|---|---------|----------|------|
| M-1 | **`mood_bloom.db` in working directory** | Root | Unclear purpose; risk of accidental use or exposure |
| M-2 | **Root-level duplicate files** (`app.js`, `index.html`, etc.) | Root | Confusion; not served but add noise |
| M-3 | **`public/auth.js` is identical to `auth.js`** | Root vs `public/` | Likely accidental copy; see C-3 |
| M-4 | **Chat history stores full AI responses in DB** | `database.js` chats table | Journal and chat content stored plaintext; acceptable for MVP but relevant for data protection |
| M-5 | **`timingSafeEqual` buffer length mismatch** | `auth.js` line 36 | If signature strings differ in length, `Buffer.from(signature)` vs `Buffer.from(expectedSig)` can throw instead of returning false (Node.js requires equal-length buffers) |

---

## 5. Vercel Compatibility Findings

### Critical Incompatibilities

| # | Issue | Severity | Notes |
|---|-------|----------|-------|
| V-1 | **`node:sqlite` / `DatabaseSync` not available on Vercel** | BLOCKER | Node.js built-in `node:sqlite` module is not available in Vercel's serverless runtime. Vercel uses a sandboxed environment without local filesystem write access. |
| V-2 | **`server.listen()` cannot run in a serverless function** | BLOCKER | Vercel functions must export a handler; they cannot start a persistent TCP server. |
| V-3 | **Local SQLite file writes are not persistent** | BLOCKER | Vercel's filesystem is ephemeral and read-only except in `/tmp`. A local `.db` file would be lost between invocations. |
| V-4 | **Streaming response requires `Connection: keep-alive`** | RISK | Vercel serverless functions support streaming via Edge Runtime or `@vercel/node` with `res.write()`. Standard Node.js serverless functions support streaming but have a 25-second max duration on Pro plan; free Hobby plan has 10-second execution limit which may cut streaming. |
| V-5 | **Static file serving (`serveStatic`) conflicts with Vercel's static output** | DESIGN | Vercel handles static files natively when configured; the server-side `serveStatic` function is unnecessary and incompatible with serverless deployment. |

### Compatible Items

- All API route logic and request/response shapes can be preserved.
- `node:crypto` and `node:https` are available in Vercel's Node.js runtime.
- Frontend SPA (HTML, CSS, JS) can be deployed as Vercel static output.
- Environment variables work natively in Vercel.
- `openrouter.js` HTTP client logic is compatible with Node.js serverless functions.

### Recommended Architecture for Vercel

**Approach: Express adapter wrapping existing route logic + Neon PostgreSQL**

1. Install `express` (lightweight, battle-tested, supports Vercel).
2. Refactor `server.js` routes into an Express `app` exported as a Vercel function from `api/index.js`.
3. Keep `server.js` as the local development entry point (unchanged behavior).
4. Create a database abstraction layer (`lib/db.js`) that:
   - Uses `node:sqlite` + `DatabaseSync` when `NODE_ENV !== 'production'` or when `DATABASE_URL` is absent.
   - Uses `@neondatabase/serverless` (PostgreSQL) when `DATABASE_URL` is present (production).
5. Deploy static frontend files via Vercel's static output (configured in `vercel.json`).
6. Configure `vercel.json` to route `/api/*` to the Node.js function and all other paths to the SPA.

**Alternative Approach: Vercel Edge Functions**
- Would require rewriting from CommonJS to ESM and using the `fetch` API instead of `node:https`.
- More disruptive. Not recommended.

**Streaming AI chat on Vercel Free Tier:**
- Vercel Hobby plan allows up to **10 seconds** execution time per function invocation.
- The OpenRouter streaming call could exceed this if the model is slow.
- The streaming response protocol (`application/x-ndjson`) IS supported by `@vercel/node`.
- Risk: long AI responses may be cut off on the free tier. The frontend already handles partial streams gracefully via the `r` (final guaranteed clean text) packet.
- **Mitigation**: Set `max_tokens: 500` for the streaming endpoint (currently 1500) to reduce response time within Vercel's limits. Document the limitation.

---

## 6. Required Code Changes (by Phase)

### Phase B — Security

- [ ] **B-1**: Remove hardcoded API key from `openrouter.js` line 3. Use `process.env.OPENROUTER_API_KEY` only. Add startup validation that rejects requests with a 503 if the key is absent.
- [ ] **B-2**: Remove hardcoded API key from `test_actual.js` and `test_analyze.js`.
- [ ] **B-3**: Remove `public/auth.js` (do not serve server-side auth module as a static file).
- [ ] **B-4**: Fix `timingSafeEqual` buffer-length bug in `auth.js` line 36.
- [ ] **B-5**: Add `MOOD_BLOOM_SECRET` to `.env.example`. Ensure production fails safely if absent.
- [ ] **B-6**: Update `.gitignore` to add `backup-before-vercel/*.db` protection note and `logs/`.

### Phase C — Database Design

- [ ] **C-1**: Create `lib/db.js` — database abstraction: SQLite for local dev, PostgreSQL for production.
- [ ] **C-2**: Create PostgreSQL migration script `migrations/001_initial_schema.sql`.
- [ ] **C-3**: Update `database.js` to use the abstraction layer.
- [ ] **C-4**: Make `seedDemoData()` skip in production (`NODE_ENV === 'production'`) unless explicitly opted in.

### Phase D — Vercel Adaptation

- [ ] **D-1**: Install `express` as a production dependency.
- [ ] **D-2**: Create `api/index.js` — Express app exporting as a Vercel serverless function.
- [ ] **D-3**: Create `vercel.json` with static output + API routing configuration.
- [ ] **D-4**: Keep `server.js` functional for local development (no changes to local flow).
- [ ] **D-5**: Move shared route handler logic to `lib/routes.js` (shared between local server and Vercel function).

### Phase E — Integration

- [ ] **E-1**: Connect all route handlers to the database abstraction layer.
- [ ] **E-2**: Validate all endpoints work identically in local mode.

### Phase F — Testing

- [ ] **F-1**: Write `tests/api.test.js` covering all endpoints with an isolated temp database.
- [ ] **F-2**: Run baseline tests before and after changes.

---

## 7. Proposed Hosted Database: Neon PostgreSQL

**Recommendation: Neon (https://neon.tech)**

| Criterion | Details |
|-----------|---------|
| Free tier | Neon Hobby: 0.5 GB storage, 191.9 compute hours/month, auto-suspend (unlimited active time with auto-suspend enabled) |
| Serverless-compatible | Yes — `@neondatabase/serverless` uses HTTP-based protocol, avoiding TCP connection pool issues in serverless functions |
| PostgreSQL version | PostgreSQL 16 |
| Pricing risk | Free tier availability may change. Always verify current limits at neon.tech/pricing before production commitment. |
| Migration from SQLite | Schema is straightforward. Major differences: INTEGER PRIMARY KEY AUTOINCREMENT → SERIAL or GENERATED ALWAYS AS IDENTITY; TEXT date/time columns preserved as-is; COLLATE NOCASE → LOWER() in queries or citext extension for email. |

**Required environment variables for production:**

```
DATABASE_URL=               # Neon PostgreSQL connection string (postgres://...)
OPENROUTER_API_KEY=         # OpenRouter API key
MOOD_BLOOM_SECRET=          # JWT signing secret (minimum 32 characters, random)
```

---

## 8. PostgreSQL Migration Design (Preview)

Type mapping from SQLite schema:

| SQLite | PostgreSQL | Notes |
|--------|-----------|-------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` or `INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY` | Auto-increment |
| `TEXT UNIQUE NOT NULL COLLATE NOCASE` (email) | `TEXT UNIQUE NOT NULL` + `LOWER()` in queries | Case-insensitive comparison |
| `TEXT NOT NULL CHECK(moodScore BETWEEN 1 AND 5)` | `INTEGER NOT NULL CHECK(moodScore BETWEEN 1 AND 5)` | Integer type for mood score |
| `PRAGMA foreign_keys = ON` | Native (always enforced in PostgreSQL) | No action needed |
| `lastInsertRowid` | `RETURNING id` clause | Return inserted ID |
| `db.prepare().run()` | `client.query()` with params | Driver API change |
| `db.prepare().get()` | `client.query()` → `rows[0]` | Single row fetch |
| `db.prepare().all()` | `client.query()` → `rows` | Multiple rows |

---

## 9. Test Plan

| Test ID | Description | Status |
|---------|-------------|--------|
| T-01 | Server starts locally without errors | NOT RUN YET |
| T-02 | GET `/api/auth/signup` with valid data returns 201 + token | NOT RUN YET |
| T-03 | POST `/api/auth/login` with valid credentials returns 200 + token | NOT RUN YET |
| T-04 | POST `/api/auth/login` with wrong password returns 401 | NOT RUN YET |
| T-05 | GET `/api/auth/me` without token returns 401 | NOT RUN YET |
| T-06 | GET `/api/auth/me` with valid token returns user profile | NOT RUN YET |
| T-07 | POST `/api/moods` creates mood entry | NOT RUN YET |
| T-08 | GET `/api/moods/recent` returns user's moods only | NOT RUN YET |
| T-09 | User A cannot access User B's journals (IDOR test) | NOT RUN YET |
| T-10 | POST `/api/journals` creates entry | NOT RUN YET |
| T-11 | DELETE `/api/journals/:id` deletes user's own entry | NOT RUN YET |
| T-12 | DELETE `/api/journals/:id` with another user's ID returns success=false | NOT RUN YET |
| T-13 | POST `/api/emergency-contacts` creates contact | NOT RUN YET |
| T-14 | GET `/api/chat` returns history | NOT RUN YET |
| T-15 | DELETE `/api/chat` clears chat | NOT RUN YET |
| T-16 | GET `/api/dashboard` returns all dashboard data | NOT RUN YET |
| T-17 | Missing `OPENROUTER_API_KEY` returns 503 with appropriate message | NOT RUN YET |
| T-18 | POST `/api/chat/stream` streams NDJSON response | NOT RUN — Requires live API key |
| T-19 | POST `/api/analyze-session` returns analysis JSON | NOT RUN — Requires live API key |
| T-20 | Database initializes with demo data idempotently | NOT RUN YET |
| T-21 | Vercel route config maps `/api/*` correctly | NOT RUN YET |
| T-22 | `timingSafeEqual` does not throw on mismatched signature length | NOT RUN YET |

---

## 10. Current Baseline

### Files Inspected (Read-Only)
- `server.js`, `database.js`, `auth.js`, `ai_friend.js`, `openrouter.js`
- `public/index.html`, `public/app.js`, `public/auth.js`, `public/styles.css`
- `package.json`, `package-lock.json`, `.gitignore`, `README.md`
- `test_actual.js`, `test_analyze.js`, `test_analyze_regex.js`, `list_models.js`

### Files Not Modified in Phase A
None. Phase A is read-only.

### Confirmed Unmodified
- `backup-before-vercel/mind_bloom.db` — not touched.
- `backup-before-vercel/mood_bloom.db` — not touched.
- `mind_bloom.db` — not touched.
- `mood_bloom.db` — not touched.

---

## 11. Unresolved Issues After Phase A

1. **`mood_bloom.db`** — Purpose unknown. Do not merge or delete without user confirmation.
2. **`public/auth.js`** — Should be deleted before any deployment. Awaiting Phase B.
3. **Hardcoded API keys in test scripts** — Must be removed in Phase B.
4. **`ai_friend.js`** — Module is imported but `generateSupportiveResponse` is never called. Dead code. Preserved as-is.
5. **Streaming on Vercel free tier** — 10-second execution limit may clip long AI responses. Will document in deployment guide.
6. **No `node_modules/` directory** — No npm packages installed. Express must be added.
