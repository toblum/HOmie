import './App.css'

const foundations = [
  {
    title: 'Static web foundation',
    body: 'React, TypeScript, and Vite now provide a deployable shell for the browser-based HOmie app.',
  },
  {
    title: 'Quality gates',
    body: 'Linting, unit tests, and Playwright are wired in so future slices can ship against a stable baseline.',
  },
  {
    title: 'GitHub Pages ready',
    body: 'The build output targets a fully static deployment pipeline with a root-path base configuration.',
  },
] as const

function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Slice 1 delivered</p>
        <h1>HOmie is ready for the first real feature slices.</h1>
        <p className="lead">
          This placeholder confirms the app shell, toolchain, and deployment path
          are in place for the static web migration.
        </p>
      </section>

      <section className="foundation-grid" aria-label="Implemented foundations">
        {foundations.map((foundation) => (
          <article key={foundation.title} className="foundation-card">
            <h2>{foundation.title}</h2>
            <p>{foundation.body}</p>
          </article>
        ))}
      </section>
    </main>
  )
}

export default App
