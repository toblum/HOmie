import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { createBrowserStorage, type BrowserStorage } from './storage/browserStorage'

const createdDatabases = new Set<string>()

afterEach(async () => {
  await Promise.all(
    [...createdDatabases].map(
      (dbName) =>
        new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(dbName)
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
          request.onblocked = () => reject(new Error(`Deleting database ${dbName} was blocked`))
        }),
    ),
  )
  createdDatabases.clear()
})

function createTestStorage() {
  const dbName = `homie-app-test-${crypto.randomUUID()}`
  createdDatabases.add(dbName)
  return createBrowserStorage({ dbName })
}

function createFailingStorage(message: string): BrowserStorage {
  return {
    load: async () => {
      throw new Error(message)
    },
    saveDayEntry: async () => {},
    deleteDayEntry: async () => {},
    savePolicyHistory: async () => {},
    savePreferences: async () => {},
    saveExcludedDays: async () => {},
    exportState: async () => {
      throw new Error(message)
    },
    restoreState: async () => {},
  }
}

describe('App', () => {
  it('renders every day of the selected month and marks booking versus planning days', async () => {
    render(<App storage={createTestStorage()} today="2026-05-15" />)

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Mai 2026',
      }),
    ).toBeInTheDocument()

    const calendar = screen.getByRole('grid', { name: 'Monatsübersicht' })
    expect(within(calendar).getAllByRole('gridcell')).toHaveLength(31)

    expect(within(calendar).getByRole('gridcell', { name: /14 Donnerstag/i })).toHaveTextContent(
      'Buchung',
    )
    expect(within(calendar).getByRole('gridcell', { name: /18 Montag/i })).toHaveTextContent(
      'Planung',
    )
  })

  it('cycles a working day through the status cycle and reloads the persisted value', async () => {
    const storage = createTestStorage()
    const view = render(<App storage={storage} today="2026-05-15" />)
    const firstRender = within(view.container)

    const dayCell = await firstRender.findByRole('gridcell', { name: /15 Freitag/i })
    const dayButton = within(dayCell).getByRole('button')
    fireEvent.click(dayButton)

    expect(await firstRender.findByText('Mobiles Arbeiten')).toBeInTheDocument()

    view.unmount()
    const reloadedView = render(<App storage={storage} today="2026-05-15" />)
    const secondRender = within(reloadedView.container)

    expect(await secondRender.findByText('Mobiles Arbeiten')).toBeInTheDocument()
  })

  it('opens a detail view, saves an explicit status with note, and restores both after reload', async () => {
    const storage = createTestStorage()
    const view = render(<App storage={storage} today="2026-05-15" />)
    const firstRender = within(view.container)

    const dayCell = await firstRender.findByRole('gridcell', { name: /15 Freitag/i })
    fireEvent.contextMenu(within(dayCell).getByRole('button'))

    expect(await firstRender.findByRole('dialog', { name: 'Tag bearbeiten' })).toBeInTheDocument()

    fireEvent.click(firstRender.getByLabelText('Büro'))
    fireEvent.change(firstRender.getByLabelText('Notiz'), {
      target: { value: 'Desk day' },
    })
    fireEvent.click(firstRender.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => {
      expect(firstRender.queryByRole('dialog', { name: 'Tag bearbeiten' })).not.toBeInTheDocument()
    })
    expect(firstRender.getByText('Büro')).toBeInTheDocument()

    view.unmount()
    const reloadedView = render(<App storage={storage} today="2026-05-15" />)
    const secondRender = within(reloadedView.container)
    const reloadedCell = await secondRender.findByRole('gridcell', { name: /15 Freitag/i })
    fireEvent.contextMenu(within(reloadedCell).getByRole('button'))

    expect(await secondRender.findByDisplayValue('Desk day')).toBeInTheDocument()
    expect(secondRender.getByRole('radio', { name: 'Büro' })).toBeChecked()
  })

  it('resets a day to unset, removes the note, and persists the cleared state', async () => {
    const storage = createTestStorage()
    const view = render(<App storage={storage} today="2026-05-15" />)
    const firstRender = within(view.container)

    const dayCell = await firstRender.findByRole('gridcell', { name: /15 Freitag/i })
    fireEvent.contextMenu(within(dayCell).getByRole('button'))
    fireEvent.click(firstRender.getByLabelText('Büro'))
    fireEvent.change(firstRender.getByLabelText('Notiz'), {
      target: { value: 'Desk day' },
    })
    fireEvent.click(firstRender.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => {
      expect(firstRender.queryByRole('dialog', { name: 'Tag bearbeiten' })).not.toBeInTheDocument()
    })

    const updatedCell = await firstRender.findByRole('gridcell', { name: /15 Freitag/i })
    fireEvent.contextMenu(within(updatedCell).getByRole('button'))
    fireEvent.click(firstRender.getByLabelText('Leer'))
    fireEvent.click(firstRender.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => {
      expect(firstRender.queryByRole('dialog', { name: 'Tag bearbeiten' })).not.toBeInTheDocument()
    })

    const clearedCell = await firstRender.findByRole('gridcell', { name: /15 Freitag/i })
    expect(within(clearedCell).getByText('Leer')).toBeInTheDocument()
    expect(within(clearedCell).queryByText('Desk day')).not.toBeInTheDocument()

    view.unmount()
    const reloadedView = render(<App storage={storage} today="2026-05-15" />)
    const secondRender = within(reloadedView.container)
    const reloadedCell = await secondRender.findByRole('gridcell', { name: /15 Freitag/i })
    fireEvent.contextMenu(within(reloadedCell).getByRole('button'))

    expect(secondRender.getByRole('radio', { name: 'Leer' })).toBeChecked()
    expect(secondRender.getByLabelText('Notiz')).toHaveValue('')
  })

  it('shows weekends, holidays, and excluded days as non-working and non-interactive', async () => {
    const storage = createTestStorage()
    await storage.saveExcludedDays(['2026-05-05'])

    const view = render(<App storage={storage} today="2026-05-15" />)
    const rendered = within(view.container)

    const holidayCell = await rendered.findByRole('gridcell', { name: /1 Freitag/i })
    const weekendCell = rendered.getByRole('gridcell', { name: /2 Samstag/i })
    const excludedCell = rendered.getByRole('gridcell', { name: /5 Dienstag/i })

    expect(within(holidayCell).queryByRole('button')).not.toBeInTheDocument()
    expect(within(holidayCell).getByText('Feiertag')).toBeInTheDocument()
    expect(within(weekendCell).queryByRole('button')).not.toBeInTheDocument()
    expect(within(weekendCell).getByText('Wochenende')).toBeInTheDocument()
    expect(within(excludedCell).queryByRole('button')).not.toBeInTheDocument()
    expect(within(excludedCell).getByText('Ausschlusstag')).toBeInTheDocument()
  })

  it('shows the storage error state when loading fails', async () => {
    const view = render(
      <App storage={createFailingStorage('IndexedDB ist nicht verfügbar')} today="2026-05-15" />,
    )
    const rendered = within(view.container)

    expect(
      await rendered.findByRole('heading', { level: 1, name: 'Speicherfehler' }),
    ).toBeInTheDocument()
    expect(rendered.getByText('IndexedDB ist nicht verfügbar')).toBeInTheDocument()
  })
})
