# Architecture

PLAN·PPL is a **single-file Progressive Web App** for tracking a Push / Pull / Legs
training programme, with an AI plan generator and a social layer (friends,
consistency leaderboard, program sharing).

The entire client is one file — `ppl_training_split.html` (HTML + CSS + JS, no
build step). It talks to **Supabase** (auth + Postgres + edge functions) and is
served as a static page from **GitHub Pages**.

---

## At a glance

| | |
|---|---|
| Client | `ppl_training_split.html` — one file, vanilla JS, no framework/build |
| Offline | `service-worker.js` (cache-first PWA), `manifest.json`, `icons/` |
| Backend | Supabase project `ukylutrjetyrabqlntsc` — auth, Postgres (+ RLS), edge functions |
| Hosting | GitHub Pages, `main` branch, root. URL: `https://alexyzzz91.github.io/ppl-app/ppl_training_split.html` |
| Tests | Playwright (`npm test`) — hermetic + authenticated E2E, CI on every PR |

---

## File map

```
ppl_training_split.html     the whole app (UI, state, data, rendering)
service-worker.js           offline cache — bump CACHE_NAME on every deploy
manifest.json               PWA manifest
icons/                      app icons (120–512px)
supabase/
  migrations/               SQL applied by hand in the Supabase SQL editor
    0001_phase0_identity.sql     usernames + public_profiles view
    0002_phase1_friends.sql      friendships + RLS
    0003_phase2_leaderboard.sql  user_stats (streak) + RLS
    0004_phase3_share.sql        shared_programs + RLS
  email-templates/          branded auth emails (pasted into Supabase dashboard)
  functions/                edge functions (hyper-responder = plan gen, exercise-guide)
tests/                      Playwright specs (see tests + testing-playwright notes)
```

---

## Data & storage

**Local (per device):** workout logging lives in `localStorage` under `ppl_v4`
(or `ppl_v4_{user}`), mirrored to Supabase `workout_data`. Shape:

```jsonc
{
  "checked":  { "e_0_0": true },
  "sessions": {
    "2026-03-17": {
      "0": {                              // dayId
        "_completed": "<ISO timestamp>",  // set on Complete Day
        "_snap":      { "e_0": true },    // completion snapshot for history
        "0": [{ "wt": 80, "reps": 12 }]   // exIndex → array of sets
      }
    }
  }
}
```

**Supabase tables** (all protected by Row-Level Security — a user can only read/
write their own rows, except the social reads below):

| Table / view | Purpose | Cross-user read |
|---|---|---|
| `user_profiles` | plan JSON, goals, equipment, `username`, `is_public` | own only |
| `workout_data` | cloud mirror of the local session blob | own only |
| `public_profiles` (view) | handle directory (`user_id, username, is_public`) | authenticated |
| `friendships` | request/accept graph | the two parties |
| `user_stats` | denormalized streak for the leaderboard | own + public + accepted friends |
| `shared_programs` | a plan snapshot shared to one friend | sender + recipient |

The client **computes its own** streak/records locally and upserts the
denormalized value, so private session data never leaves the user's own rows.

---

## State machines

The app is a set of small state machines. Most are explicit and local; a few are
implicit (state spread across several functions). This section is the map.

### 1. View navigation — the central one (now explicit)

A single content view is active at a time. The **single source of truth** is the
`VIEWS` registry; every transition goes through `showView()`:

```js
const VIEWS = {
  day:     { el: 'mainContent'    },
  rest:    { el: 'mainContent'    },   // day + rest share a container
  hist:    { el: 'histContent'    },
  friends: { el: 'friendsContent' },
  board:   { el: 'boardContent'   },
};

showView(name)  // sets activeView, shows only that container, calls renderTabs()
```

- `switchDay/Rest/Hist/Friends/Board()` call `showView(name)` then render
  (`friends`/`board` also run async loaders + a loading placeholder).
- `renderTabs()` reads `activeView` to highlight the active tab.
- **Exception:** `syncActiveDayToToday()` sets the initial `activeView` directly
  during sign-in, before the first render.

**To add a view:** add one `VIEWS` entry, a `<div class="main" id="…">`
container, a tab button in `renderTabs()`, and a `render…()` function. That's it.

### 2. Auth / session lifecycle — implicit, deliberately untouched

```
loading → signed-out → onboarding (new user) → handle-backfill → signed-in
                     ↘ (returning user) ─────────────────────────↗
```

No explicit state variable: the stage is inferred from `_currentUser` /
`_username` and which overlay is visible, driven by `onAuthStateChange` →
`onSignedIn`/`onSignedOut` → `_finishSignIn` → `promptUsername`/`showOnboarding`.
This is the entry gate and is hard to test end-to-end; **change it with care**
(a mistake locks users out). Duplicate `SIGNED_IN` events are guarded by the
`_currentUser?.id === user.id` check in `onSignedIn`.

### 3. Other state machines (explicit / local — leave as-is)

| State machine | States | Lives in |
|---|---|---|
| Onboarding wizard (`_ob.step`) | step index over `OB_STEPS` | `_renderObStep` + `obNext`/`obBack`; `canNext` gates |
| Friend relationship (`_relStatus`) | none · incoming · outgoing · friends | derived from `_friendData` |
| Rest timer (`_restSecs/_restTick/_restEndTime`) | idle · running · done | `startRestTimer` + interval |
| Alt-press gesture (`_altPress*`) | idle · pressing · held(save) · released(swap) · cancelled | `altPressStart/Move/End/Cancel` |
| Set count (`_setOverride`) | per-exercise row count | `effectiveSetCount` / `addSet` / `removeSet` |
| Simple toggles | `_authMode` (signin/signup), `_boardMode` (friends/global) | local |

---

## Conventions

- **Branches:** `feat/` · `fix/` · `style/` · `chore/` · `refactor/` off `origin/main`; PR → `main` (= Pages prod); the owner merges.
- **Service worker:** feature branches **never** touch `service-worker.js`. After
  merging a batch of PRs, bump `CACHE_NAME` once on `main` so installed PWAs
  update (otherwise they keep serving the cached old version). On a conflict,
  keep the higher number.
- **DB migrations:** write SQL to `supabase/migrations/NNNN_name.sql` (idempotent)
  and run it by hand in the Supabase SQL editor. RLS is security-critical —
  a user must never read/write another user's rows except the social reads above.
- **Tests:** hermetic specs stub Supabase (`_sb.from(...)`) — no login, fast, run
  always. Authenticated E2E specs (`tests/authed/`) sign in once as a test user
  (`auth.setup.js` → `storageState`) and run only when credentials are present.
  CI runs the suite on every PR.

---

## How to… (quick recipes)

**Add a content view** → `VIEWS` entry + container div + `renderTabs()` tab +
`render…()` + a `switch…()` that calls `showView()`. (See state machine #1.)

**Add a social feature needing a table** → migration in `supabase/migrations/`
with RLS, run it in the dashboard, bump a client version only via the SW rule
above, add hermetic tests (stub `_sb`) + an authed smoke test.

**Ship a user-visible change** → feature branch → PR → owner merges → bump
`CACHE_NAME` on `main`.
