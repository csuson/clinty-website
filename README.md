# Clinty Website

Marketing website for **Clinty** — AI agents that automate customer email correspondence and appointment scheduling for small businesses.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Customer Auth & Database Setup

Sign-up and sign-in use [Supabase](https://supabase.com) for authentication and a PostgreSQL `profiles` table.

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Open **Project Settings → API** and copy your **Project URL** and **anon public key**

### 2. Configure environment variables

```bash
cp .env.example .env
```

Add your credentials to `.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Create the database schema

In the Supabase dashboard, open **SQL Editor** and run the contents of `supabase/schema.sql`.

This creates:
- A `profiles` table linked to auth users
- Row-level security policies
- A trigger that auto-creates a profile on sign-up

### 4. Enable email auth

In Supabase, go to **Authentication → Providers** and ensure **Email** is enabled.

For local development, you can disable email confirmation under **Authentication → Settings → Enable email confirmations**.

## Auth Pages

| Page | URL |
|------|-----|
| Sign Up | `/sign-up` |
| Sign In | `/sign-in` |
| Account | `/account` (protected) |
| Account Settings | `/account` |
| Billing | `/account/billing` |
| API Keys | `/account/api-keys` |
| Integrations (Gmail) | `/account/integrations` |

## Gmail Integration Setup

The account **Integrations** page ports `setup_gmail.py` to a web OAuth flow. Instead of saving `.secrets/token.json` locally, tokens are stored in Supabase per user.

### 1. Google Cloud Console

1. Enable [Gmail API](https://developers.google.com/gmail/api/quickstart/python#enable_the_api) and [Google Calendar API](https://developers.google.com/workspace/calendar/api/quickstart/python#enable_the_api)
2. Create an OAuth client ID with type **Web application**
3. Add authorized redirect URIs:
   - `http://localhost:5173/account/integrations/gmail/callback`
   - `https://clinty.net/account/integrations/gmail/callback`

### 2. Frontend environment

Add to `.env`:

```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### 3. Supabase Edge Functions

Deploy the functions and set secrets:

```bash
supabase functions deploy gmail-oauth-exchange
supabase functions deploy gmail-oauth-disconnect
supabase functions deploy gmail-oauth-download
supabase secrets set GOOGLE_CLIENT_ID=your-client-id
supabase secrets set GOOGLE_CLIENT_SECRET=your-client-secret
```

### 4. Database

Run the Gmail tables section in `supabase/schema.sql` (creates `gmail_tokens` and `gmail_connections`).

## Build

```bash
npm run build
npm run preview
```

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Supabase (Auth + PostgreSQL)
