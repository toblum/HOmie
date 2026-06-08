# HOmie

**A local-first personal planner for monthly office-presence policy compliance.**

HOmie helps you track how you allocate working days between remote work (*Mobiles Arbeiten*), office presence, and absences — ensuring you stay within your employer's monthly quota.

> 🏠 The app name is a nod to "Home Office", but the canonical tracked status is **Mobiles Arbeiten / Remote Work**.

---

## ✨ Features

- **Monthly quota tracking** — configure a percentage-based remote-work quota and see your computed allowance per month
- **Calendar classification** — automatic detection of weekends and public holidays per *Bundesland* (German federal state)
- **Day status cycle** — quickly step through statuses: unset → remote work → office → vacation → sick → other → unset
- **Policy history** — change quota or federal state with an effective month; earlier months keep their previous rules
- **Local-first** — all data stays in your browser (IndexedDB); no server, no account required
- **Yearly & monthly views** — inspect compliance across a full year or drill into a single month

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 19 + TypeScript |
| Build | Vite |
| State | Zustand |
| Storage | IndexedDB (via `idb`) |
| Holidays | `date-holidays` |
| Testing | Vitest (unit) · Playwright (E2E) |
| Linting | ESLint |
| Deployment | GitHub Pages (via GitHub Actions) |

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- npm (comes with Node.js)

### Installation

```bash
git clone https://github.com/toblum/HOmie.git
cd HOmie
npm install
```

### Development

```bash
npm run dev          # Start local dev server (Vite)
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local Vite development server |
| `npm run build` | TypeScript check + production build |
| `npm run lint` | ESLint across the repo |
| `npm run test` | Vitest unit tests |
| `npm run test:e2e` | Playwright browser tests |
| `npm run test:watch` | Vitest in watch mode |
| `npm run preview` | Serve the built `dist/` locally |

## 🏗 Project Structure

```
src/
├── app/
│   └── components/   # React components (MonthOverview, YearOverview, SettingsPage, …)
├── domain/           # Pure domain logic (calendar, policy, month evaluation)
├── storage/          # IndexedDB persistence layer
├── test/             # Test setup (vitest, fake-indexeddb)
├── App.css           # Global styles
├── App.test.tsx      # Component & integration tests
├── App.tsx           # Root React component
├── index.css         # CSS variables & theme
└── main.tsx          # Entry point

docs/
├── adr/              # Architecture Decision Records
└── PLAN.MD           # Development roadmap

tests/                # Playwright E2E tests
```

## 🗂 Key Concepts

| German | English | Meaning |
|--------|---------|---------|
| Mobiles Arbeiten | Remote Work | A working day outside the office (counts against quota) |
| Quote | Quota | The configured % of working days allowed as remote work |
| Kontingent | Allowance | Computed remote-work days available in a specific month |
| Bundesland | Federal State | Determines which public holidays apply |
| Planung | Plan | A future-dated day record |
| Buchung | Booking | A present/past-dated day record |

## 🚢 Deployment

The GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically:

1. Installs dependencies
2. Runs lint, tests, and build
3. Deploys `dist/` to GitHub Pages

Deployment triggers on pushes to the `main` branch.

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'feat: add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

## 📄 License

This project is currently unlicensed. Please contact the repository owner for usage terms.

---

<p align="center">
  Built with ❤️ for everyone who needs to track their office-presence compliance.
</p>
