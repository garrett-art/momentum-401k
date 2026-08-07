# Momentum 401(k) Pipeline

Internal prospecting and plan management tool for Momentum Wealth Management.

---

## Setup

### 1. Supabase

1. Go to [supabase.com](https://supabase.com) and open your existing account
2. Create a new project — name it `momentum-401k`
3. Once the project is ready, go to **SQL Editor** and run the contents of `supabase/schema.sql`
4. Go to **Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon / public key** → `VITE_SUPABASE_ANON_KEY`
5. Go to **Authentication → Users** and create accounts for Matt and Garrett

### 2. GitHub

1. Create a new repo at github.com — name it `momentum-401k`
2. Clone it locally: `git clone https://github.com/YOUR_USERNAME/momentum-401k.git`
3. Copy all these project files into the cloned folder
4. Copy `.env.example` to `.env.local` and fill in your Supabase values
5. Push: `git add . && git commit -m "initial" && git push`

### 3. Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New → Project** and import the `momentum-401k` repo
3. Vercel auto-detects Vite — no build config needed
4. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon key
   - `ANTHROPIC_API_KEY` — your Anthropic API key
5. Click **Deploy**

That's it. The app is live at your Vercel URL.

---

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your values
npm run dev
```

---

## How it works

- **Frontend** — React + Vite, deployed on Vercel
- **Auth** — Supabase email/password (Matt and Garrett each have their own login)
- **Database** — Supabase Postgres, plans and settings stored as JSONB with row-level security
- **API calls** — Anthropic requests go through `/api/analyze` and `/api/transcript` (Vercel edge functions), keeping the API key server-side
- **EFAST2** — DOL plan search goes through `/api/efast2`, solving the browser CORS issue

## Environment variables

| Variable | Where | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Vercel + `.env.local` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Vercel + `.env.local` | Supabase anon key (safe for frontend) |
| `ANTHROPIC_API_KEY` | Vercel only | Never commit this |
