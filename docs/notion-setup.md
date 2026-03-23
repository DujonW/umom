# Connecting Umom to Notion

Total time: about 15 minutes. You'll do this once.

---

## Part A — Create the Notion Integration (3 min)

This gives the app permission to read and write to your Notion databases.

1. Open [notion.so](https://www.notion.so) in your browser and sign in
2. Click **Settings** in the bottom-left sidebar
3. Click **Connections** in the left menu
4. Click **Develop or manage integrations** (or go directly to notion.so/my-integrations)
5. Click **New integration**
6. Fill in:
   - **Name:** `Umom Coach`
   - **Associated workspace:** select your workspace
   - **Capabilities:** check all three — Read, Update, Insert content
7. Click **Submit**
8. On the next screen, click **Show** next to "Internal Integration Secret"
9. Copy the full `secret_...` token — you'll need it in Part C

---

## Part B — Create the 5 Databases (10 min)

You need to create 5 Notion databases. For each one:

**How to create a database:**
1. Click **+** in the Notion sidebar to create a new page
2. Choose **Table** (not "Table — inline" — use the full-page table)
3. Name the database exactly as shown below
4. Add each property listed in the table (click **+** at the end of the column headers)

**How to share it with your integration (do this for EVERY database):**
1. Open the database as a full page (click its title at the top)
2. Click **•••** in the top-right corner
3. Click **Connections**
4. Search for **Umom Coach** and click **Confirm**

**How to find the Database ID:**

Look at the URL in your browser when the database is open full-screen:

```
https://www.notion.so/myworkspace/Daily-Check-ins-a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4?v=xyz
                                                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                                    This 32-character string is the ID
```

Copy only the 32 characters that come **after the last `/`** and **before the `?`**. It contains only letters and numbers — no dashes in some formats, or with dashes like `a1b2c3d4-e5f6-...` in others. Either format works.

---

### Database 1: Daily Check-ins

| Property Name | Type       | Notes                                          |
|---------------|------------|------------------------------------------------|
| Date          | Date       |                                                |
| Mood          | Number     | Format: Number                                 |
| Energy        | Number     | Format: Number                                 |
| Focus         | Number     | Format: Number                                 |
| Notes         | Text       |                                                |
| AI Response   | Text       |                                                |
| Cycle Phase   | Select     | Add options: menstrual, follicular, ovulatory, luteal |

Copy the database ID → this is `NOTION_DB_CHECKINS`

---

### Database 2: Tasks

| Property Name     | Type         | Notes                                        |
|-------------------|--------------|----------------------------------------------|
| Title             | Title        | Already exists by default                   |
| Description       | Text         |                                              |
| Status            | Select       | Add options: To Do, In Progress, Done, Paused |
| Priority          | Select       | Add options: High, Medium, Low               |
| Tags              | Multi-select | Add your own: Work, Health, Admin, etc.      |
| Estimated Minutes | Number       | Format: Number                               |
| Completed At      | Date         |                                              |

Copy the database ID → this is `NOTION_DB_TASKS`

---

### Database 3: Journal

| Property Name | Type    | Notes                                     |
|---------------|---------|-------------------------------------------|
| Date          | Date    |                                           |
| Entry         | Text    |                                           |
| Mood          | Number  | Format: Number                            |
| AI Reflection | Text    |                                           |
| Type          | Select  | Add options: General, Reframe, Gratitude, Win |

Copy the database ID → this is `NOTION_DB_JOURNAL`

---

### Database 4: Reports

| Property Name | Type   | Notes                         |
|---------------|--------|-------------------------------|
| Title         | Title  | Already exists by default     |
| Type          | Select | Add options: Weekly, Monthly  |
| Date Range    | Text   |                               |
| Summary       | Text   |                               |
| Raw Data      | Text   |                               |
| Generated At  | Date   |                               |

Copy the database ID → this is `NOTION_DB_REPORTS`

---

### Database 5: Cycle Logs

| Property Name | Type         | Notes                                                          |
|---------------|--------------|----------------------------------------------------------------|
| Start Date    | Date         |                                                                |
| Cycle Length  | Number       | Format: Number                                                 |
| Symptoms      | Multi-select | Add options: Cramps, Fatigue, Brain fog, Irritability, Bloating, Headache |
| Notes         | Text         |                                                                |

Copy the database ID → this is `NOTION_DB_CYCLE_LOGS`

---

## Part C — Fill in your `.env` file (2 min)

Open the `.env` file in the project root (create it from the example if it doesn't exist):

```bash
cp .env.example .env
```

Then open `.env` and fill in your values. Here's what a completed file looks like:

```
PORT=3000
NODE_ENV=development

ANTHROPIC_API_KEY=sk-ant-api03-abc123...your-key-here...
CLAUDE_MODEL=claude-haiku-4-5

NOTION_API_KEY=secret_abc123def456...your-token-here...

NOTION_DB_CHECKINS=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4
NOTION_DB_TASKS=b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5
NOTION_DB_JOURNAL=c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6
NOTION_DB_REPORTS=d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1
NOTION_DB_CYCLE_LOGS=e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2

SQLITE_PATH=data/umom.db
```

**Important:**
- No spaces around the `=` sign
- No quote marks around values
- Don't leave a `#` comment on the same line as a value (put comments on their own line)

---

## Part D — Start the app and verify

```bash
npm run dev
```

You should see:

```
🌸 Umom ADHD Coaching API running on port 3000
   Environment: development
   Health check: http://localhost:3000/api/health
```

Open http://localhost:3000/api/health in your browser. You should see:

```json
{"status":"ok","timestamp":"...","service":"umom-api"}
```

**Test that Notion is actually connected** — run this in a new terminal:

```bash
curl -X POST http://localhost:3000/api/checkin \
  -H "Content-Type: application/json" \
  -d '{"mood":7,"energy":6,"focus":7,"notes":"Testing connection"}'
```

If it returns something like `{"success":true,"data":{"aiResponse":"..."}}`, everything is working. Check your Daily Check-ins database in Notion — you should see a new row appear.

---

## Troubleshooting

| What you see | What it means | Fix |
|---|---|---|
| `Missing required environment variables` | `.env` has empty values | Fill in all 7 required variables |
| `Could not find database with ID` | Database not connected to integration | Open each database → ••• → Connections → add Umom Coach |
| `401` error from Notion | Wrong `NOTION_API_KEY` | Re-copy the token from notion.so/my-integrations |
| `401` error from Anthropic | Wrong `ANTHROPIC_API_KEY` | Re-copy from console.anthropic.com/settings/api-keys |
| `403` error from Anthropic | No credits | Add billing at console.anthropic.com/settings/billing |
| Server starts but check-in fails | Database ID is wrong | Make sure you copied the 32-char ID only, not the full URL |
| No row appears in Notion after check-in | Database not shared | Repeat the Connections step for that specific database |

---

For API key setup details, see [api-setup.md](./api-setup.md).
