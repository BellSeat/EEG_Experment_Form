# SPANER Lab Portal

A SvelteKit frontend for the SPANER Lab research portal.

## Environment

Set `VITE_API_BASE` so the frontend and backend point at the same API origin.

Development example:

```sh
VITE_API_BASE=http://localhost:8000
```

Production example:

```sh
VITE_API_BASE=https://api.example.com
```

Backend CORS should allow the matching frontend origin for each environment, for example:

- dev frontend `http://localhost:5173` -> dev API `http://localhost:8000`
- prod frontend `https://portal.example.com` -> prod API `https://api.example.com`

## Routes

- `/` login
- `/dashboard`
- `/subjects`
- `/sessions`
- `/sessions/[id]`
- `/session_files`
- `/audit-log`

## API expectations

The frontend currently calls these endpoints:

- `POST /auth/login`
- `GET /subjects`
- `GET /sessions`
- `GET /sessions/:id`
- `GET /sessions/:id/files`
- `POST /sessions/:id/files`
- `GET /session_files`
- `GET /audit-log`

Collection endpoints can return either a raw array or an object with `items`, `results`, or `data`.
