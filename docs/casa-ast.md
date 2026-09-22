# CASA Tier 2 — AST scanning for Clinty

This guide covers Application Security Testing (AST) for **CASA Tier 2** submission of the Clinty website and APIs.

Clinty is a **TypeScript / JavaScript** SPA (Hostinger) plus **Supabase Edge Functions** (Deno). Treat the assessment scope as:

| Component | CASA app type | Scan approach |
|-----------|---------------|---------------|
| `https://clinty.net` (React / Vite) | Web | DAST (ZAP) + SAST (custom TS/JS tool) |
| `https://*.supabase.co/functions/v1/*` | API | DAST API scan (ZAP) and/or SAST on `supabase/functions` |

Official references:

- [Scan Your App](https://appdefensealliance.dev/casa/tier-2/scan-your-app)
- [AST guide overview](https://appdefensealliance.dev/casa/tier-2/ast-guide)
- [Recommended tools / tooling matrix](https://appdefensealliance.dev/casa/tier-2/tooling-matrix)
- [Dynamic scanning (ZAP)](https://appdefensealliance.dev/casa/tier-2/ast-guide/dynamic-scan)
- [Static scanning (Fluid)](https://appdefensealliance.dev/casa/tier-2/ast-guide/static-scan)
- [CASA Specification (ASVS-based controls)](https://github.com/appdefensealliance/ASA-WG/blob/main/CASA/CASA%20Specification.md)

## Pass criteria

To qualify for Tier 2 verification, scan results must show:

- **No findings** mapped to CWEs with **high** likelihood of exploit
- On **revalidation**, also no findings mapped to CWEs with **medium** likelihood of exploit

Remediate using OWASP ASVS guidance, re-scan, then upload machine-readable results (CSV / XML / PDF with PASS/FAIL per CWE).

## Important: Fluid Attacks SAST is not for this repo

The CASA **pre-configured Fluid Attacks Docker SAST** tool is **not compatible with TypeScript or JavaScript**.

For Clinty’s `src/` and most of the frontend, use a **custom SAST** tool that:

1. Meets the **OWASP Benchmark** standard  
2. Is configured for **all CWEs** required for Web (and API, if claimed)  
3. Emits **PASS/FAIL output mapped to CWEs**  
4. Comes with an OWASP Benchmark **scorecard** for that tool (required for custom tools)

Example CWE-compatible tools listed by CASA: Sonar, Checkmarx, Fortify, Veracode, Burp Suite, Acunetix, Fluid Attacks SAS (commercial), etc.

## What to upload

### If using CASA recommended ZAP (DAST)

- ZAP results in **CSV or XML** (e.g. `results-full.xml`)

### If using a custom SAST / DAST tool

- The **policy or config** proving required CWEs for the app type were included  
- Scan results in **PASS/FAIL** form, each mapped to a CWE (fail-only outputs are also accepted)  
- **OWASP Benchmark scorecard** for the tool  

Use the [CASA Tier 2 mapping template](https://appdefensealliance.dev/casa/tier-2/scan-your-app) when configuring custom tools.

---

## 1. Dynamic scanning (DAST) — OWASP ZAP (recommended)

Prefer a **staging** or dedicated test environment. ZAP is an active attack tool; do not run full scans against production without a change window and backups.

### 1.1 Download CASA ZAP configs

From the [dynamic scanning procedures](https://appdefensealliance.dev/casa/tier-2/ast-guide/dynamic-scan) page, download:

- `zap-casa-config.conf` — full web scan  
- `zap-casa-api-config.conf` — API scan  

Put them in a working directory, for example:

```bash
mkdir -p ~/casa-ast/zap && cd ~/casa-ast/zap
# Place zap-casa-config.conf and zap-casa-api-config.conf here
```

### 1.2 Authenticated context (required for meaningful coverage)

ZAP should run **authenticated** so it can reach `/account/*` and other logged-in surfaces.

1. Install [ZAP Desktop](https://www.zaproxy.org/download/).  
2. Create a **Context** for `https://clinty.net` (or your staging host).  
3. Configure authentication (form / JSON / script — Clinty uses Supabase email+password at `/sign-in`).  
4. Add a **dedicated test user** (not a production admin with MFA unless you intentionally scope admin).  
5. Export the context as `clinty.context`.

Docker args:

- `-n clinty.context` — context file  
- `-U test@example.com` — user defined in that context  

### 1.3 Full web scan (SPA)

Run from the directory that contains `zap-casa-config.conf` and (optionally) `clinty.context`:

```bash
cd ~/casa-ast/zap

docker run --rm \
  -p 8080:8080 \
  -v "$(pwd):/zap/wrk/:rw" \
  -t ghcr.io/zaproxy/zaproxy:stable \
  zap-full-scan.py \
  -t https://clinty.net \
  -P 8080 \
  -c zap-casa-config.conf \
  -x results-full.xml \
  -n clinty.context \
  -U test@example.com
```

Notes:

- Older docs use `owasp/zap2docker-stable`; current images are often `ghcr.io/zaproxy/zaproxy:stable`. Use whichever image CASA’s current docs specify if they differ.  
- Replace the target URL with staging if available.  
- Output: `results-full.xml` in the mounted directory.

Unauthenticated smoke (weaker; not sufficient alone):

```bash
docker run --rm \
  -p 8080:8080 \
  -v "$(pwd):/zap/wrk/:rw" \
  -t ghcr.io/zaproxy/zaproxy:stable \
  zap-full-scan.py \
  -t https://clinty.net \
  -P 8080 \
  -c zap-casa-config.conf \
  -x results-full-unauth.xml
```

### 1.4 API scan (Supabase Edge Functions)

CASA API scans expect an OpenAPI (or supported) definition. Options:

1. **Maintain an OpenAPI file** for the Edge Functions you expose (recommended for submission clarity), or  
2. Point ZAP at documented endpoints and use the API config as allowed by current CASA instructions.

Example shape (adjust `-t` / `-f` to match your OpenAPI host and format):

```bash
cd ~/casa-ast/zap

docker run --rm \
  -p 8080:8080 \
  -v "$(pwd):/zap/wrk/:rw" \
  -t ghcr.io/zaproxy/zaproxy:stable \
  zap-api-scan.py \
  -t https://YOUR_PROJECT.supabase.co \
  -f openapi \
  -P 8080 \
  -c zap-casa-api-config.conf \
  -x results-api.xml
```

Authenticate API calls with a test user’s JWT (`Authorization: Bearer …`) or Clinty API key headers where applicable (`x-clinty-api-key`). Do **not** commit real secrets into the repo; use env vars or a local ZAP context.

### 1.5 After DAST

1. Open `results-full.xml` / `results-api.xml`.  
2. Triage findings mapped to **high** (and medium, if revalidating) CWEs.  
3. Fix in this repo / Hostinger / Supabase config.  
4. Re-run ZAP until the pass bar is met.  
5. Keep XML/CSV for portal upload.

---

## 2. Static scanning (SAST) — custom tool for TypeScript / JavaScript

### 2.1 Suggested path for this repository

**Primary recommendation:** a commercial or Benchmark-qualified SAST that supports TypeScript, for example:

- **SonarQube / SonarCloud** (CASA-listed “Sonar”)  
- **Checkmarx**, **Fortify**, **Veracode** (if you already have licenses)

Configure the project to include at least:

```text
src/
supabase/functions/
public/          # especially webhooks PHP if in scope
```

Exclude noise where appropriate (do not “hide” app code):

```text
node_modules/
dist/
public/h5p-player/
```

Export a report that maps each finding to a **CWE ID** with clear pass/fail semantics.

### 2.2 Lightweight local assist (not a CASA substitute)

These help during development but **do not replace** Benchmark-qualified CASA SAST unless the tool and config meet CASA custom-tool rules:

```bash
# From repo root
npm run lint          # oxlint — style / some bug patterns, not CASA AST
npx tsc -b --pretty false
```

Optional: Semgrep / CodeQL in CI for continuous hygiene. For **submission**, prefer Sonar (or equivalent) with CWE policy + Benchmark scorecard.

### 2.3 Custom SAST evidence checklist

Before upload, confirm you have:

- [ ] Tool name + version  
- [ ] Policy/config listing required CWEs for **Web** (and **API** if claimed)  
- [ ] Results file: each CWE PASS or FAIL (or fail-only list)  
- [ ] OWASP Benchmark scorecard for that tool  
- [ ] Scope note: paths scanned (`src/`, `supabase/functions/`, …)

---

## 3. Suggested end-to-end workflow

1. **Enable MFA** in Supabase (required for Admin after our CASA remediations). Use a non-admin test user for most ZAP runs.  
2. Stand up **staging** mirroring production auth and integrations when possible.  
3. Create ZAP context + test user; download `zap-casa-config.conf`.  
4. Run **authenticated ZAP full scan** → fix high CWEs → re-scan.  
5. Run **API ZAP scan** (or document Edge Functions under Web scope if the lab accepts a single web assessment — follow portal app-type selection).  
6. Run **custom SAST** on `src/` + `supabase/functions/` → fix → re-scan.  
7. Upload DAST XML + SAST results (+ policy + Benchmark scorecard for custom SAST) to the CASA portal.  
8. Respond to assessor feedback; keep architecture evidence for Spec controls (OAuth, MFA, headers, CORS, etc.) separate from AST uploads.

---

## 4. Clinty-specific notes for scanners

| Area | Tip for AST |
|------|-------------|
| Auth | Supabase email/password; session JWT on Edge Functions |
| Admin | MFA (aal2) required; expect ZAP admin routes to fail without MFA session |
| OAuth | Gmail uses Authorization Code + PKCE; do not store tokens in URLs |
| CORS | Edge Functions allowlist `clinty.net` / localhost — scanners on other origins will get CORS failures (use same-origin browser context or no-Origin API clients) |
| Headers | HSTS / frame-ancestors / nosniff set via `public/.htaccess` |
| Secrets | Never put service role / Google client secret in `VITE_*` |
| SSRF | `generate-prompt-background` blocks private IPs after DNS resolve |

---

## 5. Repo layout (scan targets)

```text
clinty-website/
  src/                      # React SPA — SAST + ZAP web
  supabase/functions/       # Edge Functions — SAST + ZAP API
  public/.htaccess          # Security headers (DAST verifies)
  public/webhooks/          # PHP webhook receivers if in scope
  docs/casa-ast.md          # This file
```

## 6. Out of scope for this doc

- Formal lab AL2 assessment procedures  
- Google OAuth verification / Limited Use (see `/privacy`) — related to Google review, not AST upload  
- Continuous CI wiring — add Sonar/ZAP GitHub Actions after the first successful manual CASA submission if desired
