import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { createBrowserStorage, type BrowserStorage } from './storage/browserStorage'

const createdDatabases = new Set<string>()

afterEach(async () => {
  cleanup()

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

function expectSummaryMetric(summaryPanel: HTMLElement, label: string, value: string) {
  const metric = within(summaryPanel).getByText(label).closest('.summary-metric')

  expect(metric).not.toBeNull()
  expect(within(metric as HTMLElement).getByText(value)).toBeInTheDocument()
}

describe('App', () => {
  it('renders the summary panel values for the selected month', async () => {
    const storage = createTestStorage()
    await storage.savePolicyHistory([{ effectiveMonth: '1900-01', quota: 0.5, bundesland: 'BE' }])
    await storage.saveDayEntry({ date: '2025-02-03', status: 'remote-work' })
    await storage.saveDayEntry({ date: '2025-02-04', status: 'office' })

    render(<App storage={storage} today="2025-02-01" />)

    const summaryPanel = await screen.findByRole('region', { name: 'Monatsstand' })

    expectSummaryMetric(summaryPanel, 'Arbeitstage', '20')
    expectSummaryMetric(summaryPanel, 'Kontingent', '10')
    expectSummaryMetric(summaryPanel, 'Mobiles Arbeiten', '1 / 10')
    expectSummaryMetric(summaryPanel, 'Büro', '1')
    expectSummaryMetric(summaryPanel, 'Abwesenheit', '0')
    expectSummaryMetric(summaryPanel, 'Offene Arbeitstage', '0')
    expect(within(summaryPanel).getByText('Verbrauch')).toBeInTheDocument()
    expect(within(summaryPanel).getByText('10 %')).toBeInTheDocument()
  })

  it('updates the summary panel immediately when a working day changes status', async () => {
    const storage = createTestStorage()
    await storage.savePolicyHistory([{ effectiveMonth: '1900-01', quota: 0.5, bundesland: 'BE' }])

    render(<App storage={storage} today="2025-02-01" />)

    const summaryPanel = await screen.findByRole('region', { name: 'Monatsstand' })
    const dayCell = await screen.findByRole('gridcell', { name: /3 Montag/i })

    fireEvent.click(within(dayCell).getByRole('button'))

    await waitFor(() => {
      expectSummaryMetric(summaryPanel, 'Mobiles Arbeiten', '1 / 10')
      expect(within(summaryPanel).getByText('10 %')).toBeInTheDocument()
    })
  })

  it('shows warning when remote-work usage exceeds the saved warning threshold', async () => {
    const storage = createTestStorage()
    await storage.savePolicyHistory([{ effectiveMonth: '1900-01', quota: 0.5, bundesland: 'BE' }])
    await storage.savePreferences({ language: 'de', theme: 'system', warningThreshold: 0.75 })

    for (const date of [
      '2025-02-03',
      '2025-02-04',
      '2025-02-05',
      '2025-02-06',
      '2025-02-07',
      '2025-02-10',
      '2025-02-11',
      '2025-02-12',
    ] as const) {
      await storage.saveDayEntry({ date, status: 'remote-work' })
    }

    render(<App storage={storage} today="2025-02-01" />)

    const summaryPanel = await screen.findByRole('region', { name: 'Monatsstand' })

    expectSummaryMetric(summaryPanel, 'Mobiles Arbeiten', '8 / 10')
    expect(within(summaryPanel).getByText('Warnung')).toBeInTheDocument()
  })

  it('uses the effective policy-history quota and shows over-limit when usage exceeds it', async () => {
    const storage = createTestStorage()
    await storage.savePolicyHistory([
      { effectiveMonth: '1900-01', quota: 0.5, bundesland: 'BE' },
      { effectiveMonth: '2025-02', quota: 0.2, bundesland: 'BE' },
    ])

    for (const date of [
      '2025-02-03',
      '2025-02-04',
      '2025-02-05',
      '2025-02-06',
      '2025-02-07',
    ] as const) {
      await storage.saveDayEntry({ date, status: 'remote-work' })
    }

    render(<App storage={storage} today="2025-02-01" />)

    const summaryPanel = await screen.findByRole('region', { name: 'Monatsstand' })

    expectSummaryMetric(summaryPanel, 'Kontingent', '4')
    expectSummaryMetric(summaryPanel, 'Mobiles Arbeiten', '5 / 4')
    expect(within(summaryPanel).getByText('Über Limit')).toBeInTheDocument()
  })

  it('shows not-applicable when a month has no working days after absences', async () => {
    const storage = createTestStorage()
    await storage.savePolicyHistory([{ effectiveMonth: '1900-01', quota: 0.5, bundesland: 'BE' }])

    for (let day = 1; day <= 28; day += 1) {
      const date = new Date(2025, 1, day, 12)
      const weekday = date.getDay()

      if (weekday !== 0 && weekday !== 6) {
        const isoDate = `2025-02-${String(day).padStart(2, '0')}` as const
        await storage.saveDayEntry({ date: isoDate, status: 'vacation' })
      }
    }

    render(<App storage={storage} today="2025-02-28" />)

    const summaryPanel = await screen.findByRole('region', { name: 'Monatsstand' })

    expectSummaryMetric(summaryPanel, 'Arbeitstage', '0')
    expectSummaryMetric(summaryPanel, 'Kontingent', '0')
    expectSummaryMetric(summaryPanel, 'Abwesenheit', '20')
    expect(within(summaryPanel).getByText('Nicht anwendbar')).toBeInTheDocument()
  })

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

  it('navigates to the previous and next month from the Monatsübersicht header', async () => {
    const storage = createTestStorage()
    await storage.savePolicyHistory([
      { effectiveMonth: '1900-01', quota: 0.5, bundesland: 'BE' },
      { effectiveMonth: '2026-06', quota: 0.25, bundesland: 'BE' },
    ])
    await storage.saveDayEntry({ date: '2026-04-15', status: 'office' })
    await storage.saveDayEntry({ date: '2026-06-02', status: 'remote-work' })

    render(<App storage={storage} today="2026-05-15" />)

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Mai 2026',
      }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Vorheriger Monat' }))

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'April 2026',
      }),
    ).toBeInTheDocument()

    const aprilSummary = await screen.findByRole('region', { name: 'Monatsstand' })
    expectSummaryMetric(aprilSummary, 'Büro', '1')

    fireEvent.click(screen.getByRole('button', { name: 'Nächster Monat' }))
    fireEvent.click(screen.getByRole('button', { name: 'Nächster Monat' }))

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Juni 2026',
      }),
    ).toBeInTheDocument()

    const juneSummary = await screen.findByRole('region', { name: 'Monatsstand' })
    expectSummaryMetric(juneSummary, 'Kontingent', '5')
    expectSummaryMetric(juneSummary, 'Mobiles Arbeiten', '1 / 5')
  })

  it('shows a Jahresübersicht with independently evaluated month cards for the selected year', async () => {
    const storage = createTestStorage()
    await storage.savePolicyHistory([
      { effectiveMonth: '1900-01', quota: 0.5, bundesland: 'BE' },
      { effectiveMonth: '2026-07', quota: 0.25, bundesland: 'BE' },
    ])

    for (const date of ['2026-05-04', '2026-05-05', '2026-05-06'] as const) {
      await storage.saveDayEntry({ date, status: 'remote-work' })
    }

    for (const date of ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07'] as const) {
      await storage.saveDayEntry({ date, status: 'remote-work' })
    }

    await storage.saveDayEntry({ date: '2026-08-10', status: 'office' })

    render(<App storage={storage} today="2026-05-15" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Jahresübersicht öffnen' }))

    const yearOverview = await screen.findByRole('region', { name: 'Jahresübersicht' })
    const monthCards = within(yearOverview).getAllByRole('button', { name: /2026 öffnen/i })
    expect(monthCards).toHaveLength(12)

    const mayCard = within(yearOverview).getByRole('button', { name: 'Mai 2026 öffnen' })
    expect(within(mayCard).getByText('Normal')).toBeInTheDocument()
    expect(within(mayCard).getByText('3 / 9')).toBeInTheDocument()

    const augustCard = within(yearOverview).getByRole('button', { name: 'August 2026 öffnen' })
    expect(within(augustCard).getByText('Warnung')).toBeInTheDocument()
    expect(within(augustCard).getByText('5 / 5')).toBeInTheDocument()
    expect(within(augustCard).getByText('1')).toBeInTheDocument()
  })

  it('navigates years in the Jahresübersicht and opens a month card in the Monatsübersicht', async () => {
    const storage = createTestStorage()
    await storage.savePolicyHistory([{ effectiveMonth: '1900-01', quota: 0.5, bundesland: 'BE' }])
    await storage.saveDayEntry({ date: '2025-02-03', status: 'office' })

    render(<App storage={storage} today="2026-05-15" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Jahresübersicht öffnen' }))

    expect(await screen.findByRole('heading', { level: 1, name: '2026' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Vorheriges Jahr' }))

    expect(await screen.findByRole('heading', { level: 1, name: '2025' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Februar 2025 öffnen' }))

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Februar 2025',
      }),
    ).toBeInTheDocument()

    const summaryPanel = await screen.findByRole('region', { name: 'Monatsstand' })
    expectSummaryMetric(summaryPanel, 'Büro', '1')
    expect(screen.getByRole('grid', { name: 'Monatsübersicht' })).toBeInTheDocument()
  })

  it('cycles a working day through the status cycle and reloads the persisted value', async () => {
    const storage = createTestStorage()
    const view = render(<App storage={storage} today="2026-05-15" />)
    const firstRender = within(view.container)

    const dayCell = await firstRender.findByRole('gridcell', { name: /15 Freitag/i })
    const dayButton = within(dayCell).getByRole('button')
    fireEvent.click(dayButton)

    await waitFor(() => {
      expect(within(dayCell).getByText('Mobiles Arbeiten')).toBeInTheDocument()
    })

    view.unmount()
    const reloadedView = render(<App storage={storage} today="2026-05-15" />)
    const secondRender = within(reloadedView.container)
    const reloadedCell = await secondRender.findByRole('gridcell', { name: /15 Freitag/i })

    expect(within(reloadedCell).getByText('Mobiles Arbeiten')).toBeInTheDocument()
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

    const updatedCell = await firstRender.findByRole('gridcell', { name: /15 Freitag/i })
    expect(within(updatedCell).getByText('Büro')).toBeInTheDocument()

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
