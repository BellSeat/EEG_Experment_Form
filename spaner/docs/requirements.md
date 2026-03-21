# Requirements

This document explains what is needed to run the SPANER frontend on a clean Mac or Windows machine.

## What this repository is

This repository is the SvelteKit frontend for the SPANER portal.

It does not include the FastAPI backend. If you want the full app experience, the backend API must also be running and reachable through the frontend's `/api` proxy.

## Minimum system requirements

- macOS or Windows
- Terminal access
- internet access to install dependencies

## Required tools

Install these first on a blank machine:

- `git`
- `node`
- `npm`

### Recommended Node version

Use:

- `Node.js 20.19+`

or:

- `Node.js 22.12+`

Why:

- this project uses `vite@7`
- the repo has `engine-strict=true` in `.npmrc`
- unsupported Node versions can fail during `npm install`

## Recommended installation path on macOS

### 1. Install Xcode Command Line Tools

```sh
xcode-select --install
```

This usually gives you core developer tools and `git`.

### 2. Install Homebrew

If Homebrew is not installed yet:

```sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 3. Install Node.js

You can use either Homebrew or `nvm`.

Example with Homebrew:

```sh
brew install node@22
```

After that, confirm versions:

```sh
node -v
npm -v
git --version
```

## Recommended installation path on Windows

### 1. Install Git

Recommended with `winget`:

```powershell
winget install --id Git.Git -e
```

You can also install Git for Windows manually from:

- https://git-scm.com/download/win

### 2. Install Node.js

Recommended with `winget`:

```powershell
winget install --id OpenJS.NodeJS.LTS -e
```

You can also use `nvm-windows` if your team prefers version pinning on Windows.

### 3. Restart the terminal

After installing Git or Node on Windows, open a fresh PowerShell or Command Prompt window so the new PATH entries are available.

### 4. Confirm versions

```powershell
node -v
npm -v
git --version
```

## Project dependencies

This project does not require global npm packages.

All JavaScript dependencies are installed locally from `package.json`.

Main local packages include:

- `@sveltejs/kit`
- `@sveltejs/adapter-auto`
- `@sveltejs/vite-plugin-svelte`
- `svelte`
- `vite`
- `typescript`
- `svelte-check`
- `tailwindcss`
- `@tailwindcss/vite`
- `prettier`
- `prettier-plugin-svelte`

## Frontend setup

### 1. Clone the repository

```sh
git clone <repo-url>
cd page/spaner
```

### 2. Install dependencies

Use:

```sh
npm install
```

If you want a lockfile-clean install in CI or a controlled environment, use:

```sh
npm ci
```

### 3. Create environment configuration

Create a local `.env` file:

macOS:

```sh
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Then set:

```sh
PUBLIC_API_BASE_URL=/api
DEV_API_PROXY_TARGET=http://127.0.0.1:8000
API_PROXY_TARGET=http://127.0.0.1:8000
```

Adjust `DEV_API_PROXY_TARGET` and `API_PROXY_TARGET` if your FastAPI backend runs on another host or port.

### 4. Start the frontend

```sh
npm run dev
```

If you want to access it from another device on the same network:

```sh
npm run dev -- --host
```

### 5. Open the app

By default, Vite usually serves the frontend at:

- `http://localhost:5173`

## Production-style checks

Run these before handing the project to another teammate:

```sh
npm run check
npm run build
```

To preview the production build locally:

```sh
npm run preview
```

## Backend requirement

The frontend can compile without the backend, but the real portal workflow depends on the API.

To use login and data-backed pages, the FastAPI service must provide endpoints such as:

- `/auth/login`
- `/subjects`
- `/sessions`
- `/session_files`
- `/experiment-plans`
- `/experiment-steps`
- `/experiment-data`
- `/eeg-maps`
- `/audit-log`

## Common macOS issues

### Node version is rejected during install

Cause:

- `.npmrc` enables `engine-strict`
- your installed Node version is below the Vite requirement

Fix:

- upgrade Node to `20.19+` or `22.12+`

### `npm install` works but API requests fail

Cause:

- frontend is running
- backend is not running or the `/api` proxy target is wrong

Fix:

- start FastAPI
- verify `.env`
- verify backend CORS settings

### Login page opens but nothing useful loads

Cause:

- frontend can render without API data
- but the portal pages depend on a valid backend response

Fix:

- check backend health
- check auth token handling
- check the API base URL

## Common Windows issues

### `npm` or `node` is not recognized

Cause:

- Node.js was installed
- but the terminal session was opened before the install completed

Fix:

- close PowerShell or Command Prompt
- open a new terminal window
- run `node -v` and `npm -v` again

### `git` is not recognized

Cause:

- Git for Windows is not installed
- or PATH has not refreshed yet

Fix:

- install Git for Windows
- reopen the terminal

### `npm install` fails because of Node version

Cause:

- `.npmrc` enables `engine-strict`
- your installed Node version is below the Vite requirement

Fix:

- upgrade Node to `20.19+` or `22.12+`

### API requests fail even though the frontend starts

Cause:

- frontend is running locally
- backend is not running or the `/api` proxy target is wrong

Fix:

- start FastAPI
- verify `.env`
- verify backend CORS settings

## Summary

For a clean Mac or Windows machine, the practical requirements are:

- Xcode Command Line Tools on macOS, or Git installation on Windows
- `git`
- `Node.js 20.19+` or `22.12+`
- `npm`
- local `.env` with `PUBLIC_API_BASE_URL=/api`
- local `.env` with `DEV_API_PROXY_TARGET`
- local `.env` with `API_PROXY_TARGET`
- running FastAPI backend if you want the real app experience
