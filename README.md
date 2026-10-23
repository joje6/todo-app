# Daymark Todo

A responsive full-stack Todo app built with Node.js 22, TypeScript, Express, and PostgreSQL.

## Run locally

1. Install Node.js 22 and PostgreSQL.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` to your PostgreSQL connection string.
3. Run `npm ci`, `npm run build`, then `npm start`.
4. Open `http://localhost:3000`. The server binds to `0.0.0.0` and uses `PORT` (default `3000`).

The `todos` table is created safely with `CREATE TABLE IF NOT EXISTS` during startup. No credentials are committed. Set `PGSSLMODE=require` when the managed PostgreSQL provider requires TLS.

## API

- `GET /healthz` — liveness check
- `GET /api/todos` — list todos
- `POST /api/todos` — create `{ "title": "..." }`
- `PATCH /api/todos/:id` — change `{ "title": "..." }` or `{ "completed": true }`
- `DELETE /api/todos/:id` — delete a todo

Titles are trimmed and limited to 1–200 characters. Responses use JSON, with `400` for invalid input, `404` for missing todos, and `500` for unexpected server failures.

## Development and tests

- `npm run dev` — watch mode
- `npm test` — API and validation tests using an in-memory PostgreSQL pool double
- `npm run build` — compile TypeScript into runnable `dist/`
