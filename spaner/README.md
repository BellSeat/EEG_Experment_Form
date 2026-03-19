# SPANER Lab Portal

A SvelteKit frontend for the SPANER Lab research portal.

## Current scope

The portal currently covers the core research workspace:

- login
- dashboard
- subjects
- sessions
- session detail
- session assets
- EEG channel alignment
- procedure steps
- audit log

## Route map

- `/` login
- `/dashboard`
- `/subjects`
- `/subjects/new`
- `/sessions`
- `/sessions/new`
- `/sessions/[id]`
- `/session_files`
- `/audit-log`

## Session workspace model

The session detail page is the main working area. It currently combines:

- session overview and status update
- managed session file upload and metadata editing
- external URL/path records
- procedure steps
- EEG channel alignment

### Managed files vs external records

The portal intentionally keeps two asset types:

- `Session Files`
  Files the platform manages directly, such as raw EEG, preprocessed outputs, exports, or QC artifacts.
- `External Records`
  URL/path references that point to assets living outside the portal for now, such as OneDrive links or future server URLs.

This split lets the lab start with linked storage and later migrate toward full server-managed uploads without losing traceability.

## Roles

Current frontend roles are:

- `admin`
- `researcher`
- `uploader`

Important note:

- the frontend currently recognizes these roles
- but it does not yet fully hide or gate every route by role
- final data visibility still depends on backend authorization

See [docs/roadmap.md](./docs/roadmap.md) for the recommended next phase on registration, projects, membership, and access control.

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

## API expectations

The frontend currently calls these endpoint families:

- `POST /auth/login`
- `GET /subjects`
- `POST /subjects`
- `GET /sessions`
- `POST /sessions`
- `GET /sessions/:id`
- `PUT /sessions/:id`
- `GET /sessions/:id/files`
- `POST /sessions/:id/files`
- `GET /session_files`
- `PUT /session_files/:id` or `PUT /sessions/:sessionId/files/:id`
- `DELETE /session_files/:id` or `DELETE /sessions/:sessionId/files/:id`
- `GET /experiment-plans`
- `POST /experiment-plans`
- `PUT /experiment-plans/:id`
- `GET /experiment-plans/:id/detail`
- `POST /experiment-steps`
- `PUT /experiment-steps/:id`
- `DELETE /experiment-steps/:id`
- `GET /experiment-data`
- `POST /experiment-data`
- `PUT /experiment-data/:id`
- `DELETE /experiment-data/:id`
- `POST /eeg-maps`
- `GET /eeg-maps/:id`
- `PUT /eeg-maps/:id`
- `GET /audit-log`

Collection endpoints can return either:

- a raw array
- an object with `items`
- an object with `results`
- an object with `data`

## Docs

- [docs/color.md](./docs/color.md)
- [docs/roadmap.md](./docs/roadmap.md)
