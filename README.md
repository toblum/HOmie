# HOmie

HOmie now has its initial static-web scaffold in place: React + TypeScript + Vite, Vitest for unit tests, Playwright for end-to-end coverage, ESLint for linting, and a GitHub Pages deployment workflow.

## Available scripts

- `npm run dev` — local Vite development server
- `npm run build` — strict TypeScript build plus static Vite bundle
- `npm run lint` — ESLint across the repo
- `npm run test` — Vitest unit test run
- `npm run test:e2e` — Playwright browser test run
- `npm run preview` — serve the built `dist/` output locally

## Deployment

The GitHub Actions workflow in `.github/workflows/deploy.yml` installs dependencies, runs lint/tests/build, uploads `dist/`, and deploys it to GitHub Pages on pushes to `main`.

## Current scope

The app intentionally ships as a minimal placeholder page for Slice 1 so the next issues can build on a stable scaffold instead of starting from docs only.
