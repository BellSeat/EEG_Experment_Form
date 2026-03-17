# SPANER Lab Portal

A SvelteKit prototype for the SPANER Lab login portal.

The current homepage is a two-column login layout with:

- a left-side authentication panel
- a right-side visual panel with navigation
- a centered desktop layout capped at `1024px` wide
- responsive stacking behavior on smaller screens

## Tech Stack

- SvelteKit
- Svelte 5
- TypeScript
- Vite
- Prettier with `prettier-plugin-svelte`

## Getting Started

Install dependencies:

```sh
npm install
```

Start the development server:

```sh
npm run dev
```

Run type and Svelte checks:

```sh
npm run check
```

Build for production:

```sh
npm run build
```

Preview the production build:

```sh
npm run preview
```

## Project Structure

```text
src/
  routes/
    +layout.svelte
    +page.svelte
    dashboard/
      +page.svelte
```

- `src/routes/+page.svelte`
  Main landing page for the portal login experience.
- `src/routes/dashboard/+page.svelte`
  Simple placeholder dashboard page.

## Formatting

Prettier is configured in `.prettierrc`.

Ignored files and generated folders are listed in `.prettierignore`, including:

- `node_modules`
- `.svelte-kit`
- `build`
- deployment output folders
- `package-lock.json`

## Notes

- The login form is currently a UI prototype only.
- The submit handler prevents a full page refresh.
- The illustration area on the right is a placeholder and can be replaced with a real image or SVG later.
