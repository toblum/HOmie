import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the scaffold placeholder content', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'HOmie is ready for the first real feature slices.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/GitHub Pages ready/i)).toBeInTheDocument()
  })
})
