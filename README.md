# Doctor Schedule

Visit-window tracker for clinicians running schedule-of-assessments protocols.
Bachelor's thesis project. The full spec is in `architecture_decisions.md`.

## Run it

Two terminals:

```bash
cd web && npm run dev
```

```bash
cd api && source .venv/bin/activate && uvicorn main:app --reload --port 8000
```

The app is on http://localhost:5173. Vite forwards `/api/*` to FastAPI, so the
frontend never needs the backend's address.

## First time on a new machine

Needs Node 22+ and Python 3.14.

```bash
cd web && npm install
cd api && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

Then `cp web/.env.example web/.env` and fill it in using the steps below.

## Supabase setup

1. **Create the project** (Free plan):
   - **Region: Central EU (Frankfurt)** — it cannot be changed later.
   - Save the database password in a password manager. The app never uses it.
   - Leave **Enable Data API** on. Leave **Automatically expose new tables**
     unchecked — every table gets its grants in the migration instead.
2. **Copy the two values into `web/.env`.** The **Connect** button at the top of the
   project shows both; the key is also under Project Settings → API Keys.
   ```
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
   Use the publishable key only — never the secret / `service_role` key.
3. **Project Settings → JWT Keys:** the current key must be **ECC (P-256)**, which is
   what FastAPI's token check relies on. If it says Legacy HS256, click
   *Migrate JWT secret*, then *Rotate keys*.
4. **Authentication → URL Configuration:** set Site URL to `http://localhost:5173`
   and add `http://localhost:5173/**` to Redirect URLs.
5. **Authentication → Sign In / Providers → Email:** turn **Confirm email** off while
   developing. The built-in mailer sends 2 emails an hour, only to members of your
   Supabase organization.
6. **Run the files in `supabase/migrations/`** in the dashboard's SQL editor, oldest first.
