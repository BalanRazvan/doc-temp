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

Needs Node 22+ and Python 3.14.

```bash
cd web && npm install
cd api && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

Then `cp web/.env.example web/.env` and fill in the two Supabase values — the project's
**Connect** button shows both. Use the publishable key, never the secret one.

## Tests

```bash
cd web && npm test
```

Pure logic only, run by `node --test` with no test runner and no build step.
