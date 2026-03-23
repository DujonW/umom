# Deploying Umom to Railway

Railway runs your app 24/7 in the cloud so you can access it from any device.
The $5/month free credit covers a personal app — typical usage costs under $1/month.

---

## Before You Start

You need:
- A free GitHub account (github.com)
- A free Railway account (railway.app) — sign up with GitHub, no credit card needed to start

---

## Step 1 — Push Code to GitHub

Open your terminal in the project folder:

```bash
cd /Users/dujon/cHome/Umom
git init
git add .
git commit -m "Initial commit"
```

Then on github.com:
1. Click **+** (top right) → **New repository**
2. Name it `umom`, set to **Private**, click **Create repository**
3. Copy the HTTPS URL shown (e.g. `https://github.com/YOUR_USERNAME/umom.git`)

Back in your terminal:

```bash
git remote add origin https://github.com/YOUR_USERNAME/umom.git
git push -u origin main
```

---

## Step 2 — Create a Railway Project

1. Go to **railway.app** and sign in with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Authorise Railway to access your repos if prompted
4. Select your `umom` repository
5. Railway will start a deploy automatically — **don't wait for it**, move straight to Step 3

---

## Step 3 — Set Environment Variables

The deploy will fail until your API keys are added. Do this before the first deploy completes.

1. In the Railway dashboard, click your service (the `umom` box)
2. Click the **Variables** tab
3. Click **Raw Editor** and paste the following, filling in your actual values:

```
NODE_ENV=production
CORS_ORIGIN=*
ANTHROPIC_API_KEY=sk-ant-...
NOTION_API_KEY=ntn_...
NOTION_DB_CHECKINS=your_32_char_id
NOTION_DB_TASKS=your_32_char_id
NOTION_DB_JOURNAL=your_32_char_id
NOTION_DB_REPORTS=your_32_char_id
NOTION_DB_CYCLE_LOGS=your_32_char_id
CLAUDE_MODEL=claude-haiku-4-5-20251001
TZ_SCHEDULER=America/Toronto
```

> Copy these values from your local `.env` file.
> Replace `America/Toronto` with your actual timezone (e.g. `America/Vancouver`, `America/New_York`, `Europe/London`).
> Do **not** set `PORT` — Railway handles that automatically.

4. Click **Update Variables**

---

## Step 4 — Add a Persistent Volume (keeps chat history)

Without this, SQLite resets every time the app redeploys. This volume costs ~$0.25/month.

1. In your service, click the **Volumes** tab
2. Click **Add Volume**
3. Set mount path to `/data`
4. Leave size at **1 GB** → click **Add**
5. Go back to the **Variables** tab and add one more variable:
   ```
   SQLITE_PATH=/data/umom.db
   ```
6. Click **Update Variables** — Railway will trigger a new deploy

Your chat history and session data now persist permanently across all redeploys.

---

## Step 5 — Watch the Deploy

1. Click the **Deployments** tab
2. Click the active deployment to see build logs
3. Wait for the green **Active** status (~2 minutes)
4. In the logs you should see:

```
Umom ADHD Coaching API running on port XXXX
[scheduler] Crons registered — weekly (Sun 20:00) and monthly (1st 20:00)
```

If you see errors, check the **Variables** tab — a missing or misspelled key is the most common cause.

---

## Step 6 — Get Your Public URL

1. Click your service → **Settings** tab
2. Scroll to **Networking** → click **Generate Domain**
3. Your app is now live at a URL like:
   ```
   https://umom-production-xxxx.up.railway.app
   ```

Save this URL — it's how you access the app from any device.

---

## Step 7 — Verify It Works

Test the health endpoint from any device or browser:

```
https://your-url.up.railway.app/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"2026-03-22T...","service":"umom-api"}
```

Test a brain dump (replace the URL with yours):

```bash
curl -X POST https://your-url.up.railway.app/api/dump \
  -H "Content-Type: application/json" \
  -d '{"text":"First test from the cloud, mood is good, energy about 7"}'
```

Then open Notion — a new check-in entry should appear in your Daily Check-ins database.

---

## Using From Your Phone

All API endpoints now work from any device at your Railway URL. You can:

- **iOS Shortcut**: create a Shortcut that sends a POST request to `/api/dump` with your text input — one tap from your home screen to log a brain dump
- **Any browser**: hit the health or report endpoints directly
- **curl from any machine**: replace `localhost:3000` with your Railway URL in any command

---

## Updating the App

Whenever you push new code to GitHub, Railway redeploys automatically:

```bash
git add .
git commit -m "describe your change"
git push
```

Railway will deploy the new version in ~2 minutes with zero downtime.

---

## Important Notes

**All data persists** — chat history lives on the Railway Volume at `/data/umom.db`, and all check-ins, tasks, journal entries, reports, and cycle logs live in Notion. Nothing resets on redeploy.

**API keys**: your keys on Railway are encrypted secrets. Never commit your local `.env` file to GitHub (it's already in `.gitignore`).

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Build fails immediately | Check Variables tab — a required env var may be missing |
| `Could not find database` from Notion | Wrong database ID in Variables — re-copy from your Notion URL |
| `401` Anthropic error | `ANTHROPIC_API_KEY` is wrong or expired — re-copy from console.anthropic.com |
| App responds but Notion entries don't appear | Check that each Notion database is still shared with the Umom Coach integration |
| Scheduler not running | Check deploy logs for `[scheduler] Crons registered` — if missing, redeploy |
