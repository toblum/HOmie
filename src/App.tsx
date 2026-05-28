import { useEffect, useMemo, useRef } from 'react'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import './App.css'
import { classifyMonth } from './domain/calendarClassification'
import { evaluateMonth, type DayEntry, type DayEntryStatus } from './domain/monthEvaluation'
import { resolvePolicyForMonth, type PolicyHistoryEntry } from './domain/policyResolution'
import type { Bundesland, DayClassification, IsoDate } from './domain/types'
import {
  createBrowserStorage,
  type BrowserStorage,
  type BrowserStorageState,
} from './storage/browserStorage'

type ActiveStatus = DayEntryStatus | 'unset'

interface DetailDraft {
  date: IsoDate
  status: ActiveStatus
  note: string
}

interface AppStoreState {
  snapshot: BrowserStorageState | null
  loading: boolean
  error: string | null
  detailDraft: DetailDraft | null
  pendingDates: Partial<Record<IsoDate, boolean>>
  initialize: () => Promise<void>
  cycleDay: (date: IsoDate) => Promise<void>
  openDetail: (date: IsoDate) => void
  closeDetail: () => void
  setDetailStatus: (status: ActiveStatus) => void
  setDetailNote: (note: string) => void
  saveDetail: () => Promise<void>
}

interface DayCellModel {
  date: IsoDate
  dayNumber: number
  status: ActiveStatus
  statusLabel: string
  phaseLabel: 'Planung' | 'Buchung' | null
  note: string | null
  isInteractive: boolean
  classificationLabel: string
  cardClassName: string
}

interface MonthOverviewModel {
  monthLabel: string
  cells: DayCellModel[]
  evaluation: ReturnType<typeof evaluateMonth>
}

export interface AppProps {
  storage?: BrowserStorage
  today?: IsoDate
}

const STATUS_CYCLE: readonly ActiveStatus[] = ['unset', 'remote-work', 'office', 'vacation', 'sick']
const STATUS_LABELS: Record<ActiveStatus, string> = {
  unset: 'Leer',
  'remote-work': 'Mobiles Arbeiten',
  office: 'Büro',
  vacation: 'Urlaub',
  sick: 'Krank',
}
const NON_WORKING_LABELS: Record<Exclude<DayClassification['kind'], 'working-day' | 'overridden-working-day'>, string> =
  {
    weekend: 'Wochenende',
    'public-holiday': 'Feiertag',
    'excluded-day': 'Ausschlusstag',
  }
const DEFAULT_QUOTA = 0.6
const DEFAULT_BUNDESLAND: Bundesland = 'BE'

function currentIsoDate(): IsoDate {
  const now = new Date()
  return formatIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

function formatIsoDate(year: number, month: number, day: number): IsoDate {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function monthKey(date: IsoDate): PolicyHistoryEntry['effectiveMonth'] {
  return date.slice(0, 7) as PolicyHistoryEntry['effectiveMonth']
}

function defaultPolicyForToday(today: IsoDate): PolicyHistoryEntry {
  return {
    effectiveMonth: `${today.slice(0, 4)}-01` as PolicyHistoryEntry['effectiveMonth'],
    quota: DEFAULT_QUOTA,
    bundesland: DEFAULT_BUNDESLAND,
  }
}

function dayNumberFromIso(date: IsoDate): number {
  return Number(date.slice(-2))
}

function nextStatus(currentStatus: ActiveStatus): ActiveStatus {
  const currentIndex = STATUS_CYCLE.indexOf(currentStatus)
  return STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length] ?? 'unset'
}

function isInteractiveDay(classification: DayClassification): boolean {
  return classification.kind === 'working-day' || classification.kind === 'overridden-working-day'
}

function normalizeEntry(date: IsoDate, status: ActiveStatus, note: string): DayEntry | null {
  if (status === 'unset') {
    return null
  }

  const trimmedNote = note.trim()

  return {
    date,
    status,
    ...(trimmedNote === '' ? {} : { note: trimmedNote }),
  }
}

function replaceEntry(entries: DayEntry[], nextEntry: DayEntry | null, date: IsoDate): DayEntry[] {
  const remainingEntries = entries.filter((entry) => entry.date !== date)

  if (nextEntry === null) {
    return remainingEntries
  }

  return [...remainingEntries, nextEntry].sort((left, right) => left.date.localeCompare(right.date))
}

function persistEntry(storage: BrowserStorage, entry: DayEntry | null, date: IsoDate): Promise<void> {
  if (entry === null) {
    return storage.deleteDayEntry(date)
  }

  return storage.saveDayEntry(entry)
}

function classificationLabel(classification: DayClassification): string {
  if (classification.kind === 'overridden-working-day') {
    return 'Arbeitstag'
  }

  if (classification.kind === 'working-day') {
    return 'Arbeitstag'
  }

  return NON_WORKING_LABELS[classification.kind]
}

function cardClassName(classification: DayClassification, status: ActiveStatus): string {
  if (!isInteractiveDay(classification)) {
    return `day-card day-card--${classification.kind}`
  }

  return `day-card day-card--${status}`
}

function deriveMonthOverview(snapshot: BrowserStorageState, today: IsoDate): MonthOverviewModel {
  const activeMonth = monthKey(today)
  const year = Number(activeMonth.slice(0, 4))
  const month = Number(activeMonth.slice(5, 7))
  const policy = resolvePolicyForMonth({
    targetMonth: activeMonth,
    policyHistory: snapshot.policyHistory,
  })
  const classifications = classifyMonth({
    year,
    month,
    bundesland: policy.bundesland,
    ausschlusstage: snapshot.excludedDays,
    ueberschreibungen: [],
  })
  const entryByDate = new Map(snapshot.entries.map((entry) => [entry.date, entry]))
  const evaluation = evaluateMonth({
    year,
    month,
    classifications,
    entries: snapshot.entries,
    quota: policy.quota,
    today,
  })

  return {
    monthLabel: new Intl.DateTimeFormat('de-DE', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(year, month - 1, 1)),
    cells: classifications.map((classification) => {
      const entry = entryByDate.get(classification.date)
      const status = entry?.status ?? 'unset'

      return {
        date: classification.date,
        dayNumber: dayNumberFromIso(classification.date),
        status,
        statusLabel: STATUS_LABELS[status],
        phaseLabel: isInteractiveDay(classification)
          ? classification.date > today
            ? 'Planung'
            : 'Buchung'
          : null,
        note: entry?.note ?? null,
        isInteractive: isInteractiveDay(classification),
        classificationLabel: classificationLabel(classification),
        cardClassName: cardClassName(classification, status),
      }
    }),
    evaluation,
  }
}

function createAppStore(storage: BrowserStorage, today: IsoDate) {
  return createStore<AppStoreState>((set, get) => ({
    snapshot: null,
    loading: true,
    error: null,
    detailDraft: null,
    pendingDates: {},
    async initialize() {
      set({ loading: true, error: null })

      try {
        const loadedState = await storage.load()
        const policyHistory =
          loadedState.policyHistory.length > 0
            ? loadedState.policyHistory
            : [defaultPolicyForToday(today)]

        if (loadedState.policyHistory.length === 0) {
          await storage.savePolicyHistory(policyHistory)
        }

        set({
          snapshot: {
            ...loadedState,
            policyHistory,
          },
          loading: false,
          error: null,
        })
      } catch (error) {
        set({
          loading: false,
          error: error instanceof Error ? error.message : 'Monatsübersicht konnte nicht geladen werden.',
        })
      }
    },
    async cycleDay(date) {
      const state = get()

      if (state.snapshot === null || state.pendingDates[date] === true) {
        return
      }

      const currentEntry = state.snapshot.entries.find((entry) => entry.date === date)
      const currentStatus = currentEntry?.status ?? 'unset'
      const updatedEntry = normalizeEntry(date, nextStatus(currentStatus), currentEntry?.note ?? '')
      const nextSnapshot = {
        ...state.snapshot,
        entries: replaceEntry(state.snapshot.entries, updatedEntry, date),
      }

      set({
        snapshot: nextSnapshot,
        error: null,
        pendingDates: {
          ...state.pendingDates,
          [date]: true,
        },
      })

      try {
        await persistEntry(storage, updatedEntry, date)
      } catch (error) {
        set({
          snapshot: state.snapshot,
          error: error instanceof Error ? error.message : 'Änderung konnte nicht gespeichert werden.',
          pendingDates: {
            ...get().pendingDates,
            [date]: false,
          },
        })
        return
      }

      set({
        pendingDates: {
          ...get().pendingDates,
          [date]: false,
        },
      })
    },
    openDetail(date) {
      const snapshot = get().snapshot

      if (snapshot === null) {
        return
      }

      const entry = snapshot.entries.find((item) => item.date === date)

      set({
        detailDraft: {
          date,
          status: entry?.status ?? 'unset',
          note: entry?.note ?? '',
        },
      })
    },
    closeDetail() {
      set({ detailDraft: null })
    },
    setDetailStatus(status) {
      const detailDraft = get().detailDraft

      if (detailDraft === null) {
        return
      }

      set({
        detailDraft: {
          ...detailDraft,
          status,
          note: status === 'unset' ? '' : detailDraft.note,
        },
      })
    },
    setDetailNote(note) {
      const detailDraft = get().detailDraft

      if (detailDraft === null) {
        return
      }

      set({
        detailDraft: {
          ...detailDraft,
          note,
        },
      })
    },
    async saveDetail() {
      const state = get()

      if (
        state.snapshot === null ||
        state.detailDraft === null ||
        state.pendingDates[state.detailDraft.date] === true
      ) {
        return
      }

      const previousSnapshot = state.snapshot
      const nextEntry = normalizeEntry(
        state.detailDraft.date,
        state.detailDraft.status,
        state.detailDraft.note,
      )
      const nextSnapshot = {
        ...state.snapshot,
        entries: replaceEntry(state.snapshot.entries, nextEntry, state.detailDraft.date),
      }

      set({
        snapshot: nextSnapshot,
        detailDraft: null,
        error: null,
        pendingDates: {
          ...state.pendingDates,
          [state.detailDraft.date]: true,
        },
      })

      try {
        await persistEntry(storage, nextEntry, state.detailDraft.date)
      } catch (error) {
        set({
          snapshot: previousSnapshot,
          error: error instanceof Error ? error.message : 'Details konnten nicht gespeichert werden.',
          pendingDates: {
            ...get().pendingDates,
            [state.detailDraft.date]: false,
          },
        })
        return
      }

      set({
        pendingDates: {
          ...get().pendingDates,
          [state.detailDraft.date]: false,
        },
      })
    },
  }))
}

function DetailDialog(props: {
  draft: DetailDraft
  restoreFocus: () => void
  onStatusChange: (status: ActiveStatus) => void
  onNoteChange: (note: string) => void
  onClose: () => void
  onSave: () => void
}) {
  const { draft, restoreFocus, onStatusChange, onNoteChange, onClose, onSave } = props
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const dialogElement = dialogRef.current

    if (dialogElement === null) {
      return
    }

    const focusableElements = dialogElement.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )

    focusableElements[0]?.focus()

    return () => {
      restoreFocus()
    }
  }, [restoreFocus])

  return (
    <div className="dialog-backdrop">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`detail-title-${draft.date}`}
        className="detail-dialog"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onClose()
            return
          }

          if (event.key !== 'Tab' || dialogRef.current === null) {
            return
          }

          const focusableElements = [...dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
          )]

          if (focusableElements.length === 0) {
            event.preventDefault()
            dialogRef.current.focus()
            return
          }

          const firstElement = focusableElements[0]
          const lastElement = focusableElements.at(-1)

          if (firstElement === undefined || lastElement === undefined) {
            return
          }

          if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault()
            lastElement.focus()
          }

          if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault()
            firstElement.focus()
          }
        }}
      >
        <h2 id={`detail-title-${draft.date}`}>Details für {draft.date}</h2>

        <fieldset className="detail-fieldset">
          <legend>Aktiver Status</legend>

          {STATUS_CYCLE.map((status) => (
            <label key={status} className="detail-option">
              <input
                type="radio"
                name="detail-status"
                checked={draft.status === status}
                onChange={() => onStatusChange(status)}
              />
              <span>{STATUS_LABELS[status]}</span>
            </label>
          ))}
        </fieldset>

        <label className="detail-note">
          <span>Notiz</span>
          <textarea
            value={draft.note}
            disabled={draft.status === 'unset'}
            onChange={(event) => onNoteChange(event.target.value)}
          />
        </label>

        <div className="detail-actions">
          <button type="button" className="secondary-action" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="primary-action" onClick={onSave}>
            Speichern
          </button>
        </div>
      </div>
    </div>
  )
}

function App({ storage: storageProp, today: todayProp }: AppProps) {
  const storage = useMemo(() => storageProp ?? createBrowserStorage(), [storageProp])
  const today = useMemo(() => todayProp ?? currentIsoDate(), [todayProp])
  const store = useMemo(() => createAppStore(storage, today), [storage, today])
  const loading = useStore(store, (state) => state.loading)
  const error = useStore(store, (state) => state.error)
  const snapshot = useStore(store, (state) => state.snapshot)
  const detailDraft = useStore(store, (state) => state.detailDraft)
  const pendingDates = useStore(store, (state) => state.pendingDates)
  const cycleDay = useStore(store, (state) => state.cycleDay)
  const openDetail = useStore(store, (state) => state.openDetail)
  const closeDetail = useStore(store, (state) => state.closeDetail)
  const setDetailStatus = useStore(store, (state) => state.setDetailStatus)
  const setDetailNote = useStore(store, (state) => state.setDetailNote)
  const saveDetail = useStore(store, (state) => state.saveDetail)
  const detailButtonRefs = useRef<Partial<Record<IsoDate, HTMLButtonElement | null>>>({})

  useEffect(() => {
    void store.getState().initialize()
  }, [store])

  const overview = useMemo(
    () => (snapshot === null ? null : deriveMonthOverview(snapshot, today)),
    [snapshot, today],
  )

  if (loading || overview === null) {
    return (
      <main className="app-shell">
        <section className="hero">
          <p className="eyebrow">HOmie</p>
          <h1>Monatsübersicht</h1>
          <p className="lead">Die Monatsübersicht wird geladen.</p>
        </section>
      </main>
    )
  }

  return (
    <>
      <main className="app-shell">
        <section className="hero hero--compact">
          <p className="eyebrow">Primäre Arbeitsfläche</p>
          <h1>Monatsübersicht</h1>
          <p className="lead">
            {overview.monthLabel} · {overview.cells.length} Kalendertage ·{' '}
            {overview.evaluation.workingDays} Arbeitstage
          </p>
        </section>

        {error === null ? null : (
          <p role="alert" className="error-banner">
            {error}
          </p>
        )}

        <ol className="calendar-grid" aria-label="Kalender">
          {overview.cells.map((cell) => (
            <li key={cell.date} className={cell.cardClassName}>
              <p className="calendar-date">{cell.date}</p>
              <p className="calendar-number">{cell.dayNumber}</p>
              <p className="calendar-classification">{cell.classificationLabel}</p>

              {cell.isInteractive ? (
                <div className="day-actions">
                    <button
                      type="button"
                      className="day-primary-action"
                      aria-label={`Tag ${cell.date}`}
                      disabled={pendingDates[cell.date] === true}
                      onClick={() => void cycleDay(cell.date)}
                    >
                    <span className="day-phase">{cell.phaseLabel}</span>
                    <span className="day-status">{cell.statusLabel}</span>
                    {cell.note === null ? null : <span className="day-note">{cell.note}</span>}
                  </button>

                    <button
                      type="button"
                      className="day-secondary-action"
                      aria-label={`Details für ${cell.date}`}
                      disabled={pendingDates[cell.date] === true}
                      ref={(element) => {
                        detailButtonRefs.current[cell.date] = element
                      }}
                      onClick={() => openDetail(cell.date)}
                    >
                    Details
                  </button>
                </div>
              ) : (
                <div className="non-working-copy">
                  <span className="day-status">Nicht-Arbeitstag</span>
                  {cell.note === null ? null : <span className="day-note">{cell.note}</span>}
                </div>
              )}
            </li>
          ))}
        </ol>
      </main>

      {detailDraft === null ? null : (
        <DetailDialog
          draft={detailDraft}
          restoreFocus={() => {
            detailButtonRefs.current[detailDraft.date]?.focus()
          }}
          onStatusChange={setDetailStatus}
          onNoteChange={setDetailNote}
          onClose={closeDetail}
          onSave={() => void saveDetail()}
        />
      )}
    </>
  )
}

export default App
