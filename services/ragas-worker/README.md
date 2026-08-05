# Ragas worker

This service isolates Python-only, model-judged Ragas evaluation from the Next.js application.
The Next.js server is the only caller: browser clients never receive the worker token or provider key.

## Local development

From the repository root:

```bash
npm run ragas:setup
npm run dev:supabase -- --port 3002
```

When the worker virtual environment exists, `dev:supabase` starts it on `127.0.0.1:8001` and shares a random internal bearer token with Next.js. Set `RAGAS_WORKER_URL`, `RAGAS_WORKER_TOKEN`, or `RAGAS_WORKER_PORT` to override the defaults.

## Container

Build from this directory and provide `RAGAS_WORKER_TOKEN` at runtime. Keep port 8001 on a private network; only the Next.js server should be able to reach it.

The worker disables Ragas telemetry and never writes provider keys to its response or logs. `/health` exposes only version and capability metadata; `/evaluate` requires the internal bearer token.
