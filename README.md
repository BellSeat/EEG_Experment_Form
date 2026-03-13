# EEG Experiment Form

This repository contains a SvelteKit frontend for an EEG experiment workflow. The current app lives in [`spaner`](/Users/qingranshao/GithubProject/EEG_Experment_Form/spaner) and includes a basic landing page plus a dashboard stub for participant or profile-related actions.

## Current Status

The project is in an early scaffold stage.

- Landing page at `/` with `Login` and `Register` actions
- Dashboard page at `/dashboard`
- Svelte 5 + SvelteKit 2 + TypeScript setup
- Minimal UI placeholders, with core experiment flows still to be implemented

## Tech Stack

- Svelte 5
- SvelteKit 2
- Vite 7
- TypeScript

## Project Structure

```text
EEG_Experment_Form/
├── README.md
└── spaner/
    ├── package.json
    ├── svelte.config.js
    ├── tsconfig.json
    ├── vite.config.ts
    └── src/
        ├── app.d.ts
        ├── app.html
        ├── lib/
        │   ├── assets/favicon.svg
        │   └── index.ts
        └── routes/
            ├── +layout.svelte
            ├── +page.svelte
            └── dashboard/+page.svelte
```

## Prerequisites

- Node.js `20.17.0+`
- npm `10+`

Node `22.x` is recommended. Older versions such as `20.12.1` can fail with the `sv` CLI and newer npm releases.

## Getting Started

Install dependencies and run the development server from the app directory:

```bash
cd spaner
npm install
npm run dev
```

Open the local URL printed by Vite, typically:

```text
http://localhost:5173
```

To open the browser automatically:

```bash
npm run dev -- --open
```

## Available Scripts

Run these from [`spaner`](/Users/qingranshao/GithubProject/EEG_Experment_Form/spaner):

```bash
npm run dev
```

Starts the Vite development server.

```bash
npm run build
```

Builds the app for production.

```bash
npm run preview
```

Serves the production build locally for verification.

```bash
npm run check
```

Runs SvelteKit sync and TypeScript/Svelte checks.

## Routes

- `/` - landing page for Spanner Lab
- `/dashboard` - dashboard placeholder with profile and experiment actions

## Data Model

The current backend/domain model centers on users, experiment plans, uploaded experiment data, and ordered experiment steps.

### Tables

#### `users`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer | Primary key |
| `username` | varchar | |
| `role` | varchar | |
| `created_at` | timestamp | |
| `email` | varchar | |

#### `experiment_data`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer | Primary key |
| `owner_id` | integer | Not null, references `users.id` |
| `create_at` | timestamp | |
| `file_path` | varchar | |
| `experiment_plan` | integer | References `experiment_plan.id` |

#### `experiment_plan`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer | Primary key |
| `owner_id` | integer | Not null, references `users.id` |
| `create_at` | timestamp | |
| `eight_channels_map_id` | integer | |
| `other_eight_channels_map_id` | integer[] | Array field |

#### `experiments_steps`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer | Primary key |
| `experiment_id` | integer | References `experiment_plan.id` |
| `order_of_step` | integer | |
| `description` | varchar | |

### Relationships

- One `user` can own many `experiment_data` records.
- One `user` can own many `experiment_plan` records.
- One `experiment_plan` can be linked from many `experiment_data` records.
- One `experiment_plan` can contain many ordered `experiments_steps` records.

### Schema Source

```text
Table users {
  id integer [primary key]
  username varchar
  role varchar
  created_at timestamp
  email varchar
}

Table experiment_data {
  id integer [primary key]
  owner_id integer [not null]
  create_at timestamp
  file_path varchar
  experiment_plan integer
}

Table experiment_plan {
  id integer [primary key]
  owner_id integer [not null]
  create_at timestamp
  eight_channels_map_id integer
  other_eight_channels_map_id integer[]
}

Table experiments_steps {
  id integer [primary key]
  experiment_id integer
  order_of_step integer
  description varchar
}

Ref: experiment_data.owner_id > users.id
Ref: users.id < experiment_plan.owner_id
Ref: experiment_data.experiment_plan < experiment_plan.id
Ref: experiments_steps.experiment_id < experiment_plan.id
```

## Notes

- The app uses `adapter-auto` in [`spaner/svelte.config.js`](/Users/qingranshao/GithubProject/EEG_Experment_Form/spaner/svelte.config.js), which is suitable for local development and some deployment targets.
- Runes are enabled for local source files through the Svelte Vite plugin configuration.
- The current dashboard and authentication buttons are UI placeholders and are not yet wired to backend services.
- The schema currently uses both `created_at` and `create_at`. Keeping one convention across all tables will reduce avoidable backend and migration mistakes.

## Next Steps

- Add real authentication flow for login and registration
- Implement participant and experiment form data models
- Connect the dashboard to persisted EEG experiment records
- Add route-level data loading and form validation
- Introduce tests for the main user flows
