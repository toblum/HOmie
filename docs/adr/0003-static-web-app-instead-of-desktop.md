# Static web application instead of desktop application

HOmie is built as a static React + TypeScript web application deployed to GitHub Pages, rather than as an Electron desktop application. We chose this because the core domain — monthly quota tracking for a single user — requires no native OS capabilities and is fully achievable in the browser. A static web deployment is simpler to maintain, requires no installer, and is immediately accessible to any user with a browser.

The desktop-specific features that were planned (system tray, autostart, OS notifications) are dropped in v1. The single-user model is preserved: each user's browser holds exactly one data set in IndexedDB, with no login or profile concept. Cross-device portability is handled by explicit JSON export and restore rather than sync.

The application is built with Vite, outputs a fully static asset bundle, and is deployed to the `gh-pages` branch of this repository. The Vite `base` path is set to `/` since the site runs at the root of the GitHub Pages domain.

## Technology stack

- **React** — UI components and rendering
- **TypeScript** — full application and domain code
- **Vite** — build tooling and dev server
- **date-fns** — date arithmetic
- **date-holidays** — public holiday resolution per Bundesland
- **Zustand** — lightweight state management
- **idb** — typed IndexedDB wrapper for browser-local persistence

## What this ADR does not change

- ADR-0001: Policy history separate from personal preferences — unchanged.
- Domain vocabulary in `CONTEXT.md` — unchanged.
- Rounding mode, quota model, and all month-evaluation rules — unchanged.
- Export and restore semantics — unchanged.
- Language selection (DE/EN) as a personal preference — unchanged.
