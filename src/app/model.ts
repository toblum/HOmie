import { create } from 'zustand'
import { classifyMonth } from '../domain/calendarClassification'
import {
  evaluateMonth,
  type DayEntry,
  type DayEntryStatus,
  type MonthEvaluation,
} from '../domain/monthEvaluation'
import { classifyMonthStatus, type MonthStatus } from '../domain/monthStatus'
import {
  resolvePolicyForMonth,
  type EffectiveMonth,
  type PolicyHistoryEntry,
} from '../domain/policyResolution'
import type { DayClassification, IsoDate } from '../domain/types'
import {
  createBrowserStorage,
  BUNDESLAENDER,
  migrateV1ToV2,
  type BrowserStorage,
  type BrowserStorageState,
  type PersonalPreferences,
} from '../storage/browserStorage'

export const DEFAULT_TODAY = toIsoDate(new Date())
export const STATUS_SEQUENCE: Array<DayEntryStatus | 'unset'> = [
  'unset',
  'remote-work',
  'office',
  'vacation',
  'sick',
  'other',
]
export const DEFAULT_POLICY_ENTRY: PolicyHistoryEntry = {
  effectiveMonth: '1900-01',
  quota: 0.6,
  bundesland: 'SL',
  roundingMode: 'round',
}
const LOCALE_BY_LANGUAGE: Record<PersonalPreferences['language'], string> = {
  de: 'de-DE',
  en: 'en-US',
}

export type TranslationDictionary = {
  monthOverview: string
  yearOverview: string
  loadingHeading: string
  storageError: string
  monthLead: (input: { openWorkingDays: number; usagePercentage: number }) => string
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
  openSettings: string
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
  detailView: string
  editDay: string
  status: string
  note: string
  cancel: string
  save: string
  addEntry: string
  openMonth: (heading: string) => string
  calendarLegend: string
  calendarHint: string
  otherAbsence: string
  settingsLead: string
  roundingMode: string
  roundingModeFloor: string
  roundingModeRound: string
  roundingModeCeil: string
}

export const TRANSLATIONS: Record<PersonalPreferences['language'], TranslationDictionary> = {
  de: {
    monthOverview: 'Monatsübersicht',
    yearOverview: 'Jahresübersicht',
    loadingHeading: 'HOmie wird geladen',
    storageError: 'Speicherfehler',
    monthLead: ({ openWorkingDays, usagePercentage }) =>
      `${openWorkingDays} Arbeitstage noch offen - ${Math.round(usagePercentage)} % Kontingent genutzt.`,
    yearLead:
      'Jahresweite Auswertung mit einem Monatsstand pro Karte und direktem Sprung zurück in die Monatsübersicht.',
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
    openSettings: 'Einstellungen öffnen',
    yearCardsCount: '12 Monatskarten',
    policyPerMonth: 'Regelverlauf wird pro Monat separat aufgelöst.',
    evaluation: 'Auswertung',
    workingDays: 'Arbeitstage',
    quota: 'Quote',
    federalState: 'Bundesland',
    allowance: 'Kontingent',
    remoteWork: 'Mobiles Arbeiten',
    office: 'Bürotage',
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
    detailView: 'Detailansicht',
    editDay: 'Tag bearbeiten',
    status: 'Status',
    note: 'Notiz',
    cancel: 'Abbrechen',
    save: 'Speichern',
    addEntry: 'Eintrag hinzufügen',
    openMonth: (heading) => `${heading} öffnen`,
    calendarLegend: 'Farblegende',
    calendarHint: 'Linksklick wechselt den Status. Rechtsklick öffnet Details und Notiz.',
    otherAbsence: 'Sonstiges',
    settingsLead: 'Persönliche Einstellungen, Regelverlauf und lokale Datensicherung an einem Ort.',
    roundingMode: 'Rundungsmethode für Kontingent mobiles Arbeiten',
    roundingModeFloor: 'Abrunden',
    roundingModeRound: 'Kaufmännisch',
    roundingModeCeil: 'Aufrunden',
  },
  en: {
    monthOverview: 'Monthly Overview',
    yearOverview: 'Yearly Overview',
    loadingHeading: 'HOmie is loading',
    storageError: 'Storage error',
    monthLead: ({ openWorkingDays, usagePercentage }) =>
      `${openWorkingDays} working days still open - ${Math.round(usagePercentage)}% of allowance used.`,
    yearLead:
      'Year-wide evaluation with one monthly status per card and a direct jump back into the monthly overview.',
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
    openSettings: 'Open settings',
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
    detailView: 'Detail view',
    editDay: 'Edit day',
    status: 'Status',
    note: 'Note',
    cancel: 'Cancel',
    save: 'Save',
    addEntry: 'Add entry',
    openMonth: (heading) => `Open ${heading}`,
    calendarLegend: 'Color legend',
    calendarHint: 'Left click cycles the status. Right click opens details and note.',
    otherAbsence: 'Other',
    settingsLead: 'Personal settings, policy history, and local backup in one place.',
    roundingMode: 'Rounding method',
    roundingModeFloor: 'Floor',
    roundingModeRound: 'Round',
    roundingModeCeil: 'Ceil',
  },
}

export const STATUS_LABELS: Record<
  PersonalPreferences['language'],
  Record<DayEntryStatus | 'unset', string>
> = {
  de: {
    unset: 'Leer',
    'remote-work': 'Mobiles Arbeiten',
    office: 'Büro',
    vacation: 'Urlaub',
    sick: 'Krank',
    other: 'Sonstiges',
  },
  en: {
    unset: 'Unset',
    'remote-work': 'Remote Work',
    office: 'Office',
    vacation: 'Vacation',
    sick: 'Sick',
    other: 'Other',
  },
}

export const BUNDESLAND_LABELS: Record<
  PersonalPreferences['language'],
  Record<(typeof BUNDESLAENDER)[number], string>
> = {
  de: {
    BB: 'Brandenburg',
    BE: 'Berlin',
    BW: 'Baden-Württemberg',
    BY: 'Bayern',
    HB: 'Bremen',
    HE: 'Hessen',
    HH: 'Hamburg',
    MV: 'Mecklenburg-Vorpommern',
    NI: 'Niedersachsen',
    NW: 'Nordrhein-Westfalen',
    RP: 'Rheinland-Pfalz',
    SH: 'Schleswig-Holstein',
    SL: 'Saarland',
    SN: 'Sachsen',
    ST: 'Sachsen-Anhalt',
    TH: 'Thüringen',
  },
  en: {
    BB: 'Brandenburg',
    BE: 'Berlin',
    BW: 'Baden-Wuerttemberg',
    BY: 'Bavaria',
    HB: 'Bremen',
    HE: 'Hesse',
    HH: 'Hamburg',
    MV: 'Mecklenburg-Western Pomerania',
    NI: 'Lower Saxony',
    NW: 'North Rhine-Westphalia',
    RP: 'Rhineland-Palatinate',
    SH: 'Schleswig-Holstein',
    SL: 'Saarland',
    SN: 'Saxony',
    ST: 'Saxony-Anhalt',
    TH: 'Thuringia',
  },
}

export const DAY_KIND_LABELS: Record<
  PersonalPreferences['language'],
  Record<DayClassification['kind'], string>
> = {
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

export const MONTH_STATUS_LABELS: Record<PersonalPreferences['language'], Record<MonthStatus, string>> = {
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

export const DEFAULT_STORAGE = createBrowserStorage({ schemaVersion: 2, migrate: migrateV1ToV2 })

export interface CalendarDayViewModel {
  classification: DayClassification
  entry?: DayEntry
  isInteractive: boolean
  isToday: boolean
  statusLabel: string
  tone: 'empty' | 'remote-work' | 'office' | 'vacation' | 'sick' | 'other' | 'non-working'
}

export interface CalendarMonthViewModel {
  heading: string
  leadingBlankCount: number
  weekdayHeaders: string[]
  days: CalendarDayViewModel[]
  policy: PolicyHistoryEntry
  evaluation: MonthEvaluation
}

export type ViewMode = 'month' | 'year' | 'settings'

export interface YearMonthCardViewModel {
  monthKey: EffectiveMonth
  heading: string
  policy: PolicyHistoryEntry
  evaluation: MonthEvaluation
  monthStatus: MonthStatus
}

export interface YearOverviewViewModel {
  year: number
  cards: YearMonthCardViewModel[]
}

export interface HomieAppState {
  storage: BrowserStorage
  today: IsoDate
  selectedMonth: EffectiveMonth
  selectedYear: number
  viewMode: ViewMode
  lastOverviewMode: Extract<ViewMode, 'month' | 'year'>
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
  openSettingsPage: () => void
  selectMonth: (monthKey: EffectiveMonth) => void
  cycleDayStatus: (date: IsoDate) => Promise<void>
  openDetailView: (date: IsoDate) => void
  closeDetailView: () => void
  setDetailStatus: (status: DayEntryStatus | 'unset') => void
  setDetailNote: (note: string) => void
  saveDetailEntry: () => Promise<void>
}

export const useHomieStore = create<HomieAppState>((set, get) => ({
  storage: createBrowserStorage({ schemaVersion: 2, migrate: migrateV1ToV2 }),
  today: DEFAULT_TODAY,
  selectedMonth: toMonthKey(DEFAULT_TODAY),
  selectedYear: Number(toMonthKey(DEFAULT_TODAY).slice(0, 4)),
  viewMode: 'month',
  lastOverviewMode: 'month',
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
      lastOverviewMode: 'month',
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
        lastOverviewMode: 'month',
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
    const { storage, selectedMonth, selectedYear, viewMode, lastOverviewMode } = get()

    await storage.restoreState(state)

    const loadedState = await storage.load()
    const snapshot = await ensurePolicyHistory(storage, loadedState)

    set({
      snapshot,
      selectedMonth,
      selectedYear:
        viewMode === 'month' || (viewMode === 'settings' && lastOverviewMode === 'month')
          ? getYearFromMonthKey(selectedMonth)
          : selectedYear,
      viewMode,
      lastOverviewMode,
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
      lastOverviewMode: 'month',
    })
  },
  navigateYear(offset) {
    const { selectedYear } = get()

    set({
      selectedYear: selectedYear + offset,
      viewMode: 'year',
      lastOverviewMode: 'year',
    })
  },
  openYearOverview() {
    const { selectedMonth } = get()

    set({
      viewMode: 'year',
      lastOverviewMode: 'year',
      selectedYear: getYearFromMonthKey(selectedMonth),
    })
  },
  openMonthOverview() {
    set({ viewMode: 'month', lastOverviewMode: 'month' })
  },
  openSettingsPage() {
    const { viewMode, lastOverviewMode } = get()

    set({
      viewMode: 'settings',
      lastOverviewMode: viewMode === 'year' || viewMode === 'month' ? viewMode : lastOverviewMode,
    })
  },
  selectMonth(monthKey) {
    set({
      selectedMonth: monthKey,
      selectedYear: getYearFromMonthKey(monthKey),
      viewMode: 'month',
      lastOverviewMode: 'month',
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

export function toIsoDate(date: Date): IsoDate {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function toMonthKey(date: IsoDate): EffectiveMonth {
  return date.slice(0, 7) as EffectiveMonth
}

function parseMonthKey(monthKey: EffectiveMonth) {
  const [yearText, monthText] = monthKey.split('-')
  return {
    year: Number(yearText),
    month: Number(monthText),
  }
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

export function buildCalendarMonthViewModel(
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
    roundingMode: policy.roundingMode,
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
      const isToday = classification.date === today

      return {
        classification,
        isInteractive,
        isToday,
        statusLabel: STATUS_LABELS[language][entry?.status ?? 'unset'],
        tone: getDayTone(classification, entry),
        ...(entry ? { entry } : {}),
      }
    }),
  }
}

export function capitalizeMonthHeading(value: string): string {
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

export function resolveThemePreference(theme: PersonalPreferences['theme']): 'light' | 'dark' {
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

export function shiftMonthKey(monthKey: EffectiveMonth, offset: number): EffectiveMonth {
  const { year, month } = parseMonthKey(monthKey)
  const targetDate = new Date(year, month - 1 + offset, 1, 12)
  const nextYear = targetDate.getFullYear()
  const nextMonth = String(targetDate.getMonth() + 1).padStart(2, '0')
  return `${nextYear}-${nextMonth}` as EffectiveMonth
}

export function getYearFromMonthKey(monthKey: EffectiveMonth): number {
  return Number(monthKey.slice(0, 4))
}

export function buildYearOverviewViewModel(
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
  if (
    classification.kind === 'weekend' ||
    classification.kind === 'public-holiday' ||
    classification.kind === 'excluded-day'
  ) {
    return 'non-working'
  }

  return entry?.status ?? 'empty'
}

export function getVisiblePolicyHistory(policyHistory: PolicyHistoryEntry[]): PolicyHistoryEntry[] {
  return policyHistory.filter((entry) => entry.effectiveMonth !== DEFAULT_POLICY_ENTRY.effectiveMonth)
}

export function formatWeekday(date: IsoDate, language: PersonalPreferences['language']): string {
  return capitalizeMonthHeading(
    new Intl.DateTimeFormat(LOCALE_BY_LANGUAGE[language], { weekday: 'long' }).format(
      new Date(`${date}T12:00:00`),
    ),
  )
}

export function formatFullDate(date: IsoDate, language: PersonalPreferences['language']): string {
  return new Intl.DateTimeFormat(LOCALE_BY_LANGUAGE[language], {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00`))
}

export function formatUsagePercentage(value: number): string {
  return `${Math.round(value)} %`
}

export function getDayNumber(date: IsoDate): string {
  return date.slice(8, 10)
}

function isWorkingClassification(classification: DayClassification): boolean {
  return classification.kind === 'working-day' || classification.kind === 'overridden-working-day'
}

export function buildJsonExportFilename(today: IsoDate): string {
  return `homie-export-${today}.json`
}

export function buildCsvExportFilename(monthKey: EffectiveMonth): string {
  return `homie-month-${monthKey}.csv`
}

function escapeCsvValue(value: string): string {
  const escapedValue = /^[=+\-@]/.test(value) ? `'${value}` : value

  if (!/[",\n\r]/.test(escapedValue)) {
    return escapedValue
  }

  return `"${escapedValue.replaceAll('"', '""')}"`
}

export function serializeMonthAsCsv(calendar: CalendarMonthViewModel): string {
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

export function downloadBlob(blob: Blob, filename: string) {
  const downloadUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = downloadUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 100)
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function buildMonthlyReportHtml(input: {
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
      value: `${calendar.evaluation.remoteWorkDays} von ${calendar.evaluation.allowance}`,
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
        --sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
        --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        --text: #3f3f46;
        --text-h: #09090b;
        --muted: #71717a;
        --bg: #f4f4f5;
        --bg-deep: #e4e4e7;
        --surface: rgba(255, 255, 255, 0.85);
        --surface-strong: #ffffff;
        --border: rgba(9, 9, 11, 0.12);
        --accent: #2563eb;
        --accent-soft: rgba(37, 99, 235, 0.08);
        --tone-empty-bg: #f4f4f5;
        --tone-empty-border: rgba(9, 9, 11, 0.12);
        --tone-empty-text: #71717a;
        --tone-remote-bg: #ecfdf5;
        --tone-remote-border: #10b981;
        --tone-remote-text: #047857;
        --tone-office-bg: #eff6ff;
        --tone-office-border: #3b82f6;
        --tone-office-text: #1d4ed8;
        --tone-vacation-bg: #faf5ff;
        --tone-vacation-border: #a855f7;
        --tone-vacation-text: #7e22ce;
        --tone-sick-bg: #fff1f2;
        --tone-sick-border: #f43f5e;
        --tone-sick-text: #be123c;
        --tone-other-bg: #f8fafc;
        --tone-other-border: #64748b;
        --tone-other-text: #475569;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font: 14px/1.55 var(--sans);
        color: var(--text);
        background:
          radial-gradient(circle at top left, var(--accent-soft), transparent 35%),
          linear-gradient(180deg, var(--bg), var(--bg-deep));
        min-height: 100vh;
      }
      .report-shell { width: min(100%, 960px); margin: 0 auto; padding: 3rem 1.5rem; }
      .report-hero {
        padding: 1.75rem 2rem;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: var(--surface);
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 12px -2px rgba(9, 9, 11, 0.05);
        position: relative;
        overflow: hidden;
      }
      .report-hero::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(rgba(9, 9, 11, 0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(9, 9, 11, 0.015) 1px, transparent 1px);
        background-size: 20px 20px;
        z-index: 1;
      }
      .report-hero > * { position: relative; z-index: 2; }
      .report-kicker { margin: 0 0 0.4rem; color: var(--muted); font-family: var(--mono); font-size: 0.75rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; }
      .report-title-row { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between; }
      h1, h2 { margin: 0; color: var(--text-h); font-family: var(--mono); }
      h1 { font-size: clamp(2rem, 3.2vw, 3.2rem); font-weight: 800; letter-spacing: -0.05em; }
      h2 { font-size: 1.15rem; }
      .report-subtitle { margin: 0.5rem 0 0; color: var(--text); font-size: 0.95rem; }
      .report-badges { display: flex; flex-wrap: wrap; gap: 10px; }
      .report-badge { padding: 0.3rem 0.6rem; border: 1px solid var(--border); border-radius: 4px; background: var(--surface-strong); color: var(--muted); font-family: var(--mono); font-size: 0.8rem; font-weight: 700; }
      .report-grid { display: grid; gap: 1.5rem; margin-top: 1.5rem; }
      .report-summary { display: grid; gap: 0.75rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      @media (min-width: 640px) { .report-summary { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
      @media (min-width: 900px) { .report-summary { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
      .report-card, .report-table-wrap {
        border: 1px solid var(--border);
        border-radius: 12px;
        background: var(--surface);
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 12px -2px rgba(9, 9, 11, 0.05);
      }
      .report-card { padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: center; border-radius: 8px; background: rgba(0, 0, 0, 0.02); }
      .report-card span { display: block; color: var(--muted); font-family: var(--mono); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
      .report-card strong { display: block; margin-top: 0.15rem; font-family: var(--mono); font-size: 1.3rem; font-weight: 800; color: var(--text-h); }
      .report-table-wrap { overflow: hidden; }
      .report-table-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 1.25rem 1.5rem 0.5rem; }
      table { width: 100%; border-collapse: collapse; }
      thead th { padding: 0.75rem 1.25rem; border-bottom: 1px solid var(--border); color: var(--muted); font-family: var(--mono); font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em; text-align: left; text-transform: uppercase; }
      tbody td { padding: 0.75rem 1.25rem; border-bottom: 1px solid var(--border); vertical-align: top; font-size: 0.88rem; }
      tbody tr:last-child td { border-bottom: 0; }
      .report-row-open { background: linear-gradient(90deg, var(--accent-soft), transparent 75%); }
      .report-status { display: inline-flex; padding: 0.2rem 0.5rem; border-radius: 4px; font-family: var(--sans); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; border: 1px solid var(--border); }
      .report-status-empty, .report-status-non-working { background: var(--tone-empty-bg); border-color: var(--tone-empty-border); color: var(--tone-empty-text); }
      .report-status-remote-work { background: var(--tone-remote-bg); border-color: var(--tone-remote-border); color: var(--tone-remote-text); }
      .report-status-office { background: var(--tone-office-bg); border-color: var(--tone-office-border); color: var(--tone-office-text); }
      .report-status-vacation { background: var(--tone-vacation-bg); border-color: var(--tone-vacation-border); color: var(--tone-vacation-text); }
      .report-status-sick { background: var(--tone-sick-bg); border-color: var(--tone-sick-border); color: var(--tone-sick-text); }
      .report-status-other { background: var(--tone-other-bg); border-color: var(--tone-other-border); color: var(--tone-other-text); }
      @media print {
        body { background: #ffffff; }
        .report-shell { width: 100%; padding: 0; }
        .report-hero, .report-card, .report-table-wrap { box-shadow: none; }
        .report-row, .report-card { break-inside: avoid; }
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
