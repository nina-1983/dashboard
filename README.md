# The Dashboard

A private, password-gated morning view: this week's client focus (from the
Client Work Board), what's with Abbey, money (QuickFile), weather, and a
link through to Alfie's school week.

## What's real vs. what needs setup

Every card pulls live data — nothing here is sample content. But three
integrations need credentials before they'll show anything:

- **Notion** — needs an integration token, and that integration needs to be
  shared on the Client Work Board database.
- **QuickFile** — needs an API token. I built this against QuickFile's
  documented REST API and bearer-token auth, but couldn't test it live (no
  credentials available while building). The auth and fetch logic is
  correct; a couple of field names in `lib/quickfile.js` are marked
  `ADJUST IF NEEDED` — if the Money card shows blank or wrong numbers once
  you've added a token, that's the first place to check against QuickFile's
  Swagger docs (`https://api-beta.quickfile.co.uk/api-docs/`, open while
  logged in).
- **Weather** — works out of the box (Open-Meteo, no key needed), defaults
  to the Oswestry/Gobowen area. Override `WEATHER_LAT`/`WEATHER_LON` if you
  want it elsewhere.

If a card's data source isn't configured yet, that card shows a plain
message saying so instead of fake numbers or a silent blank.

## Setup

### 1. Deploy to Vercel

- Go to [vercel.com/new](https://vercel.com/new), import
  `nina-1983/dashboard`, and deploy. It'll build and go live even with no
  env vars set yet — every card will just show its "not configured"
  message until you add them (step 4).

### 2. Notion integration

1. Go to <https://www.notion.so/my-integrations> and create a new internal
   integration (any name, e.g. "The Dashboard").
2. Copy its "Internal Integration Secret" — this is `NOTION_TOKEN`.
3. Open the **Client Work Board** database in Notion, click **"..."** in
   the top right, go to **Connections**, and add the integration you just
   created. Without this step, the API calls will fail with a permissions
   error even with a valid token.

### 3. QuickFile API token

1. In QuickFile, go to **Account Settings > Third Party Integration > API**.
2. Generate a personal API token, granting read access to **Banks** and
   **Invoices**.
3. Copy the token — this is `QUICKFILE_API_TOKEN`.

### 4. Add environment variables in Vercel

In your Vercel project, go to **Settings > Environment Variables** and add
everything from `.env.example`:

| Variable | What it is |
|---|---|
| `DASHBOARD_PASSWORD` | Whatever password you want to gate the dashboard with |
| `NOTION_TOKEN` | From step 2 |
| `NOTION_CLIENT_BOARD_DB_ID` | Already filled in `.env.example` — the Client Work Board's ID |
| `QUICKFILE_API_TOKEN` | From step 3 |
| `QUICKFILE_API_BASE` | Leave as the default unless QuickFile tells you otherwise |
| `WEATHER_LAT` / `WEATHER_LON` | Leave as default, or set your own coordinates |
| `NEXT_SCHOOL_PAGE_URL` | The URL of the Gobowen/Maple Class page you already built |

After adding variables, redeploy (Vercel > Deployments > ⋯ > Redeploy) —
new env vars don't apply to an already-running deployment.

## How it's built

- **Next.js App Router**, plain JavaScript, no build-step styling framework
  — one `globals.css` using your brand colours.
- **Auth**: a single shared password (`DASHBOARD_PASSWORD`). On login, a
  signed session cookie is set (HMAC of the password, 30-day expiry,
  httpOnly). This is a casual-access gate, not hardened security — proportionate
  to "just me," but don't treat it as bulletproof against someone who's
  specifically trying to get in.
- **Caching**: data refreshes at most every 5 minutes
  (`export const revalidate = 300` in `app/page.js`), not on every single
  page load. Keeps it fast and avoids hammering Notion/QuickFile.
- **Abbey's items are deliberately separate** — a "With Abbey" section at
  the bottom, not mixed into your own Focus This Week list.

## Known gaps (by design, for v1)

- **Calendar and inbox are not included.** Scoped out on purpose — fast-follow once the core is working.
- **QuickFile field names are unverified** against a live account (see above).
- **School card links out**, it doesn't duplicate the Gobowen page's data —
  that page is already built and maintained separately; this just points to
  it.
