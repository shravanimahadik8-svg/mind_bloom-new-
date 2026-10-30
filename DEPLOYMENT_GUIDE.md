# Mind Bloom — Safe Vercel Deployment & Operation Guide

This guide provides the complete, production-ready instructions for deploying **Mind Bloom — Student Mental Wellness & Mood Tracking MVP** to Vercel paired with a serverless PostgreSQL database (e.g., [Neon](https://neon.tech)).

---

## 1. Local Development (Unchanged & Zero-Configuration)

Your local development workflow remains **100% offline and file-based**, using Node.js's built-in `node:sqlite` database (`mind_bloom.db`).

### Running Locally:
```bash
npm start
# or
node server.js
```
- Server starts at `http://localhost:3000`
- Demo account: `demo@mindbloom.com` / `bloom123`
- Pre-seeded with 7-day mood history, journals, and emergency contacts.

---

## 2. Hosted Database Setup (Neon PostgreSQL Free Tier)

Vercel functions run in an ephemeral, stateless serverless environment where local SQLite `.db` writes do not persist. A persistent hosted PostgreSQL database is required for production.

### Step-by-Step Neon Setup:
1. Go to [https://neon.tech](https://neon.tech) and sign up for a free account.
2. Click **Create Project**, name it `mind-bloom-prod`, and select your preferred region (e.g., `US East (N. Virginia)` or closest to your users).
3. Under Dashboard, copy your connection string (`DATABASE_URL`). It will look like:
   ```
   postgres://alex:secret_pw@ep-cool-flower-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### Running the Reviewed Schema Migration:
Execute the pre-prepared, idempotent migration script against your Neon database from your terminal:

```bash
# Option A: Using the automated npm script
DATABASE_URL="postgres://..." npm run migrate

# Option B: Using psql CLI directly
psql "$DATABASE_URL" -f migrations/001_initial_schema.sql
```
*Verification*: Check your Neon console table viewer. You should see 5 tables: `users`, `moods`, `journals`, `emergency_contacts`, and `chats`.

---

## 3. Environment Variables Configuration

Set these environment variables in your **Vercel Project Settings > Environment Variables**:

| Variable Name | Required | Description / Value |
|---|---|---|
| `DATABASE_URL` | **Yes (Prod)** | Neon PostgreSQL connection string (see Step 2) |
| `OPENROUTER_API_KEY` | **Yes (Prod)** | Your OpenRouter API key for Bloom AI (`sk-or-v1-...`). Never exposed to frontend. |
| `MOOD_BLOOM_SECRET` | **Yes (Prod)** | Strong random 32+ character hex string for signing JWT tokens. |
| `NODE_ENV` | Optional | Set to `production` |

> 💡 **Generate a secure JWT Secret**:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## 4. Automated Testing Before Deployment

Run the complete 21-test automated suite locally before deploying:
```bash
npm test
```
All tests verify:
- Authentication, signup, login, and token generation.
- Access control and ownership isolation (User B cannot delete User A's journals).
- Mood logging, 7-day analytics, and today's summary.
- Journal CRUD and Emergency Contact management.
- Graceful 503 fallback if `OPENROUTER_API_KEY` is not configured.

---

## 5. Deploying to Vercel

### Deploying via Vercel CLI:
```bash
# 1. Install Vercel CLI globally (if not installed)
npm install -g vercel

# 2. Preview Deployment (test first)
vercel

# 3. Production Deployment
vercel --prod
```

### Deploying via GitHub Integration:
1. Push this directory to your private GitHub repository.
2. In Vercel, click **Add New > Project** and import the repository.
3. Keep default settings:
   - Framework Preset: **Other**
   - Root Directory: `./`
4. Add the Environment Variables configured in Section 3.
5. Click **Deploy**.

---

## 6. Post-Deployment Verification Checklist

Once deployed to your production URL (`https://your-mindbloom-app.vercel.app`):

1. **Static UI Loads**: Open homepage, ensure styles, logo, and login screen appear correctly.
2. **Signup**: Register a new account (`testuser@college.edu`). Ensure default emergency contacts are created.
3. **Log Mood**: Record a mood (score 4, "Calm"). Confirm it appears immediately on the dashboard graph.
4. **Journal Entry**: Write a reflection entry and verify it appears in past entries.
5. **AI Chat Check**: Send a message in AI Friend chat. Confirm that AI streaming responds cleanly (or returns a helpful notice if the key was omitted).
6. **Emergency Contact**: Add a test contact, verify dial link and deletion.

---

## 7. Rollback Procedure

If any issue arises post-deployment:
1. In the Vercel Dashboard, navigate to **Deployments**.
2. Select the previously working deployment from the list.
3. Click the **...** menu on the right and click **Promote to Production**.
4. Vercel will instantly switch traffic back to the prior build with zero downtime.
