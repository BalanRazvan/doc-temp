# Doctor Schedule

Visit-window tracker for clinicians running schedule-of-assessments protocols.
Bachelor's thesis project.

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

Needs Node 22.18+ (it runs the TypeScript tests directly) and Python 3.14. From the repository root:

```bash
cd web && npm install
```

```bash
cd api && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

Then `cp web/.env.example web/.env` and fill in the two Supabase values — the project's
**Connect** button shows both. Use the publishable key, never the secret one.

## Backups

The free Supabase plan keeps no backups of its own. The **Backup** page downloads everything in an
account as one JSON file, and loads such a file into an account that is still empty, such as a new one.

## Tests

```bash
cd web && npm test
```

Pure logic only, run by `node --test` with no test runner and no build step.
