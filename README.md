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

### 5. SSL for Supabase connections

Direct Postgres and Supabase CLI connections verify TLS using Supabase's root CA certificate.

1. Download `prod-ca-2021.crt` from your Supabase project (**Project Settings → Database → SSL Configuration**), or use the copy in `supabase/certs/prod-ca-2021.crt`
2. Set the certificate path in `.env`:

```
SUPABASE_SSL_CERT_PATH=~/Downloads/prod-ca-2021.crt
```

3. Use the npm wrapper for Supabase CLI commands so SSL env vars are applied automatically:

```bash
npm run supabase -- functions deploy admin-data
npm run supabase -- db push
```

The Vite dev/build tooling also loads this certificate for any Node-side HTTPS connections via `NODE_EXTRA_CA_CERTS`. The browser client uses HTTPS to `*.supabase.co` automatically.

## Auth Pages

| Page | URL |
|------|-----|
| Sign Up | `/sign-up` |
| Sign In | `/sign-in` |
| Account | `/account` (protected) |
| Account Settings | `/account` |
| Prompts | `/account/prompts` |
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

## Agent Settings API

Returns the `agent_settings` row linked to a Clinty API key as JSON, plus resolved user prompts (`prompts`, `prompt_background`, `prompt_calendar_preference`, `email_footer`).

**Endpoint:** `GET {VITE_SUPABASE_URL}/functions/v1/agent-settings`

**Authentication:** include the Clinty API key in a request header:

- `X-Clinty-Api-Key: clinty_sk_...` (recommended), or
- `Authorization: Bearer clinty_sk_...`

Supabase also requires the project anon key on the request:

```bash
curl -s "https://your-project.supabase.co/functions/v1/agent-settings" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "X-Clinty-Api-Key: clinty_sk_your_key_here"
```

Deploy the function:

```bash
npm run supabase -- functions deploy agent-settings
```

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
