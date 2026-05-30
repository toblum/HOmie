import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { createBrowserStorage, type BrowserStorage } from './storage/browserStorage'

const createdDatabases = new Set<string>()

afterEach(async () => {
  vi.restoreAllMocks()
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

  it('updates the warning threshold immediately from personal settings and persists it', async () => {
    const storage = createTestStorage()
    await storage.savePolicyHistory([{ effectiveMonth: '1900-01', quota: 0.5, bundesland: 'BE' }])

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
    expect(within(summaryPanel).getByText('Normal')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Warnschwelle'), {
      target: { value: '75' },
    })

    await waitFor(async () => {
      expect(within(summaryPanel).getByText('Warnung')).toBeInTheDocument()
      await expect(storage.load()).resolves.toMatchObject({
        preferences: {
          warningThreshold: 0.75,
        },
      })
    })

    cleanup()
    render(<App storage={storage} today="2025-02-01" />)

    const reloadedSummary = await screen.findByRole('region', { name: 'Monatsstand' })
    expect(within(reloadedSummary).getByText('Warnung')).toBeInTheDocument()
    expect(screen.getByLabelText('Warnschwelle')).toHaveValue(75)
  })

  it('exports the full state as a JSON download from the settings UI', async () => {
    const storage = createTestStorage()
    await storage.savePreferences({ language: 'de', theme: 'system', warningThreshold: 0.75 })
    await storage.savePolicyHistory([{ effectiveMonth: '2026-01', quota: 0.4, bundesland: 'BY' }])
    await storage.saveDayEntry({ date: '2026-05-15', status: 'remote-work', note: 'Fokuszeit' })
    await storage.saveExcludedDays(['2026-05-21'])

    const createObjectUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => 'blob:homie-export')
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<App storage={storage} today="2026-05-15" />)

    fireEvent.click(await screen.findByRole('button', { name: 'JSON exportieren' }))

    await waitFor(async () => {
      expect(createObjectUrlSpy).toHaveBeenCalledTimes(1)

      const [blob] = createObjectUrlSpy.mock.calls[0] ?? []
      expect(blob).toBeInstanceOf(Blob)

      const exportedState = JSON.parse(await (blob as Blob).text())

      expect(exportedState).toEqual({
        schemaVersion: 1,
        preferences: { language: 'de', theme: 'system', warningThreshold: 0.75 },
        policyHistory: [
          { effectiveMonth: '1900-01', quota: 0.4, bundesland: 'BY' },
          { effectiveMonth: '2026-01', quota: 0.4, bundesland: 'BY' },
        ],
        entries: [{ date: '2026-05-15', status: 'remote-work', note: 'Fokuszeit' }],
        excludedDays: ['2026-05-21'],
      })
      expect(anchorClickSpy).toHaveBeenCalledTimes(1)
      expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:homie-export')
    })
  })

  it('restores a JSON snapshot after confirmation and updates the UI immediately', async () => {
    const storage = createTestStorage()
    await storage.savePreferences({ language: 'de', theme: 'system', warningThreshold: 0.75 })
    await storage.savePolicyHistory([{ effectiveMonth: '2026-01', quota: 0.4, bundesland: 'BY' }])
    await storage.saveDayEntry({ date: '2026-05-15', status: 'remote-work', note: 'Altbestand' })

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const restoreFile = new File(
      [
        JSON.stringify({
          schemaVersion: 1,
          preferences: { language: 'en', theme: 'dark', warningThreshold: 0.6 },
          policyHistory: [
            { effectiveMonth: '1900-01', quota: 0.25, bundesland: 'NW' },
            { effectiveMonth: '2026-01', quota: 0.25, bundesland: 'NW' },
          ],
          entries: [{ date: '2026-05-13', status: 'office', note: 'Restored desk day' }],
          excludedDays: ['2026-05-05'],
        }),
      ],
      'homie-restore.json',
      { type: 'application/json' },
    )

    render(<App storage={storage} today="2026-05-15" />)

    const restoreInput = (await screen.findByLabelText('JSON wiederherstellen')) as HTMLInputElement
    expect(restoreInput).toHaveAttribute('accept', 'application/json,.json')

    fireEvent.change(restoreInput, {
      target: {
        files: [restoreFile],
      },
    })

    await waitFor(async () => {
      expect(confirmSpy).toHaveBeenCalledTimes(1)
      expect(await screen.findByRole('region', { name: 'Policy History' })).toBeInTheDocument()
      expect(document.documentElement.dataset.theme).toBe('dark')
      expect(screen.getByLabelText('Warning threshold')).toHaveValue(60)

      const restoredOfficeCell = screen.getByRole('gridcell', { name: /13 Wednesday/i })
      const clearedCell = screen.getByRole('gridcell', { name: /15 Friday/i })

      expect(within(restoredOfficeCell).getByText('Office')).toBeInTheDocument()
      expect(within(clearedCell).getByText('Unset')).toBeInTheDocument()
      expect(within(clearedCell).queryByText('Remote Work')).not.toBeInTheDocument()

      await expect(storage.load()).resolves.toMatchObject({
        preferences: { language: 'en', theme: 'dark', warningThreshold: 0.6 },
        entries: [{ date: '2026-05-13', status: 'office', note: 'Restored desk day' }],
        excludedDays: ['2026-05-05'],
      })
    })
  })

  it('shows a clear restore error for an incompatible snapshot and keeps the current state untouched', async () => {
    const storage = createTestStorage()
    await storage.savePreferences({ language: 'de', theme: 'system', warningThreshold: 0.75 })
    await storage.savePolicyHistory([{ effectiveMonth: '2026-01', quota: 0.4, bundesland: 'BY' }])
    await storage.saveDayEntry({ date: '2026-05-15', status: 'remote-work', note: 'Altbestand' })

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const incompatibleFile = new File(
      [
        JSON.stringify({
          schemaVersion: 2,
          preferences: { language: 'en', theme: 'dark', warningThreshold: 0.6 },
          policyHistory: [{ effectiveMonth: '1900-01', quota: 0.25, bundesland: 'NW' }],
          entries: [{ date: '2026-05-13', status: 'office' }],
          excludedDays: [],
        }),
      ],
      'homie-invalid-restore.json',
      { type: 'application/json' },
    )

    render(<App storage={storage} today="2026-05-15" />)

    fireEvent.change(await screen.findByLabelText('JSON wiederherstellen'), {
      target: {
        files: [incompatibleFile],
      },
    })

    await waitFor(async () => {
      expect(confirmSpy).toHaveBeenCalledTimes(1)
      expect(screen.getByRole('alert')).toHaveTextContent(/schema version 2/i)
      expect(screen.getByRole('region', { name: 'Regelverlauf' })).toBeInTheDocument()

      const unchangedCell = screen.getByRole('gridcell', { name: /15 Freitag/i })
      expect(within(unchangedCell).getByText('Mobiles Arbeiten')).toBeInTheDocument()

      await expect(storage.load()).resolves.toMatchObject({
        preferences: { language: 'de', theme: 'system', warningThreshold: 0.75 },
        entries: [{ date: '2026-05-15', status: 'remote-work', note: 'Altbestand' }],
      })
    })
  })

  it('shows a clear restore error for malformed JSON and keeps the current state untouched', async () => {
    const storage = createTestStorage()
    await storage.savePreferences({ language: 'de', theme: 'system', warningThreshold: 0.75 })
    await storage.savePolicyHistory([{ effectiveMonth: '2026-01', quota: 0.4, bundesland: 'BY' }])
    await storage.saveDayEntry({ date: '2026-05-15', status: 'remote-work', note: 'Altbestand' })

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const malformedFile = new File(['{"schemaVersion":'], 'homie-malformed.json', {
      type: 'application/json',
    })

    render(<App storage={storage} today="2026-05-15" />)

    fireEvent.change(await screen.findByLabelText('JSON wiederherstellen'), {
      target: {
        files: [malformedFile],
      },
    })

    await waitFor(async () => {
      expect(screen.getByRole('alert')).toHaveTextContent('JSON-Datei ist ungültig.')
      expect(screen.getByRole('region', { name: 'Regelverlauf' })).toBeInTheDocument()

      const unchangedCell = screen.getByRole('gridcell', { name: /15 Freitag/i })
      expect(within(unchangedCell).getByText('Mobiles Arbeiten')).toBeInTheDocument()

      await expect(storage.load()).resolves.toMatchObject({
        preferences: { language: 'de', theme: 'system', warningThreshold: 0.75 },
        entries: [{ date: '2026-05-15', status: 'remote-work', note: 'Altbestand' }],
      })
    })
  })

  it('round-trips the full state through export and restore', async () => {
    const storage = createTestStorage()
    await storage.savePreferences({ language: 'de', theme: 'system', warningThreshold: 0.75 })
    await storage.savePolicyHistory([{ effectiveMonth: '2026-01', quota: 0.4, bundesland: 'BY' }])
    await storage.saveDayEntry({ date: '2026-05-15', status: 'remote-work', note: 'Original' })
    await storage.saveExcludedDays(['2026-05-05'])

    const createObjectUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => 'blob:homie-roundtrip')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<App storage={storage} today="2026-05-15" />)

    fireEvent.click(await screen.findByRole('button', { name: 'JSON exportieren' }))

    await waitFor(() => {
      expect(createObjectUrlSpy).toHaveBeenCalledTimes(1)
    })

    const [exportedBlob] = createObjectUrlSpy.mock.calls[0] ?? []
    const exportedJson = await (exportedBlob as Blob).text()

    fireEvent.click(screen.getByLabelText('English'))

    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Policy History' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('gridcell', { name: /13 Wednesday/i }).querySelector('button') as HTMLElement)

    await waitFor(() => {
      expect(within(screen.getByRole('gridcell', { name: /13 Wednesday/i })).getByText('Remote Work')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Restore JSON'), {
      target: {
        files: [new File([exportedJson], 'homie-roundtrip.json', { type: 'application/json' })],
      },
    })

    await waitFor(async () => {
      expect(screen.getByRole('region', { name: 'Regelverlauf' })).toBeInTheDocument()
      expect(screen.getByLabelText('Warnschwelle')).toHaveValue(75)
      expect(within(screen.getByRole('gridcell', { name: /15 Freitag/i })).getByText('Mobiles Arbeiten')).toBeInTheDocument()
      expect(within(screen.getByRole('gridcell', { name: /13 Mittwoch/i })).getByText('Leer')).toBeInTheDocument()

      await expect(storage.load()).resolves.toEqual({
        schemaVersion: 1,
        preferences: { language: 'de', theme: 'system', warningThreshold: 0.75 },
        policyHistory: [
          { effectiveMonth: '1900-01', quota: 0.4, bundesland: 'BY' },
          { effectiveMonth: '2026-01', quota: 0.4, bundesland: 'BY' },
        ],
        entries: [{ date: '2026-05-15', status: 'remote-work', note: 'Original' }],
        excludedDays: ['2026-05-05'],
      })
    })
  })

  it('switches the UI language immediately between German and English', async () => {
    const storage = createTestStorage()
    const firstView = render(<App storage={storage} today="2025-02-01" />)

    expect(
      await screen.findByRole('button', { name: 'Jahresübersicht öffnen' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Monatsübersicht')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('English'))

    expect(await screen.findByText('Monthly Overview')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open yearly overview' })).toBeInTheDocument()
    expect(screen.getByRole('grid', { name: 'Monthly overview' })).toBeInTheDocument()
    expect(screen.getByText('Remote Work')).toBeInTheDocument()
    await expect(storage.load()).resolves.toMatchObject({
      preferences: {
        language: 'en',
      },
    })

    firstView.unmount()
    render(<App storage={storage} today="2025-02-01" />)

    expect(await screen.findByText('Monthly Overview')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open yearly overview' })).toBeInTheDocument()
  })

  it('persists the theme preference and applies it on load', async () => {
    const storage = createTestStorage()
    const firstView = render(<App storage={storage} today="2025-02-01" />)

    expect(
      await screen.findByRole('button', { name: 'Jahresübersicht öffnen' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Dunkel'))

    await waitFor(async () => {
      expect(document.documentElement.dataset.theme).toBe('dark')
      await expect(storage.load()).resolves.toMatchObject({
        preferences: {
          theme: 'dark',
        },
      })
    })

    firstView.unmount()
    render(<App storage={storage} today="2025-02-01" />)

    expect(
      await screen.findByRole('button', { name: 'Jahresübersicht öffnen' }),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark')
      expect(screen.getByRole('radio', { name: 'Dunkel' })).toBeChecked()
    })
  })

  it('lists policy history chronologically, enforces the next effective month, and re-evaluates immediately after adding an entry', async () => {
    const storage = createTestStorage()
    await storage.savePolicyHistory([
      { effectiveMonth: '1900-01', quota: 0.6, bundesland: 'BE' },
      { effectiveMonth: '2025-01', quota: 0.5, bundesland: 'BE' },
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

    const firstView = render(<App storage={storage} today="2025-02-01" />)
    const summaryPanel = await screen.findByRole('region', { name: 'Monatsstand' })
    const policyHistory = screen.getByRole('region', { name: 'Regelverlauf' })

    expectSummaryMetric(summaryPanel, 'Kontingent', '10')
    expect(screen.getByLabelText('Wirksamkeitsmonat')).toHaveAttribute('min', '2025-02')

    const entriesBefore = within(policyHistory).getAllByRole('listitem')
    expect(entriesBefore[0]).toHaveTextContent('1900-01')
    expect(entriesBefore[1]).toHaveTextContent('2025-01')

    fireEvent.change(screen.getByLabelText('Quote'), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText('Bundesland'), { target: { value: 'BY' } })
    fireEvent.change(screen.getByLabelText('Wirksamkeitsmonat'), { target: { value: '2025-02' } })
    fireEvent.click(screen.getByRole('button', { name: 'Eintrag hinzufügen' }))

    await waitFor(() => {
      expectSummaryMetric(summaryPanel, 'Kontingent', '4')
      expect(screen.getAllByText('Quote 20 % · Bundesland BY')).toHaveLength(2)
    })

    const entriesAfter = within(policyHistory).getAllByRole('listitem')
    expect(entriesAfter[0]).toHaveTextContent('1900-01')
    expect(entriesAfter[1]).toHaveTextContent('2025-01')
    expect(entriesAfter[2]).toHaveTextContent('2025-02')

    firstView.unmount()
    render(<App storage={storage} today="2025-02-01" />)

    expect(await screen.findByRole('region', { name: 'Regelverlauf' })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getAllByText('Quote 20 % · Bundesland BY')).toHaveLength(2)
      expect(screen.getByText('2025-02')).toBeInTheDocument()
    })
  })

  it('keeps policy history and month evaluation metrics unchanged when personal settings change', async () => {
    const storage = createTestStorage()
    await storage.savePolicyHistory([
      { effectiveMonth: '1900-01', quota: 0.6, bundesland: 'BE' },
      { effectiveMonth: '2025-01', quota: 0.4, bundesland: 'BE' },
    ])
    await storage.saveDayEntry({ date: '2025-02-03', status: 'remote-work' })
    await storage.saveDayEntry({ date: '2025-02-04', status: 'office' })

    render(<App storage={storage} today="2025-02-01" />)

    const summaryPanel = await screen.findByRole('region', { name: 'Monatsstand' })
    const policyHistory = screen.getByRole('region', { name: 'Regelverlauf' })
    const monthsBefore = within(policyHistory)
      .getAllByRole('listitem')
      .map((item) => within(item).getByText(/\d{4}-\d{2}/).textContent)

    expectSummaryMetric(summaryPanel, 'Kontingent', '8')
    expectSummaryMetric(summaryPanel, 'Mobiles Arbeiten', '1 / 8')
    expectSummaryMetric(summaryPanel, 'Büro', '1')

    fireEvent.click(screen.getByLabelText('English'))
    expect(await screen.findByRole('region', { name: 'Policy History' })).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Dark'))
    fireEvent.change(screen.getByLabelText('Warning threshold'), {
      target: { value: '10' },
    })

    await waitFor(async () => {
      expect(screen.getByRole('region', { name: 'Policy History' })).toBeInTheDocument()
      expectSummaryMetric(screen.getByRole('region', { name: 'Monthly status' }), 'Allowance', '8')
      expectSummaryMetric(screen.getByRole('region', { name: 'Monthly status' }), 'Remote Work', '1 / 8')
      expectSummaryMetric(screen.getByRole('region', { name: 'Monthly status' }), 'Office', '1')

      const monthsAfter = within(screen.getByRole('region', { name: 'Policy History' }))
        .getAllByRole('listitem')
        .map((item) => within(item).getByText(/\d{4}-\d{2}/).textContent)

      expect(monthsAfter).toEqual(monthsBefore)
      await expect(storage.load()).resolves.toMatchObject({
        policyHistory: [
          { effectiveMonth: '1900-01', quota: 0.6, bundesland: 'BE' },
          { effectiveMonth: '2025-01', quota: 0.4, bundesland: 'BE' },
        ],
      })
    })
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

  it('keeps month navigation working when the first policy-history entry starts after the target month', async () => {
    const storage = createTestStorage()
    await storage.savePolicyHistory([{ effectiveMonth: '2026-01', quota: 0.4, bundesland: 'BE' }])

    render(<App storage={storage} today="2026-01-15" />)

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Januar 2026',
      }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Vorheriger Monat' }))

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Dezember 2025',
      }),
    ).toBeInTheDocument()

    const summaryPanel = await screen.findByRole('region', { name: 'Monatsstand' })
    expectSummaryMetric(summaryPanel, 'Kontingent', '8')
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
