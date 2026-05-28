import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { createBrowserStorage } from './storage/browserStorage'

afterEach(async () => {
  cleanup()
})

function uniqueDatabaseName(): string {
  return `homie-app-test-${crypto.randomUUID()}`
}

describe('App', () => {
  it('renders the current month and advances a working day through the status cycle', async () => {
    render(
      <App
        storage={createBrowserStorage({ dbName: uniqueDatabaseName() })}
        today="2026-05-15"
      />,
    )

    expect(await screen.findByRole('button', { name: /Tag 2026-05-04/i })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(31)

    const pastWorkingDay = screen.getByRole('button', { name: /Tag 2026-05-04/i })
    const futureWorkingDay = screen.getByRole('button', { name: /Tag 2026-05-20/i })

    expect(within(pastWorkingDay).getByText('Buchung')).toBeInTheDocument()
    expect(within(futureWorkingDay).getByText('Planung')).toBeInTheDocument()
    expect(within(pastWorkingDay).getByText('Leer')).toBeInTheDocument()

    fireEvent.click(pastWorkingDay)
    expect(await within(pastWorkingDay).findByText('Mobiles Arbeiten')).toBeInTheDocument()

    fireEvent.click(pastWorkingDay)
    expect(await within(pastWorkingDay).findByText('Büro')).toBeInTheDocument()
  })

  it('edits a day explicitly, persists the note, and removes it when reset to unset', async () => {
    const dbName = uniqueDatabaseName()

    const { unmount } = render(
      <App storage={createBrowserStorage({ dbName })} today="2026-05-15" />,
    )

    expect(await screen.findByRole('button', { name: /Tag 2026-05-05/i })).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: /Details für 2026-05-05/i }))

    const dialog = await screen.findByRole('dialog', { name: /2026-05-05/i })
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Urlaub' }))
    fireEvent.change(within(dialog).getByLabelText('Notiz'), {
      target: { value: 'Familienurlaub' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))

    await waitFor(() => {
      const day = screen.getByRole('button', { name: /Tag 2026-05-05/i })
      expect(within(day).getByText('Urlaub')).toBeInTheDocument()
      expect(within(day).getByText('Familienurlaub')).toBeInTheDocument()
    })

    unmount()

    render(<App storage={createBrowserStorage({ dbName })} today="2026-05-15" />)

    const persistedDay = await screen.findByRole('button', { name: /Tag 2026-05-05/i })
    expect(within(persistedDay).getByText('Urlaub')).toBeInTheDocument()
    expect(within(persistedDay).getByText('Familienurlaub')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Details für 2026-05-05/i }))

    const persistedDialog = await screen.findByRole('dialog', { name: /2026-05-05/i })
    fireEvent.click(within(persistedDialog).getByRole('radio', { name: 'Leer' }))
    fireEvent.click(within(persistedDialog).getByRole('button', { name: 'Speichern' }))

    await waitFor(() => {
      const resetDay = screen.getByRole('button', { name: /Tag 2026-05-05/i })
      expect(within(resetDay).getByText('Leer')).toBeInTheDocument()
      expect(within(resetDay).queryByText('Familienurlaub')).not.toBeInTheDocument()
    })
  })

  it('renders non-working days with distinct labels and without edit controls', async () => {
    render(
      <App
        storage={createBrowserStorage({ dbName: uniqueDatabaseName() })}
        today="2026-05-15"
      />,
    )

    expect(await screen.findByText('2026-05-01')).toBeVisible()

    const publicHoliday = screen.getByText('2026-05-01').closest('li')
    expect(publicHoliday).not.toBeNull()
    expect(within(publicHoliday as HTMLElement).getByText('Feiertag')).toBeInTheDocument()
    expect(within(publicHoliday as HTMLElement).queryByRole('button')).not.toBeInTheDocument()

    const weekend = screen.getByText('2026-05-02').closest('li')
    expect(weekend).not.toBeNull()
    expect(within(weekend as HTMLElement).getByText('Wochenende')).toBeInTheDocument()
  })

  it('closes the detail dialog with Escape and returns focus to the trigger', async () => {
    render(
      <App
        storage={createBrowserStorage({ dbName: uniqueDatabaseName() })}
        today="2026-05-15"
      />,
    )

    const detailTrigger = await screen.findByRole('button', { name: /Details für 2026-05-05/i })
    fireEvent.click(detailTrigger)

    const dialog = await screen.findByRole('dialog', { name: /2026-05-05/i })
    fireEvent.keyDown(dialog, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /2026-05-05/i })).not.toBeInTheDocument()
      expect(detailTrigger).toHaveFocus()
    })
  })
})
