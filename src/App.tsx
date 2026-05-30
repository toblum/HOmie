import { useEffect, useState, type ChangeEvent } from 'react'
import { create } from 'zustand'
import './App.css'
import { classifyMonth } from './domain/calendarClassification'
import {
  evaluateMonth,
  type DayEntry,
  type DayEntryStatus,
  type MonthEvaluation,
} from './domain/monthEvaluation'
import { classifyMonthStatus, type MonthStatus } from './domain/monthStatus'
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
  type PersonalPreferences,
} from './storage/browserStorage'

const DEFAULT_TODAY = toIsoDate(new Date())
const STATUS_SEQUENCE: Array<DayEntryStatus | 'unset'> = [
  'unset',
  'remote-work',
  'office',
  'vacation',
  'sick',
]
const DEFAULT_POLICY_ENTRY: PolicyHistoryEntry = {
  effectiveMonth: '1900-01',
  quota: 0.6,
  bundesland: 'BE',
}
const BUNDESLAND_OPTIONS: Array<PolicyHistoryEntry['bundesland']> = [
  'BB',
  'BE',
  'BW',
  'BY',
  'HB',
  'HE',
  'HH',
  'MV',
  'NI',
  'NW',
  'RP',
  'SH',
  'SL',
  'SN',
  'ST',
  'TH',
]
const LOCALE_BY_LANGUAGE: Record<PersonalPreferences['language'], string> = {
  de: 'de-DE',
  en: 'en-US',
}

type TranslationDictionary = {
  monthOverview: string
  yearOverview: string
  loadingHeading: string
  storageError: string
  monthLead: string
  yearLead: string
  previousMonth: string
  nextMonth: string
  previousYear: string
  nextYear: string
  previousMonthButton: string
  nextMonthButton: string
  previousYearButton: string
  nextYearButton: string
  monthlyStatus: string
  openYearOverview: string
  openMonthOverview: string
  yearCardsCount: string
  policyPerMonth: string
  evaluation: string
  workingDays: string
  quota: string
  federalState: string
  allowance: string
  remoteWork: string
  office: string
  absence: string
  openWorkingDays: string
  usage: string
  usageSummary: (input: { remoteWorkDays: number; allowance: number }) => string
  monthView: string
  monthGrid: string
  monthlyReport: string
  printReport: string
  personalSettings: string
  policyHistory: string
  settings: string
  dateColumn: string
  dayKindColumn: string
  language: string
  theme: string
  german: string
  english: string
  themeLight: string
  themeDark: string
  themeSystem: string
  warningThreshold: string
  localBackup: string
  localBackupLead: string
  exportCsv: string
  exportJson: string
  restoreJson: string
  restoreWarning: string
  restoreInvalidJson: string
  restoreFailed: string
  restoreSucceeded: string
  effectiveMonth: string
  booking: string
  planning: string
  detailView: string
  editDay: string
  status: string
  note: string
  cancel: string
  save: string
  addEntry: string
  openMonth: (heading: string) => string
}

const TRANSLATIONS: Record<PersonalPreferences['language'], TranslationDictionary> = {
  de: {
    monthOverview: 'Monatsübersicht',
    yearOverview: 'Jahresübersicht',
    loadingHeading: 'HOmie wird geladen',
    storageError: 'Speicherfehler',
    monthLead: 'Primäre Arbeitsfläche für Planung und Buchung mit sofortiger Speicherung in IndexedDB.',
    yearLead: 'Jahresweite Auswertung mit einem Monatsstand pro Karte und direktem Sprung zurück in die Monatsübersicht.',
    previousMonth: 'Vorheriger Monat',
    nextMonth: 'Nächster Monat',
    previousYear: 'Vorheriges Jahr',
    nextYear: 'Nächstes Jahr',
    previousMonthButton: 'Zurück',
    nextMonthButton: 'Weiter',
    previousYearButton: 'Vorjahr',
    nextYearButton: 'Folgejahr',
    monthlyStatus: 'Monatsstand',
    openYearOverview: 'Jahresübersicht öffnen',
    openMonthOverview: 'Monatsübersicht öffnen',
    yearCardsCount: '12 Monatskarten',
    policyPerMonth: 'Regelverlauf wird pro Monat separat aufgelöst.',
    evaluation: 'Auswertung',
    workingDays: 'Arbeitstage',
    quota: 'Quote',
    federalState: 'Bundesland',
    allowance: 'Kontingent',
    remoteWork: 'Mobiles Arbeiten',
    office: 'Büro',
    absence: 'Abwesenheit',
    openWorkingDays: 'Offene Arbeitstage',
    usage: 'Verbrauch',
    usageSummary: ({ remoteWorkDays, allowance }) =>
      `${remoteWorkDays} von ${allowance} möglichen Mobiles-Arbeiten-Tagen genutzt.`,
    monthView: 'Monatsansicht',
    monthGrid: 'Monatsübersicht',
    monthlyReport: 'Monatsbericht',
    printReport: 'Bericht drucken',
    personalSettings: 'Persönliche Einstellungen',
    policyHistory: 'Regelverlauf',
    settings: 'Einstellungen',
    dateColumn: 'Datum',
    dayKindColumn: 'Tagart',
    language: 'Sprache',
    theme: 'Thema',
    german: 'Deutsch',
    english: 'English',
    themeLight: 'Hell',
    themeDark: 'Dunkel',
    themeSystem: 'System',
    warningThreshold: 'Warnschwelle',
    localBackup: 'Datensicherung',
    localBackupLead: 'Export und Restore des kompletten lokalen Zustands als JSON-Datei.',
    exportCsv: 'CSV exportieren',
    exportJson: 'JSON exportieren',
    restoreJson: 'JSON wiederherstellen',
    restoreWarning: 'Der aktuelle lokale Datenbestand wird vollständig ersetzt. Fortfahren?',
    restoreInvalidJson: 'JSON-Datei ist ungültig.',
    restoreFailed: 'JSON-Wiederherstellung fehlgeschlagen.',
    restoreSucceeded: 'JSON erfolgreich wiederhergestellt.',
    effectiveMonth: 'Wirksamkeitsmonat',
    booking: 'Buchung',
    planning: 'Planung',
    detailView: 'Detailansicht',
    editDay: 'Tag bearbeiten',
    status: 'Status',
    note: 'Notiz',
    cancel: 'Abbrechen',
    save: 'Speichern',
    addEntry: 'Eintrag hinzufügen',
    openMonth: (heading) => `${heading} öffnen`,
  },
  en: {
    monthOverview: 'Monthly Overview',
    yearOverview: 'Yearly Overview',
    loadingHeading: 'HOmie is loading',
    storageError: 'Storage error',
    monthLead: 'Primary workspace for planning and booking with immediate persistence to IndexedDB.',
    yearLead: 'Year-wide evaluation with one monthly status per card and a direct jump back into the monthly overview.',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    previousYear: 'Previous year',
    nextYear: 'Next year',
    previousMonthButton: 'Back',
    nextMonthButton: 'Next',
    previousYearButton: 'Previous year',
    nextYearButton: 'Next year',
    monthlyStatus: 'Monthly status',
    openYearOverview: 'Open yearly overview',
    openMonthOverview: 'Open monthly overview',
    yearCardsCount: '12 month cards',
    policyPerMonth: 'Policy history resolves independently for each month.',
    evaluation: 'Evaluation',
    workingDays: 'Working days',
    quota: 'Quota',
    federalState: 'Federal state',
    allowance: 'Allowance',
    remoteWork: 'Remote Work',
    office: 'Office',
    absence: 'Absence',
    openWorkingDays: 'Open working days',
    usage: 'Usage',
    usageSummary: ({ remoteWorkDays, allowance }) =>
      `${remoteWorkDays} of ${allowance} available remote-work days used.`,
    monthView: 'Month view',
    monthGrid: 'Monthly overview',
    monthlyReport: 'Monthly report',
    printReport: 'Print report',
    personalSettings: 'Personal Settings',
    policyHistory: 'Policy History',
    settings: 'Settings',
    dateColumn: 'Date',
    dayKindColumn: 'Day kind',
    language: 'Language',
    theme: 'Theme',
    german: 'Deutsch',
    english: 'English',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    warningThreshold: 'Warning threshold',
    localBackup: 'Data backup',
    localBackupLead: 'Export and restore the complete local state as a JSON file.',
    exportCsv: 'Export CSV',
    exportJson: 'Export JSON',
    restoreJson: 'Restore JSON',
    restoreWarning: 'This replaces the entire current local dataset. Continue?',
    restoreInvalidJson: 'JSON file is invalid.',
    restoreFailed: 'JSON restore failed.',
    restoreSucceeded: 'JSON restored successfully.',
    effectiveMonth: 'Effective month',
    booking: 'Booking',
    planning: 'Plan',
    detailView: 'Detail view',
    editDay: 'Edit day',
    status: 'Status',
    note: 'Note',
    cancel: 'Cancel',
    save: 'Save',
    addEntry: 'Add entry',
    openMonth: (heading) => `Open ${heading}`,
  },
}

const STATUS_LABELS: Record<
  PersonalPreferences['language'],
  Record<DayEntryStatus | 'unset', string>
> = {
  de: {
    unset: 'Leer',
    'remote-work': 'Mobiles Arbeiten',
    office: 'Büro',
    vacation: 'Urlaub',
    sick: 'Krank',
  },
  en: {
    unset: 'Unset',
    'remote-work': 'Remote Work',
    office: 'Office',
    vacation: 'Vacation',
    sick: 'Sick',
  },
}

const DAY_KIND_LABELS: Record<PersonalPreferences['language'], Record<DayClassification['kind'], string>> = {
  de: {
    'working-day': 'Arbeitstag',
    'overridden-working-day': 'Arbeitstag',
    weekend: 'Wochenende',
    'public-holiday': 'Feiertag',
    'excluded-day': 'Ausschlusstag',
  },
  en: {
    'working-day': 'Working day',
    'overridden-working-day': 'Working day',
    weekend: 'Weekend',
    'public-holiday': 'Public holiday',
    'excluded-day': 'Excluded day',
  },
}

const MONTH_STATUS_LABELS: Record<PersonalPreferences['language'], Record<MonthStatus, string>> = {
  de: {
    normal: 'Normal',
    warning: 'Warnung',
    'over-limit': 'Über Limit',
    'not-applicable': 'Nicht anwendbar',
  },
  en: {
    normal: 'Normal',
    warning: 'Warning',
    'over-limit': 'Over limit',
    'not-applicable': 'Not applicable',
  },
}
const DEFAULT_STORAGE = createBrowserStorage()

interface CalendarDayViewModel {
  classification: DayClassification
  entry?: DayEntry
  isInteractive: boolean
  temporalLabel: string
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

type ViewMode = 'month' | 'year'

interface YearMonthCardViewModel {
  monthKey: EffectiveMonth
  heading: string
  policy: PolicyHistoryEntry
  evaluation: MonthEvaluation
  monthStatus: MonthStatus
}

interface YearOverviewViewModel {
  year: number
  cards: YearMonthCardViewModel[]
}

interface HomieAppState {
  storage: BrowserStorage
  today: IsoDate
  selectedMonth: EffectiveMonth
  selectedYear: number
  viewMode: ViewMode
  snapshot: BrowserStorageState | null
  isLoading: boolean
  error: string | null
  detailDate: IsoDate | null
  detailStatus: DayEntryStatus | 'unset'
  detailNote: string
  initialize: (input: { storage: BrowserStorage; today: IsoDate }) => Promise<void>
  updatePreferences: (preferences: Partial<PersonalPreferences>) => Promise<void>
  addPolicyHistoryEntry: (entry: PolicyHistoryEntry) => Promise<void>
  restoreSnapshot: (state: BrowserStorageState) => Promise<void>
  navigateMonth: (offset: number) => void
  navigateYear: (offset: number) => void
  openYearOverview: () => void
  openMonthOverview: () => void
  selectMonth: (monthKey: EffectiveMonth) => void
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
  selectedYear: Number(toMonthKey(DEFAULT_TODAY).slice(0, 4)),
  viewMode: 'month',
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
      selectedYear: Number(toMonthKey(today).slice(0, 4)),
      viewMode: 'month',
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
        selectedYear: Number(toMonthKey(today).slice(0, 4)),
        viewMode: 'month',
        snapshot,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      set({
        snapshot: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Monatsübersicht konnte nicht geladen werden',
      })
    }
  },
  async updatePreferences(preferences) {
    const { snapshot, storage } = get()

    if (!snapshot) {
      return
    }

    const nextPreferences = {
      ...snapshot.preferences,
      ...preferences,
    }

    await storage.savePreferences(nextPreferences)

    set({
      snapshot: {
        ...snapshot,
        preferences: nextPreferences,
      },
    })
  },
  async addPolicyHistoryEntry(entry) {
    const { snapshot, storage } = get()

    if (!snapshot) {
      return
    }

    const latestEntry = snapshot.policyHistory[snapshot.policyHistory.length - 1] ?? DEFAULT_POLICY_ENTRY
    const minimumEffectiveMonth = shiftMonthKey(latestEntry.effectiveMonth, 1)

    if (entry.effectiveMonth < minimumEffectiveMonth) {
      return
    }

    const nextPolicyHistory = normalizePolicyHistory([...snapshot.policyHistory, entry])

    await storage.savePolicyHistory(nextPolicyHistory)

    set({
      snapshot: {
        ...snapshot,
        policyHistory: nextPolicyHistory,
      },
    })
  },
  async restoreSnapshot(state) {
    const { storage, selectedMonth, selectedYear, viewMode } = get()

    await storage.restoreState(state)

    const loadedState = await storage.load()
    const snapshot = await ensurePolicyHistory(storage, loadedState)

    set({
      snapshot,
      selectedMonth,
      selectedYear: viewMode === 'month' ? getYearFromMonthKey(selectedMonth) : selectedYear,
      viewMode,
      isLoading: false,
      error: null,
      detailDate: null,
      detailStatus: 'unset',
      detailNote: '',
    })
  },
  navigateMonth(offset) {
    const { selectedMonth } = get()

    const nextMonth = shiftMonthKey(selectedMonth, offset)

    set({
      selectedMonth: nextMonth,
      selectedYear: getYearFromMonthKey(nextMonth),
      viewMode: 'month',
    })
  },
  navigateYear(offset) {
    const { selectedYear } = get()

    set({
      selectedYear: selectedYear + offset,
      viewMode: 'year',
    })
  },
  openYearOverview() {
    const { selectedMonth } = get()

    set({
      viewMode: 'year',
      selectedYear: getYearFromMonthKey(selectedMonth),
    })
  },
  openMonthOverview() {
    set({ viewMode: 'month' })
  },
  selectMonth(monthKey) {
    set({
      selectedMonth: monthKey,
      selectedYear: getYearFromMonthKey(monthKey),
      viewMode: 'month',
    })
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
  const normalizedPolicyHistory = normalizePolicyHistory(state.policyHistory)

  if (normalizedPolicyHistory === state.policyHistory) {
    return state
  }

  await storage.savePolicyHistory(normalizedPolicyHistory)

  return {
    ...state,
    policyHistory: normalizedPolicyHistory,
  }
}

function normalizePolicyHistory(policyHistory: PolicyHistoryEntry[]): PolicyHistoryEntry[] {
  if (policyHistory.length === 0) {
    return [DEFAULT_POLICY_ENTRY]
  }

  const sortedPolicyHistory = [...policyHistory].sort((left, right) =>
    left.effectiveMonth.localeCompare(right.effectiveMonth),
  )
  const earliestEntry = sortedPolicyHistory[0]

  if (!earliestEntry || earliestEntry.effectiveMonth <= DEFAULT_POLICY_ENTRY.effectiveMonth) {
    return sortedPolicyHistory.every((entry, index) => entry === policyHistory[index])
      ? policyHistory
      : sortedPolicyHistory
  }

  return [
    {
      ...earliestEntry,
      effectiveMonth: DEFAULT_POLICY_ENTRY.effectiveMonth,
    },
    ...sortedPolicyHistory,
  ]
}

function buildCalendarMonthViewModel(
  monthKey: EffectiveMonth,
  today: IsoDate,
  snapshot: BrowserStorageState,
  language: PersonalPreferences['language'],
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
    heading: formatMonthHeading(year, month, language),
    leadingBlankCount: getFirstWeekdayOffset(monthKey),
    weekdayHeaders: getWeekdayHeaders(language),
    policy,
    evaluation,
    days: classifications.map((classification) => {
      const entry = entryByDate.get(classification.date)
      const isInteractive =
        classification.kind === 'working-day' || classification.kind === 'overridden-working-day'

      return {
        classification,
        isInteractive,
        temporalLabel: classification.date <= today ? TRANSLATIONS[language].booking : TRANSLATIONS[language].planning,
        statusLabel: STATUS_LABELS[language][entry?.status ?? 'unset'],
        tone: getDayTone(classification, entry),
        ...(entry ? { entry } : {}),
      }
    }),
  }
}

function capitalizeMonthHeading(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatMonthHeading(
  year: number,
  month: number,
  language: PersonalPreferences['language'],
): string {
  return capitalizeMonthHeading(
    new Intl.DateTimeFormat(LOCALE_BY_LANGUAGE[language], {
      month: 'long',
      year: 'numeric',
    }).format(new Date(year, month - 1, 1)),
  )
}

function getWeekdayHeaders(language: PersonalPreferences['language']): string[] {
  const formatter = new Intl.DateTimeFormat(LOCALE_BY_LANGUAGE[language], { weekday: 'short' })

  return [1, 2, 3, 4, 5, 6, 0].map((weekday) => {
    const referenceDate = new Date(2026, 0, 4 + weekday, 12)
    return formatter.format(referenceDate).replace('.', '')
  })
}

function resolveThemePreference(theme: PersonalPreferences['theme']): 'light' | 'dark' {
  if (theme === 'light' || theme === 'dark') {
    return theme
  }

  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark'
  }

  return 'light'
}

function shiftMonthKey(monthKey: EffectiveMonth, offset: number): EffectiveMonth {
  const { year, month } = parseMonthKey(monthKey)
  const targetDate = new Date(year, month - 1 + offset, 1, 12)
  const nextYear = targetDate.getFullYear()
  const nextMonth = String(targetDate.getMonth() + 1).padStart(2, '0')
  return `${nextYear}-${nextMonth}` as EffectiveMonth
}

function getYearFromMonthKey(monthKey: EffectiveMonth): number {
  return Number(monthKey.slice(0, 4))
}

function buildYearOverviewViewModel(
  year: number,
  today: IsoDate,
  snapshot: BrowserStorageState,
  language: PersonalPreferences['language'],
): YearOverviewViewModel {
  return {
    year,
    cards: Array.from({ length: 12 }, (_, index) => {
      const monthKey = `${year}-${String(index + 1).padStart(2, '0')}` as EffectiveMonth
      const calendar = buildCalendarMonthViewModel(monthKey, today, snapshot, language)
      const monthStatus = classifyMonthStatus({
        evaluation: calendar.evaluation,
        warningThreshold: snapshot.preferences.warningThreshold,
      })

      return {
        monthKey,
        heading: calendar.heading,
        policy: calendar.policy,
        evaluation: calendar.evaluation,
        monthStatus,
      }
    }),
  }
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

function formatWeekday(date: IsoDate, language: PersonalPreferences['language']): string {
  return capitalizeMonthHeading(
    new Intl.DateTimeFormat(LOCALE_BY_LANGUAGE[language], { weekday: 'long' }).format(
      new Date(`${date}T12:00:00`),
    ),
  )
}

function formatFullDate(date: IsoDate, language: PersonalPreferences['language']): string {
  return new Intl.DateTimeFormat(LOCALE_BY_LANGUAGE[language], {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00`))
}

function formatUsagePercentage(value: number): string {
  return `${Math.round(value)} %`
}

function getDayNumber(date: IsoDate): string {
  return date.slice(8, 10)
}

function isWorkingClassification(classification: DayClassification): boolean {
  return classification.kind === 'working-day' || classification.kind === 'overridden-working-day'
}

function buildJsonExportFilename(today: IsoDate): string {
  return `homie-export-${today}.json`
}

function buildCsvExportFilename(monthKey: EffectiveMonth): string {
  return `homie-month-${monthKey}.csv`
}

function escapeCsvValue(value: string): string {
  const escapedValue = /^[=+\-@]/.test(value) ? `'${value}` : value

  if (!/[",\n\r]/.test(escapedValue)) {
    return escapedValue
  }

  return `"${escapedValue.replaceAll('"', '""')}"`
}

function serializeMonthAsCsv(calendar: CalendarMonthViewModel): string {
  const header = 'date,dayKind,status,note'
  const rows = calendar.days.map((day) => {
    const columns = [
      day.classification.date,
      isWorkingClassification(day.classification) ? 'arbeitstag' : 'nicht-arbeitstag',
      day.entry?.status ?? 'unset',
      day.entry?.note ?? '',
    ]

    return columns.map(escapeCsvValue).join(',')
  })

  return [header, ...rows].join('\n')
}

function downloadBlob(blob: Blob, filename: string) {
  const downloadUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = downloadUrl
  link.download = filename
  link.click()
  URL.revokeObjectURL(downloadUrl)
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function buildMonthlyReportHtml(input: {
  calendar: CalendarMonthViewModel
  language: PersonalPreferences['language']
  t: TranslationDictionary
  dayKindLabels: Record<DayClassification['kind'], string>
  monthStatusLabel: string
}): string {
  const { calendar, language, t, dayKindLabels, monthStatusLabel } = input
  const summaryMetrics = [
    { label: t.workingDays, value: String(calendar.evaluation.workingDays) },
    { label: t.allowance, value: String(calendar.evaluation.allowance) },
    {
      label: t.remoteWork,
      value: `${calendar.evaluation.remoteWorkDays} / ${calendar.evaluation.allowance}`,
    },
    { label: t.office, value: String(calendar.evaluation.officeDays) },
    { label: t.absence, value: String(calendar.evaluation.absenceDays) },
    { label: t.openWorkingDays, value: String(calendar.evaluation.openWorkingDays) },
  ]

  const reportRows = calendar.days
    .map((day) => {
      const isOpenWorkingDay = isWorkingClassification(day.classification) && !day.entry
      const note = day.entry?.note?.trim() ?? ''

      return `
        <tr class="report-row${isOpenWorkingDay ? ' report-row-open' : ''}">
          <td>
            <time datetime="${escapeHtml(day.classification.date)}">${escapeHtml(
              formatFullDate(day.classification.date, language),
            )}</time>
          </td>
          <td>${escapeHtml(dayKindLabels[day.classification.kind])}</td>
          <td>
            <span class="report-status report-status-${escapeHtml(day.tone)}">${escapeHtml(
              day.statusLabel,
            )}</span>
          </td>
          <td>${note ? escapeHtml(note) : ''}</td>
        </tr>`
    })
    .join('')

  const summaryCards = summaryMetrics
    .map(
      (metric) => `
        <article class="report-card">
          <span>${escapeHtml(metric.label)}</span>
          <strong>${escapeHtml(metric.value)}</strong>
        </article>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="${language}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(t.monthlyReport)} · ${escapeHtml(calendar.heading)}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #1f2937;
        --muted: #6b7280;
        --paper: #fffdfa;
        --paper-deep: #f3eadc;
        --line: rgba(31, 41, 55, 0.12);
        --accent: #143d73;
        --accent-soft: rgba(20, 61, 115, 0.08);
        --ok: #245245;
        --warn: #8f5d00;
        --empty: #6b7280;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font: 16px/1.5 'Avenir Next', 'Segoe UI', sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(248, 205, 74, 0.16), transparent 28%),
          linear-gradient(180deg, #f6efe5, #efe7da);
      }

      .report-shell {
        width: min(100%, 960px);
        margin: 0 auto;
        padding: 32px 24px 48px;
      }

      .report-hero {
        padding: 28px;
        border: 1px solid var(--line);
        border-radius: 28px;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(250, 244, 235, 0.92)),
          var(--paper);
        box-shadow: 0 20px 50px -38px rgba(15, 23, 42, 0.45);
      }

      .report-kicker {
        margin: 0 0 8px;
        color: #8c5a13;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .report-title-row {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        align-items: end;
        justify-content: space-between;
      }

      h1,
      h2 {
        margin: 0;
        font-family: 'Iowan Old Style', 'Palatino Linotype', serif;
        color: #152133;
      }

      h1 {
        font-size: clamp(2.2rem, 5vw, 3.4rem);
        line-height: 0.95;
      }

      h2 {
        font-size: 1.15rem;
      }

      .report-subtitle {
        margin: 8px 0 0;
        color: var(--muted);
      }

      .report-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .report-badge {
        padding: 8px 12px;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.82);
        font-size: 14px;
        font-weight: 700;
      }

      .report-grid {
        display: grid;
        gap: 18px;
        margin-top: 22px;
      }

      .report-summary {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      }

      .report-card,
      .report-table-wrap {
        border: 1px solid var(--line);
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.88);
        box-shadow: 0 14px 34px -30px rgba(15, 23, 42, 0.45);
      }

      .report-card {
        padding: 16px 18px;
      }

      .report-card span {
        display: block;
        color: var(--muted);
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .report-card strong {
        display: block;
        margin-top: 8px;
        font-size: 1.4rem;
      }

      .report-table-wrap {
        overflow: hidden;
      }

      .report-table-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 18px 20px 0;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      thead th {
        padding: 14px 20px 12px;
        border-bottom: 1px solid var(--line);
        color: var(--muted);
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-align: left;
        text-transform: uppercase;
      }

      tbody td {
        padding: 14px 20px;
        border-bottom: 1px solid rgba(31, 41, 55, 0.08);
        vertical-align: top;
      }

      tbody tr:last-child td {
        border-bottom: 0;
      }

      .report-row-open {
        background: linear-gradient(90deg, rgba(20, 61, 115, 0.06), transparent 75%);
      }

      .report-status {
        display: inline-flex;
        padding: 5px 10px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 700;
        background: rgba(31, 41, 55, 0.08);
      }

      .report-status-empty,
      .report-status-non-working {
        color: var(--empty);
      }

      .report-status-remote-work,
      .report-status-office {
        color: var(--accent);
      }

      .report-status-vacation,
      .report-status-sick {
        color: var(--warn);
      }

      @media print {
        body {
          background: #ffffff;
        }

        .report-shell {
          width: 100%;
          padding: 0;
        }

        .report-hero,
        .report-card,
        .report-table-wrap {
          box-shadow: none;
        }

        .report-row,
        .report-card {
          break-inside: avoid;
        }
      }
    </style>
  </head>
  <body>
    <main class="report-shell">
      <section class="report-hero">
        <p class="report-kicker">HOmie</p>
        <div class="report-title-row">
          <div>
            <h1>${escapeHtml(t.monthlyReport)}</h1>
            <p class="report-subtitle">${escapeHtml(calendar.heading)}</p>
          </div>
          <div class="report-badges">
            <span class="report-badge">${escapeHtml(t.monthlyStatus)} ${escapeHtml(monthStatusLabel)}</span>
            <span class="report-badge">${escapeHtml(t.quota)} ${Math.round(calendar.policy.quota * 100)} %</span>
            <span class="report-badge">${escapeHtml(t.federalState)} ${escapeHtml(calendar.policy.bundesland)}</span>
          </div>
        </div>
      </section>

      <section class="report-grid">
        <div class="report-summary">${summaryCards}</div>

        <section class="report-table-wrap">
          <div class="report-table-head">
            <h2>${escapeHtml(t.monthView)}</h2>
            <span class="report-badge">${escapeHtml(t.usage)} ${escapeHtml(
              formatUsagePercentage(calendar.evaluation.usagePercentage),
            )}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th scope="col">${escapeHtml(t.dateColumn)}</th>
                <th scope="col">${escapeHtml(t.dayKindColumn)}</th>
                <th scope="col">${escapeHtml(t.status)}</th>
                <th scope="col">${escapeHtml(t.note)}</th>
              </tr>
            </thead>
            <tbody>${reportRows}</tbody>
          </table>
        </section>
      </section>
    </main>
  </body>
</html>`
}

function App({ storage = DEFAULT_STORAGE, today = DEFAULT_TODAY }: AppProps) {
  const {
    initialize,
    updatePreferences,
    addPolicyHistoryEntry,
    restoreSnapshot,
    navigateMonth,
    navigateYear,
    openYearOverview,
    openMonthOverview,
    selectMonth,
    cycleDayStatus,
    openDetailView,
    closeDetailView,
    setDetailStatus,
    setDetailNote,
    saveDetailEntry,
    selectedMonth,
    selectedYear,
    viewMode,
    snapshot,
    isLoading,
    error,
    detailDate,
    detailStatus,
    detailNote,
  } = useHomieStore()
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null)

  useEffect(() => {
    void initialize({ storage, today })
  }, [initialize, storage, today])

  useEffect(() => {
    if (!snapshot) {
      return
    }

    const resolvedTheme = resolveThemePreference(snapshot.preferences.theme)

    document.documentElement.dataset.theme = resolvedTheme
    document.documentElement.dataset.themePreference = snapshot.preferences.theme
    document.documentElement.style.colorScheme = resolvedTheme
  }, [snapshot])

  if (error) {
    return (
      <main className="app-shell loading-state">
        <p className="eyebrow">Monatsübersicht</p>
        <h1>Speicherfehler</h1>
        <p className="lead">{error}</p>
      </main>
    )
  }

  if (isLoading || !snapshot) {
    return (
      <main className="app-shell loading-state">
        <p className="eyebrow">Monatsübersicht</p>
        <h1>HOmie wird geladen</h1>
      </main>
    )
  }

  const language = snapshot.preferences.language
  const t = TRANSLATIONS[language]
  const monthStatusLabels = MONTH_STATUS_LABELS[language]
  const dayKindLabels = DAY_KIND_LABELS[language]
  const calendar = buildCalendarMonthViewModel(selectedMonth, today, snapshot, language)
  const latestPolicyEntry = snapshot.policyHistory[snapshot.policyHistory.length - 1] ?? DEFAULT_POLICY_ENTRY
  const minimumNextPolicyMonth = shiftMonthKey(latestPolicyEntry.effectiveMonth, 1)
  const monthStatus = classifyMonthStatus({
    evaluation: calendar.evaluation,
    warningThreshold: snapshot.preferences.warningThreshold,
  })
  const yearOverview = buildYearOverviewViewModel(selectedYear, today, snapshot, language)

  const handleExportJson = async () => {
    const exportedState = await storage.exportState()
    const blob = new Blob([JSON.stringify(exportedState, null, 2)], {
      type: 'application/json',
    })

    downloadBlob(blob, buildJsonExportFilename(today))
  }

  const handleExportCsv = () => {
    const blob = new Blob([serializeMonthAsCsv(calendar)], {
      type: 'text/csv;charset=utf-8',
    })

    downloadBlob(blob, buildCsvExportFilename(selectedMonth))
  }

  const handlePrintReport = () => {
    const reportWindow = window.open('', '_blank')

    if (!reportWindow) {
      return
    }

    reportWindow.opener = null
    reportWindow.document.write(
      buildMonthlyReportHtml({
        calendar,
        language,
        t,
        dayKindLabels,
        monthStatusLabel: monthStatusLabels[monthStatus],
      }),
    )
    reportWindow.document.close()
    reportWindow.focus()
  }

  const handleRestoreFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (!window.confirm(t.restoreWarning)) {
      event.target.value = ''
      return
    }

    try {
      const parsedState = JSON.parse(await file.text()) as BrowserStorageState

      await restoreSnapshot(parsedState)
      setRestoreError(null)
      setRestoreSuccess(t.restoreSucceeded)
    } catch (error) {
      setRestoreSuccess(null)
      if (error instanceof SyntaxError) {
        setRestoreError(t.restoreInvalidJson)
      } else {
        setRestoreError(error instanceof Error ? error.message : t.restoreFailed)
      }
    } finally {
      event.target.value = ''
    }
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">{viewMode === 'month' ? t.monthOverview : t.yearOverview}</p>
          <div className="hero-heading-row">
            <button
              type="button"
              className="month-nav-button"
              aria-label={viewMode === 'month' ? t.previousMonth : t.previousYear}
              onClick={() => {
                if (viewMode === 'month') {
                  navigateMonth(-1)
                  return
                }

                navigateYear(-1)
              }}
            >
              {viewMode === 'month' ? t.previousMonthButton : t.previousYearButton}
            </button>
            <h1>{viewMode === 'month' ? calendar.heading : String(yearOverview.year)}</h1>
            <button
              type="button"
              className="month-nav-button"
              aria-label={viewMode === 'month' ? t.nextMonth : t.nextYear}
              onClick={() => {
                if (viewMode === 'month') {
                  navigateMonth(1)
                  return
                }

                navigateYear(1)
              }}
            >
              {viewMode === 'month' ? t.nextMonthButton : t.nextYearButton}
            </button>
          </div>
          <p className="lead">
            {viewMode === 'month' ? t.monthLead : t.yearLead}
          </p>
        </div>

        <div className="hero-aside">
          {viewMode === 'month' ? (
            <>
              <div className={`status-pill status-${monthStatus}`}>
                {t.monthlyStatus} {monthStatusLabels[monthStatus]}
              </div>
              <p className="policy-chip">
                {t.quota} {Math.round(calendar.policy.quota * 100)} % · {t.federalState} {calendar.policy.bundesland}
              </p>
              <button type="button" className="hero-toggle-button" onClick={openYearOverview}>
                {t.openYearOverview}
              </button>
            </>
          ) : (
            <>
              <div className="status-pill">{t.yearCardsCount}</div>
              <p className="policy-chip">{t.policyPerMonth}</p>
              <button type="button" className="hero-toggle-button" onClick={openMonthOverview}>
                {t.openMonthOverview}
              </button>
            </>
          )}
        </div>
      </section>

      {viewMode === 'month' ? (
        <>
          <section className="summary-panel" aria-label={t.monthlyStatus}>
            <div className="summary-panel-head">
              <div>
                <p className="eyebrow">{t.evaluation}</p>
                <h2>{t.monthlyStatus}</h2>
              </div>
              <div className="summary-panel-actions">
                <button type="button" className="primary-button" onClick={handlePrintReport}>
                  {t.printReport}
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={handleExportCsv}
                >
                  {t.exportCsv}
                </button>
                <div className={`status-pill status-${monthStatus}`}>
                  {monthStatusLabels[monthStatus]}
                </div>
              </div>
            </div>

            <dl className="summary-grid">
              <div className="summary-metric">
                <dt>{t.workingDays}</dt>
                <dd>{calendar.evaluation.workingDays}</dd>
              </div>
              <div className="summary-metric">
                <dt>{t.allowance}</dt>
                <dd>{calendar.evaluation.allowance}</dd>
              </div>
              <div className="summary-metric summary-metric-wide">
                <dt>{t.remoteWork}</dt>
                <dd>
                  {calendar.evaluation.remoteWorkDays} / {calendar.evaluation.allowance}
                </dd>
              </div>
              <div className="summary-metric">
                <dt>{t.office}</dt>
                <dd>{calendar.evaluation.officeDays}</dd>
              </div>
              <div className="summary-metric">
                <dt>{t.absence}</dt>
                <dd>{calendar.evaluation.absenceDays}</dd>
              </div>
              <div className="summary-metric summary-metric-wide">
                <dt>{t.openWorkingDays}</dt>
                <dd>{calendar.evaluation.openWorkingDays}</dd>
              </div>
            </dl>

            <div className="usage-panel">
              <div className="usage-copy">
                <div>
                  <p className="usage-label">{t.usage}</p>
                  <strong>{formatUsagePercentage(calendar.evaluation.usagePercentage)}</strong>
                </div>
                <p>{t.usageSummary(calendar.evaluation)}</p>
              </div>
              <div
                className="usage-meter"
                role="progressbar"
                aria-label={t.usage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.max(
                  0,
                  Math.min(100, Math.round(calendar.evaluation.usagePercentage)),
                )}
              >
                <span
                  className="usage-meter-fill"
                  style={{
                    width: `${Math.max(0, Math.min(100, calendar.evaluation.usagePercentage))}%`,
                  }}
                />
              </div>
            </div>
          </section>

          <section className="settings-panel" aria-label={t.personalSettings}>
            <div className="summary-panel-head">
              <div>
                <p className="eyebrow">{t.settings}</p>
                <h2>{t.personalSettings}</h2>
              </div>
            </div>

            <fieldset className="settings-fieldset">
              <legend>{t.language}</legend>
              <label className="settings-choice">
                <input
                  type="radio"
                  name="language"
                  checked={snapshot.preferences.language === 'de'}
                  onChange={() => {
                    void updatePreferences({ language: 'de' })
                  }}
                />
                <span>{t.german}</span>
              </label>
              <label className="settings-choice">
                <input
                  type="radio"
                  name="language"
                  checked={snapshot.preferences.language === 'en'}
                  onChange={() => {
                    void updatePreferences({ language: 'en' })
                  }}
                />
                <span>{t.english}</span>
              </label>
            </fieldset>

            <fieldset className="settings-fieldset">
              <legend>{t.theme}</legend>
              <label className="settings-choice">
                <input
                  type="radio"
                  name="theme"
                  checked={snapshot.preferences.theme === 'light'}
                  onChange={() => {
                    void updatePreferences({ theme: 'light' })
                  }}
                />
                <span>{t.themeLight}</span>
              </label>
              <label className="settings-choice">
                <input
                  type="radio"
                  name="theme"
                  checked={snapshot.preferences.theme === 'dark'}
                  onChange={() => {
                    void updatePreferences({ theme: 'dark' })
                  }}
                />
                <span>{t.themeDark}</span>
              </label>
              <label className="settings-choice">
                <input
                  type="radio"
                  name="theme"
                  checked={snapshot.preferences.theme === 'system'}
                  onChange={() => {
                    void updatePreferences({ theme: 'system' })
                  }}
                />
                <span>{t.themeSystem}</span>
              </label>
            </fieldset>

            <label className="settings-field">
              <span>{t.warningThreshold}</span>
              <input
                aria-label={t.warningThreshold}
                type="number"
                min={0}
                max={100}
                step={1}
                value={Math.round(snapshot.preferences.warningThreshold * 100)}
                onChange={(event) => {
                  const nextValue = Number(event.target.value)

                  if (Number.isNaN(nextValue) || nextValue < 0 || nextValue > 100) {
                    return
                  }

                  void updatePreferences({ warningThreshold: nextValue / 100 })
                }}
              />
            </label>

            <div className="backup-panel">
              <div className="backup-copy">
                <strong>{t.localBackup}</strong>
                <p>{t.localBackupLead}</p>
              </div>

              <div className="backup-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    void handleExportJson()
                  }}
                >
                  {t.exportJson}
                </button>

                <label className="ghost-button file-trigger">
                  <span>{t.restoreJson}</span>
                  <input
                    aria-label={t.restoreJson}
                    type="file"
                    accept="application/json,.json"
                    hidden
                    onChange={(event) => {
                      void handleRestoreFileChange(event)
                    }}
                  />
                </label>
              </div>

              {restoreSuccess ? (
                <p className="settings-feedback settings-feedback-success" role="status">
                  {restoreSuccess}
                </p>
              ) : null}
              {restoreError ? (
                <p className="settings-feedback settings-feedback-error" role="alert">
                  {restoreError}
                </p>
              ) : null}
            </div>
          </section>

          <section className="settings-panel" aria-label={t.policyHistory}>
            <div className="summary-panel-head">
              <div>
                <p className="eyebrow">{t.policyHistory}</p>
                <h2>{t.policyHistory}</h2>
              </div>
            </div>

            <ol className="policy-history-list">
              {snapshot.policyHistory.map((entry) => (
                <li key={entry.effectiveMonth} className="policy-history-item">
                  <strong>{entry.effectiveMonth}</strong>
                  <span>
                    {t.quota} {Math.round(entry.quota * 100)} % · {t.federalState} {entry.bundesland}
                  </span>
                </li>
              ))}
            </ol>

            <form
              key={`${latestPolicyEntry.effectiveMonth}-${latestPolicyEntry.quota}-${latestPolicyEntry.bundesland}`}
              className="policy-form"
              onSubmit={(event) => {
                event.preventDefault()

                if (!event.currentTarget.reportValidity()) {
                  return
                }

                const formData = new FormData(event.currentTarget)
                const quotaValue = Number(formData.get('quota'))
                const bundeslandValue = formData.get('bundesland')
                const effectiveMonthValue = formData.get('effectiveMonth')

                if (
                  !Number.isFinite(quotaValue) ||
                  quotaValue < 0 ||
                  quotaValue > 100 ||
                  typeof bundeslandValue !== 'string' ||
                  typeof effectiveMonthValue !== 'string' ||
                  effectiveMonthValue < minimumNextPolicyMonth
                ) {
                  return
                }

                void addPolicyHistoryEntry({
                  effectiveMonth: effectiveMonthValue as EffectiveMonth,
                  quota: quotaValue / 100,
                  bundesland: bundeslandValue as PolicyHistoryEntry['bundesland'],
                })
              }}
            >
              <label className="settings-field">
                <span>{t.quota}</span>
                <input
                  name="quota"
                  aria-label={t.quota}
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  required
                  defaultValue={Math.round(latestPolicyEntry.quota * 100)}
                />
              </label>

              <label className="settings-field">
                <span>{t.federalState}</span>
                <select
                  name="bundesland"
                  aria-label={t.federalState}
                  defaultValue={latestPolicyEntry.bundesland}
                >
                  {BUNDESLAND_OPTIONS.map((bundesland) => (
                    <option key={bundesland} value={bundesland}>
                      {bundesland}
                    </option>
                  ))}
                </select>
              </label>

              <label className="settings-field">
                <span>{t.effectiveMonth}</span>
                <input
                  name="effectiveMonth"
                  aria-label={t.effectiveMonth}
                  type="month"
                  min={minimumNextPolicyMonth}
                  required
                  defaultValue={minimumNextPolicyMonth}
                />
              </label>

              <button type="submit" className="primary-button">
                {t.addEntry}
              </button>
            </form>
          </section>

          <section className="calendar-panel" aria-label={t.monthView}>
            <div className="calendar-weekdays" aria-hidden="true">
              {calendar.weekdayHeaders.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>

            <div className="calendar-grid" role="grid" aria-label={t.monthGrid}>
              {Array.from({ length: calendar.leadingBlankCount }, (_, index) => (
                <div key={`blank-${index}`} className="calendar-blank" aria-hidden="true" />
              ))}

              {calendar.days.map((day) => (
                <article
                  key={day.classification.date}
                  role="gridcell"
                  aria-label={`${Number(getDayNumber(day.classification.date))} ${formatWeekday(day.classification.date, language)}`}
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
                        <span className="day-weekday">{formatWeekday(day.classification.date, language)}</span>
                      </span>
                      <span className="day-phase">{day.temporalLabel}</span>
                      <strong className="day-status">{day.statusLabel}</strong>
                      {day.entry?.note ? <span className="day-note">{day.entry.note}</span> : null}
                    </button>
                  ) : (
                    <div className="day-static">
                      <span className="day-topline">
                        <span className="day-number">{getDayNumber(day.classification.date)}</span>
                        <span className="day-weekday">{formatWeekday(day.classification.date, language)}</span>
                      </span>
                      <span className="day-phase">{day.temporalLabel}</span>
                      <strong className="day-status">{dayKindLabels[day.classification.kind]}</strong>
                      {day.classification.holidayName ? (
                        <span className="day-note">{day.classification.holidayName}</span>
                      ) : null}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="year-panel" aria-label={t.yearOverview}>
          <div className="year-grid">
            {yearOverview.cards.map((card) => (
              <button
                key={card.monthKey}
                type="button"
                className={`year-card status-${card.monthStatus}`}
                aria-label={t.openMonth(card.heading)}
                onClick={() => {
                  selectMonth(card.monthKey)
                }}
              >
                <span className="year-card-topline">
                  <span className="year-card-month">{card.heading}</span>
                  <span className={`status-pill status-${card.monthStatus}`}>
                    {monthStatusLabels[card.monthStatus]}
                  </span>
                </span>
                <span className="year-card-policy">
                  {t.quota} {Math.round(card.policy.quota * 100)} % · {t.federalState} {card.policy.bundesland}
                </span>
                <dl className="year-card-metrics">
                  <div>
                    <dt>{t.remoteWork}</dt>
                    <dd>
                      {card.evaluation.remoteWorkDays} / {card.evaluation.allowance}
                    </dd>
                  </div>
                  <div>
                    <dt>{t.office}</dt>
                    <dd>{card.evaluation.officeDays}</dd>
                  </div>
                </dl>
              </button>
            ))}
          </div>
        </section>
      )}

      {detailDate ? (
        <div className="dialog-backdrop">
          <section
            className="detail-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={t.editDay}
          >
            <div className="detail-dialog-head">
              <p className="eyebrow">{t.detailView}</p>
              <h2>{t.editDay}</h2>
              <p className="lead dialog-date">{capitalizeMonthHeading(formatFullDate(detailDate, language))}</p>
            </div>

            <fieldset className="detail-status-list">
              <legend>{t.status}</legend>
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
                  <span>{STATUS_LABELS[language][status]}</span>
                </label>
              ))}
            </fieldset>

            <label className="detail-note-field">
              <span>{t.note}</span>
              <textarea
                aria-label={t.note}
                rows={4}
                value={detailNote}
                onChange={(event) => {
                  setDetailNote(event.target.value)
                }}
              />
            </label>

            <div className="detail-actions">
              <button type="button" className="ghost-button" onClick={closeDetailView}>
                {t.cancel}
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  void saveDetailEntry()
                }}
              >
                {t.save}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  )
}

export default App
