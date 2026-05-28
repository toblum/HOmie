import { useEffect } from 'react'
import { create } from 'zustand'
import './App.css'
import { classifyMonth } from './domain/calendarClassification'
import {
  evaluateMonth,
  type DayEntry,
  type DayEntryStatus,
  type MonthEvaluation,
} from './domain/monthEvaluation'
import {
  resolvePolicyForMonth,
  type EffectiveMonth,
  type PolicyHistoryEntry,
} from './domain/policyResolution'
import type { DayClassification, IsoDate } from './domain/types'
import {
  createBrowserStorage,
  type BrowserStorage,
  type BrowserStorageState,
} from './storage/browserStorage'

const DEFAULT_TODAY = toIsoDate(new Date())
const MONTH_FORMATTER = new Intl.DateTimeFormat('de-DE', {
  month: 'long',
  year: 'numeric',
})
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('de-DE', { weekday: 'long' })
const SHORT_WEEKDAY_FORMATTER = new Intl.DateTimeFormat('de-DE', { weekday: 'short' })
const WEEKDAY_HEADERS = [1, 2, 3, 4, 5, 6, 0].map((weekday) => {
  const referenceDate = new Date(Date.UTC(2026, 0, 4 + weekday))
  return SHORT_WEEKDAY_FORMATTER.format(referenceDate).replace('.', '')
})
const STATUS_SEQUENCE: Array<DayEntryStatus | 'unset'> = [
  'unset',
  'remote-work',
  'office',
  'vacation',
  'sick',
]
const STATUS_LABELS: Record<DayEntryStatus | 'unset', string> = {
  unset: 'Leer',
  'remote-work': 'Mobiles Arbeiten',
  office: 'Buro',
  vacation: 'Urlaub',
  sick: 'Krank',
}
const DAY_KIND_LABELS: Record<DayClassification['kind'], string> = {
  'working-day': 'Arbeitstag',
  'overridden-working-day': 'Arbeitstag',
  weekend: 'Wochenende',
  'public-holiday': 'Feiertag',
  'excluded-day': 'Ausschlusstag',
}
const MONTH_STATUS_LABELS: Record<MonthEvaluation['status'], string> = {
  normal: 'Normal',
  warning: 'Warnung',
  'over-limit': 'Uber Limit',
  'not-applicable': 'Nicht anwendbar',
}
const DEFAULT_POLICY_ENTRY: PolicyHistoryEntry = {
  effectiveMonth: '1900-01',
  quota: 0.6,
  bundesland: 'BE',
}
const DEFAULT_STORAGE = createBrowserStorage()

interface CalendarDayViewModel {
  classification: DayClassification
  entry?: DayEntry
  isInteractive: boolean
  temporalLabel: 'Planung' | 'Buchung'
  statusLabel: string
  tone: 'empty' | 'remote-work' | 'office' | 'vacation' | 'sick' | 'non-working'
}

interface CalendarMonthViewModel {
  heading: string
  leadingBlankCount: number
  weekdayHeaders: string[]
  days: CalendarDayViewModel[]
  policy: PolicyHistoryEntry
  evaluation: MonthEvaluation
}

interface HomieAppState {
  storage: BrowserStorage
  today: IsoDate
  selectedMonth: EffectiveMonth
  snapshot: BrowserStorageState | null
  isLoading: boolean
  error: string | null
  detailDate: IsoDate | null
  detailStatus: DayEntryStatus | 'unset'
  detailNote: string
  initialize: (input: { storage: BrowserStorage; today: IsoDate }) => Promise<void>
  cycleDayStatus: (date: IsoDate) => Promise<void>
  openDetailView: (date: IsoDate) => void
  closeDetailView: () => void
  setDetailStatus: (status: DayEntryStatus | 'unset') => void
  setDetailNote: (note: string) => void
  saveDetailEntry: () => Promise<void>
}

interface AppProps {
  storage?: BrowserStorage
  today?: IsoDate
}

const useHomieStore = create<HomieAppState>((set, get) => ({
  storage: createBrowserStorage(),
  today: DEFAULT_TODAY,
  selectedMonth: toMonthKey(DEFAULT_TODAY),
  snapshot: null,
  isLoading: true,
  error: null,
  detailDate: null,
  detailStatus: 'unset',
  detailNote: '',
  async initialize({ storage, today }) {
    set({
      storage,
      today,
      selectedMonth: toMonthKey(today),
      isLoading: true,
      error: null,
      detailDate: null,
      detailStatus: 'unset',
      detailNote: '',
    })

    try {
      const loadedState = await storage.load()
      const snapshot = await ensurePolicyHistory(storage, loadedState)

      set({
        storage,
        today,
        selectedMonth: toMonthKey(today),
        snapshot,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      set({
        snapshot: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Monatsubersicht konnte nicht geladen werden',
      })
    }
  },
  async cycleDayStatus(date) {
    const { snapshot, storage } = get()

    if (!snapshot) {
      return
    }

    const currentEntry = snapshot.entries.find((entry) => entry.date === date)
    const nextStatus = getNextStatus(currentEntry?.status)
    const remainingEntries = snapshot.entries.filter((entry) => entry.date !== date)

    if (nextStatus === 'unset') {
      await storage.deleteDayEntry(date)
      set({
        snapshot: {
          ...snapshot,
          entries: remainingEntries,
        },
      })
      return
    }

    const nextEntry: DayEntry = {
      date,
      status: nextStatus,
      ...(currentEntry?.note ? { note: currentEntry.note } : {}),
    }

    await storage.saveDayEntry(nextEntry)

    set({
      snapshot: {
        ...snapshot,
        entries: [...remainingEntries, nextEntry].sort((left, right) =>
          left.date.localeCompare(right.date),
        ),
      },
    })
  },
  openDetailView(date) {
    const { snapshot } = get()

    if (!snapshot) {
      return
    }

    const existingEntry = snapshot.entries.find((entry) => entry.date === date)

    set({
      detailDate: date,
      detailStatus: existingEntry?.status ?? 'unset',
      detailNote: existingEntry?.note ?? '',
    })
  },
  closeDetailView() {
    set({
      detailDate: null,
      detailStatus: 'unset',
      detailNote: '',
    })
  },
  setDetailStatus(status) {
    set({ detailStatus: status })
  },
  setDetailNote(note) {
    set({ detailNote: note })
  },
  async saveDetailEntry() {
    const { snapshot, storage, detailDate, detailStatus, detailNote } = get()

    if (!snapshot || !detailDate) {
      return
    }

    const remainingEntries = snapshot.entries.filter((entry) => entry.date !== detailDate)
    const normalizedNote = detailNote.trim()

    if (detailStatus === 'unset') {
      await storage.deleteDayEntry(detailDate)
      set({
        snapshot: {
          ...snapshot,
          entries: remainingEntries,
        },
        detailDate: null,
        detailStatus: 'unset',
        detailNote: '',
      })
      return
    }

    const nextEntry: DayEntry = {
      date: detailDate,
      status: detailStatus,
      ...(normalizedNote ? { note: normalizedNote } : {}),
    }

    await storage.saveDayEntry(nextEntry)
    set({
      snapshot: {
        ...snapshot,
        entries: [...remainingEntries, nextEntry].sort((left, right) =>
          left.date.localeCompare(right.date),
        ),
      },
      detailDate: null,
      detailStatus: 'unset',
      detailNote: '',
    })
  },
}))

function toIsoDate(date: Date): IsoDate {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toMonthKey(date: IsoDate): EffectiveMonth {
  return date.slice(0, 7) as EffectiveMonth
}

function parseMonthKey(monthKey: EffectiveMonth) {
  const [yearText, monthText] = monthKey.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  return { year, month }
}

function getFirstWeekdayOffset(monthKey: EffectiveMonth): number {
  const { year, month } = parseMonthKey(monthKey)
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  return (firstWeekday + 6) % 7
}

function getNextStatus(currentStatus?: DayEntryStatus): DayEntryStatus | 'unset' {
  const currentIndex = STATUS_SEQUENCE.indexOf(currentStatus ?? 'unset')
  return STATUS_SEQUENCE[(currentIndex + 1) % STATUS_SEQUENCE.length] ?? 'unset'
}

async function ensurePolicyHistory(
  storage: BrowserStorage,
  state: BrowserStorageState,
): Promise<BrowserStorageState> {
  if (state.policyHistory.length > 0) {
    return state
  }

  await storage.savePolicyHistory([DEFAULT_POLICY_ENTRY])

  return {
    ...state,
    policyHistory: [DEFAULT_POLICY_ENTRY],
  }
}

function buildCalendarMonthViewModel(
  monthKey: EffectiveMonth,
  today: IsoDate,
  snapshot: BrowserStorageState,
): CalendarMonthViewModel {
  const { year, month } = parseMonthKey(monthKey)
  const policy = resolvePolicyForMonth({
    targetMonth: monthKey,
    policyHistory: snapshot.policyHistory,
  })
  const classifications = classifyMonth({
    year,
    month,
    bundesland: policy.bundesland,
    ausschlusstage: snapshot.excludedDays,
    ueberschreibungen: [],
  })
  const evaluation = evaluateMonth({
    year,
    month,
    classifications,
    entries: snapshot.entries,
    quota: policy.quota,
    today,
  })
  const entryByDate = new Map(snapshot.entries.map((entry) => [entry.date, entry]))

  return {
    heading: capitalizeMonthHeading(MONTH_FORMATTER.format(new Date(year, month - 1, 1))),
    leadingBlankCount: getFirstWeekdayOffset(monthKey),
    weekdayHeaders: WEEKDAY_HEADERS,
    policy,
    evaluation,
    days: classifications.map((classification) => {
      const entry = entryByDate.get(classification.date)
      const isInteractive =
        classification.kind === 'working-day' || classification.kind === 'overridden-working-day'

      return {
        classification,
        isInteractive,
        temporalLabel: classification.date <= today ? 'Buchung' : 'Planung',
        statusLabel: STATUS_LABELS[entry?.status ?? 'unset'],
        tone: getDayTone(classification, entry),
        ...(entry ? { entry } : {}),
      }
    }),
  }
}

function capitalizeMonthHeading(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function getDayTone(
  classification: DayClassification,
  entry?: DayEntry,
): CalendarDayViewModel['tone'] {
  if (classification.kind === 'weekend' || classification.kind === 'public-holiday' || classification.kind === 'excluded-day') {
    return 'non-working'
  }

  return entry?.status ?? 'empty'
}

function formatWeekday(date: IsoDate): string {
  return capitalizeMonthHeading(WEEKDAY_FORMATTER.format(new Date(`${date}T12:00:00`)))
}

function formatFullDate(date: IsoDate): string {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00`))
}

function getDayNumber(date: IsoDate): string {
  return date.slice(8, 10)
}

function App({ storage = DEFAULT_STORAGE, today = DEFAULT_TODAY }: AppProps) {
  const {
    initialize,
    cycleDayStatus,
    openDetailView,
    closeDetailView,
    setDetailStatus,
    setDetailNote,
    saveDetailEntry,
    selectedMonth,
    snapshot,
    isLoading,
    error,
    detailDate,
    detailStatus,
    detailNote,
  } = useHomieStore()

  useEffect(() => {
    void initialize({ storage, today })
  }, [initialize, storage, today])

  if (isLoading || !snapshot) {
    return (
      <main className="app-shell loading-state">
        <p className="eyebrow">Monatsubersicht</p>
        <h1>HOmie wird geladen</h1>
      </main>
    )
  }

  if (error) {
    return (
      <main className="app-shell loading-state">
        <p className="eyebrow">Monatsubersicht</p>
        <h1>Speicherfehler</h1>
        <p className="lead">{error}</p>
      </main>
    )
  }

  const calendar = buildCalendarMonthViewModel(selectedMonth, today, snapshot)

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Monatsubersicht</p>
          <h1>{calendar.heading}</h1>
          <p className="lead">
            Primare Arbeitsflache fur Planung und Buchung mit sofortiger Speicherung in
            IndexedDB.
          </p>
        </div>

        <div className="hero-aside">
          <div className={`status-pill status-${calendar.evaluation.status}`}>
            Monatsstand {MONTH_STATUS_LABELS[calendar.evaluation.status]}
          </div>
          <p className="policy-chip">
            Quote {Math.round(calendar.policy.quota * 100)} % · Bundesland {calendar.policy.bundesland}
          </p>
        </div>
      </section>

      <section className="calendar-panel" aria-label="Monatsansicht">
        <div className="calendar-weekdays" aria-hidden="true">
          {calendar.weekdayHeaders.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>

        <div className="calendar-grid" role="grid" aria-label="Monatsübersicht">
          {Array.from({ length: calendar.leadingBlankCount }, (_, index) => (
            <div key={`blank-${index}`} className="calendar-blank" aria-hidden="true" />
          ))}

          {calendar.days.map((day) => (
            <article
              key={day.classification.date}
              role="gridcell"
              aria-label={`${Number(getDayNumber(day.classification.date))} ${formatWeekday(day.classification.date)}`}
              className={`day-card tone-${day.tone} kind-${day.classification.kind}`}
            >
              {day.isInteractive ? (
                <button
                  type="button"
                  className="day-button"
                  onClick={() => {
                    void cycleDayStatus(day.classification.date)
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    openDetailView(day.classification.date)
                  }}
                >
                  <span className="day-topline">
                    <span className="day-number">{getDayNumber(day.classification.date)}</span>
                    <span className="day-weekday">{formatWeekday(day.classification.date)}</span>
                  </span>
                  <span className="day-phase">{day.temporalLabel}</span>
                  <strong className="day-status">{day.statusLabel}</strong>
                  {day.entry?.note ? <span className="day-note">{day.entry.note}</span> : null}
                </button>
              ) : (
                <div className="day-static">
                  <span className="day-topline">
                    <span className="day-number">{getDayNumber(day.classification.date)}</span>
                    <span className="day-weekday">{formatWeekday(day.classification.date)}</span>
                  </span>
                  <span className="day-phase">{day.temporalLabel}</span>
                  <strong className="day-status">{DAY_KIND_LABELS[day.classification.kind]}</strong>
                  {day.classification.holidayName ? (
                    <span className="day-note">{day.classification.holidayName}</span>
                  ) : null}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {detailDate ? (
        <div className="dialog-backdrop">
          <section
            className="detail-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Tag bearbeiten"
          >
            <div className="detail-dialog-head">
              <p className="eyebrow">Detailansicht</p>
              <h2>Tag bearbeiten</h2>
              <p className="lead dialog-date">{capitalizeMonthHeading(formatFullDate(detailDate))}</p>
            </div>

            <fieldset className="detail-status-list">
              <legend>Status</legend>
              {STATUS_SEQUENCE.map((status) => (
                <label key={status} className="detail-status-option">
                  <input
                    type="radio"
                    name="detail-status"
                    checked={detailStatus === status}
                    onChange={() => {
                      setDetailStatus(status)
                    }}
                  />
                  <span>{STATUS_LABELS[status]}</span>
                </label>
              ))}
            </fieldset>

            <label className="detail-note-field">
              <span>Notiz</span>
              <textarea
                aria-label="Notiz"
                rows={4}
                value={detailNote}
                onChange={(event) => {
                  setDetailNote(event.target.value)
                }}
              />
            </label>

            <div className="detail-actions">
              <button type="button" className="ghost-button" onClick={closeDetailView}>
                Abbrechen
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  void saveDetailEntry()
                }}
              >
                Speichern
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  )
}

export default App
