import { openDB, type DBSchema } from 'idb'
import type { DayEntry } from '../domain/monthEvaluation'
import type { PolicyHistoryEntry } from '../domain/policyResolution'
import type { IsoDate, RoundingMode } from '../domain/types'

type DayEntryStatus = DayEntry['status']
type EffectiveMonth = PolicyHistoryEntry['effectiveMonth']
type Bundesland = PolicyHistoryEntry['bundesland']

export interface PersonalPreferences {
  language: 'de' | 'en'
  theme: 'light' | 'dark' | 'system'
  warningThreshold: number
}

export interface BrowserStorageState {
  schemaVersion: number
  entries: DayEntry[]
  policyHistory: PolicyHistoryEntry[]
  preferences: PersonalPreferences
  excludedDays: IsoDate[]
}

export interface BrowserStorage {
  load(): Promise<BrowserStorageState>
  saveDayEntry(entry: DayEntry): Promise<void>
  deleteDayEntry(date: IsoDate): Promise<void>
  savePolicyHistory(policyHistory: PolicyHistoryEntry[]): Promise<void>
  savePreferences(preferences: PersonalPreferences): Promise<void>
  saveExcludedDays(excludedDays: IsoDate[]): Promise<void>
  exportState(): Promise<BrowserStorageState>
  restoreState(state: BrowserStorageState): Promise<void>
}

export interface CreateBrowserStorageOptions {
  dbName?: string
  schemaVersion?: number
  migrate?: (input: {
    fromVersion: number
    toVersion: number
    state: BrowserStorageState
  }) => BrowserStorageState
}

interface BrowserStorageDb extends DBSchema {
  meta: {
    key: string
    value: number | PersonalPreferences | IsoDate[]
  }
  entries: {
    key: string
    value: DayEntry
  }
  policyHistory: {
    key: string
    value: PolicyHistoryEntry
  }
}

const DEFAULT_DB_NAME = 'homie-browser-storage'
const DEFAULT_SCHEMA_VERSION = 2
const DAY_ENTRY_STATUSES = ['remote-work', 'office', 'vacation', 'sick', 'other'] as const
const LANGUAGES = ['de', 'en'] as const
const THEMES = ['light', 'dark', 'system'] as const
export const ROUNDING_MODES: readonly RoundingMode[] = ['floor', 'round', 'ceil'] as const
export const BUNDESLAENDER = [
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
] as const

const DEFAULT_PREFERENCES: PersonalPreferences = {
  language: 'de',
  theme: 'system',
  warningThreshold: 0.8,
}

export class BrowserStorageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BrowserStorageError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isEffectiveMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

function validateDayEntryArray(value: unknown): DayEntry[] {
  if (!Array.isArray(value)) {
    throw new BrowserStorageError('Stored entries are corrupt')
  }

  return value.map((entry) => {
    if (!isRecord(entry) || typeof entry.date !== 'string' || !isIsoDate(entry.date)) {
      throw new BrowserStorageError('Stored entries are corrupt')
    }

    if (
      typeof entry.status !== 'string' ||
      !DAY_ENTRY_STATUSES.includes(entry.status as (typeof DAY_ENTRY_STATUSES)[number])
    ) {
      throw new BrowserStorageError('Stored entries are corrupt')
    }

    if (entry.note !== undefined && typeof entry.note !== 'string') {
      throw new BrowserStorageError('Stored entries are corrupt')
    }

    return {
      date: entry.date,
      status: entry.status as DayEntryStatus,
      ...(entry.note === undefined ? {} : { note: entry.note }),
    }
  })
}

function validatePolicyHistory(value: unknown): PolicyHistoryEntry[] {
  if (!Array.isArray(value)) {
    throw new BrowserStorageError('Stored policy history is corrupt')
  }

  return value.map((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.effectiveMonth !== 'string' ||
      !isEffectiveMonth(entry.effectiveMonth)
    ) {
      throw new BrowserStorageError('Stored policy history is corrupt')
    }

    if (typeof entry.quota !== 'number' || !Number.isFinite(entry.quota)) {
      throw new BrowserStorageError('Stored policy history is corrupt')
    }

    if (
      typeof entry.bundesland !== 'string' ||
      !BUNDESLAENDER.includes(entry.bundesland as (typeof BUNDESLAENDER)[number])
    ) {
      throw new BrowserStorageError('Stored policy history is corrupt')
    }

    const roundingMode =
      entry.roundingMode !== undefined
        ? (entry.roundingMode as RoundingMode)
        : undefined

    if (roundingMode !== undefined && !ROUNDING_MODES.includes(roundingMode)) {
      throw new BrowserStorageError('Stored policy history is corrupt')
    }

    return {
      effectiveMonth: entry.effectiveMonth as EffectiveMonth,
      quota: entry.quota,
      bundesland: entry.bundesland as Bundesland,
      ...(roundingMode !== undefined ? { roundingMode } : {}),
    }
  })
}

function validatePreferences(value: unknown): PersonalPreferences {
  if (!isRecord(value)) {
    throw new BrowserStorageError('Stored preferences are corrupt')
  }

  if (
    typeof value.language !== 'string' ||
    !LANGUAGES.includes(value.language as (typeof LANGUAGES)[number])
  ) {
    throw new BrowserStorageError('Stored preferences are corrupt')
  }

  if (
    typeof value.theme !== 'string' ||
    !THEMES.includes(value.theme as (typeof THEMES)[number])
  ) {
    throw new BrowserStorageError('Stored preferences are corrupt')
  }

  if (
    typeof value.warningThreshold !== 'number' ||
    !Number.isFinite(value.warningThreshold) ||
    value.warningThreshold < 0 ||
    value.warningThreshold > 1
  ) {
    throw new BrowserStorageError('Stored preferences are corrupt')
  }

  return {
    language: value.language as PersonalPreferences['language'],
    theme: value.theme as PersonalPreferences['theme'],
    warningThreshold: value.warningThreshold,
  }
}

function validateExcludedDays(value: unknown): IsoDate[] {
  if (!Array.isArray(value) || value.some((day) => typeof day !== 'string' || !isIsoDate(day))) {
    throw new BrowserStorageError('Stored excluded days are corrupt')
  }

  return [...value]
}

function validateState(value: BrowserStorageState): BrowserStorageState {
  return {
    schemaVersion: value.schemaVersion,
    entries: validateDayEntryArray(value.entries),
    policyHistory: validatePolicyHistory(value.policyHistory),
    preferences: validatePreferences(value.preferences),
    excludedDays: validateExcludedDays(value.excludedDays),
  }
}

function wrapStorageError(error: unknown, message: string): BrowserStorageError {
  if (error instanceof BrowserStorageError) {
    return error
  }

  return new BrowserStorageError(message)
}

async function openStorageDatabase(dbName: string, schemaVersion: number) {
  return openDB<BrowserStorageDb>(dbName, schemaVersion, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta')
      }

      if (!db.objectStoreNames.contains('entries')) {
        db.createObjectStore('entries', { keyPath: 'date' })
      }

      if (!db.objectStoreNames.contains('policyHistory')) {
        db.createObjectStore('policyHistory', { keyPath: 'effectiveMonth' })
      }
    },
  })
}

async function withDatabase<T>(
  dbName: string,
  schemaVersion: number,
  action: (db: Awaited<ReturnType<typeof openStorageDatabase>>) => Promise<T>,
): Promise<T> {
  try {
    const db = await openStorageDatabase(dbName, schemaVersion)

    try {
      return await action(db)
    } finally {
      db.close()
    }
  } catch (error) {
    throw wrapStorageError(error, 'Browser storage is unavailable')
  }
}

async function replacePolicyHistory(
  dbName: string,
  schemaVersion: number,
  policyHistory: PolicyHistoryEntry[],
): Promise<void> {
  await withDatabase(dbName, schemaVersion, async (db) => {
    const transaction = db.transaction(['meta', 'policyHistory'], 'readwrite')
    const metaStore = transaction.objectStore('meta')
    const policyHistoryStore = transaction.objectStore('policyHistory')

    await policyHistoryStore.clear()

    for (const entry of [...policyHistory].sort((left, right) =>
      left.effectiveMonth.localeCompare(right.effectiveMonth),
    )) {
      await policyHistoryStore.put(entry)
    }

    await metaStore.put(schemaVersion, 'schemaVersion')
    await transaction.done
  })
}

async function writeMetaValue(
  dbName: string,
  schemaVersion: number,
  key: 'preferences' | 'excludedDays' | 'schemaVersion',
  value: number | PersonalPreferences | IsoDate[],
): Promise<void> {
  await withDatabase(dbName, schemaVersion, async (db) => {
    const transaction = db.transaction('meta', 'readwrite')
    await transaction.store.put(value, key)
    await transaction.store.put(schemaVersion, 'schemaVersion')
    await transaction.done
  })
}

async function replaceWholeState(
  db: Awaited<ReturnType<typeof openStorageDatabase>>,
  state: BrowserStorageState,
): Promise<void> {
  const transaction = db.transaction(['meta', 'entries', 'policyHistory'], 'readwrite')
  const metaStore = transaction.objectStore('meta')
  const entriesStore = transaction.objectStore('entries')
  const policyHistoryStore = transaction.objectStore('policyHistory')

  await entriesStore.clear()
  await policyHistoryStore.clear()

  for (const entry of [...state.entries].sort((left, right) => left.date.localeCompare(right.date))) {
    await entriesStore.put(entry)
  }

  for (const entry of [...state.policyHistory].sort((left, right) =>
    left.effectiveMonth.localeCompare(right.effectiveMonth),
  )) {
    await policyHistoryStore.put(entry)
  }

  await metaStore.put(state.schemaVersion, 'schemaVersion')
  await metaStore.put(state.preferences, 'preferences')
  await metaStore.put(state.excludedDays, 'excludedDays')
  await transaction.done
}

async function loadStateFromDatabase(
  dbName: string,
  schemaVersion: number,
  migrate?: CreateBrowserStorageOptions['migrate'],
): Promise<BrowserStorageState> {
  return withDatabase(dbName, schemaVersion, async (db) => {
    const transaction = db.transaction(['meta', 'entries', 'policyHistory'], 'readwrite')
    const metaStore = transaction.objectStore('meta')

    const storedSchemaVersion = await metaStore.get('schemaVersion')
    const entries = await transaction.objectStore('entries').getAll()
    const policyHistory = await transaction.objectStore('policyHistory').getAll()
    const preferences = await metaStore.get('preferences')
    const excludedDays = await metaStore.get('excludedDays')

    await transaction.done

    const currentSchemaVersion =
      typeof storedSchemaVersion === 'number' ? storedSchemaVersion : schemaVersion

    const state = {
      schemaVersion: currentSchemaVersion,
      entries: validateDayEntryArray(entries),
      policyHistory: validatePolicyHistory(policyHistory),
      preferences:
        preferences === undefined ? DEFAULT_PREFERENCES : validatePreferences(preferences),
      excludedDays: excludedDays === undefined ? [] : validateExcludedDays(excludedDays),
    }

    if (storedSchemaVersion === undefined) {
      await writeMetaValue(dbName, schemaVersion, 'schemaVersion', schemaVersion)
      return {
        ...state,
        schemaVersion,
      }
    }

    if (currentSchemaVersion === schemaVersion) {
      return state
    }

    if (!migrate) {
      throw new BrowserStorageError(
        `Storage schema version ${currentSchemaVersion} is incompatible with expected version ${schemaVersion}`,
      )
    }

    const migratedState = validateState(
      migrate({
        fromVersion: currentSchemaVersion,
        toVersion: schemaVersion,
        state,
      }),
    )

    const normalizedState = {
      ...migratedState,
      schemaVersion,
    }

    await replaceWholeState(db, normalizedState)

    return normalizedState
  })
}

export function migrateV1ToV2(input: {
  fromVersion: number
  toVersion: number
  state: BrowserStorageState
}): BrowserStorageState {
  return input.state
}

export function createBrowserStorage(
  options: CreateBrowserStorageOptions = {},
): BrowserStorage {
  const dbName = options.dbName ?? DEFAULT_DB_NAME
  const schemaVersion = options.schemaVersion ?? DEFAULT_SCHEMA_VERSION

  return {
    load() {
      return loadStateFromDatabase(dbName, schemaVersion, options.migrate)
    },
    async saveDayEntry(entry) {
      validateDayEntryArray([entry])

      await withDatabase(dbName, schemaVersion, async (db) => {
        const transaction = db.transaction(['meta', 'entries'], 'readwrite')
        await transaction.objectStore('entries').put(entry)
        await transaction.objectStore('meta').put(schemaVersion, 'schemaVersion')
        await transaction.done
      })
    },
    async deleteDayEntry(date) {
      await withDatabase(dbName, schemaVersion, async (db) => {
        const transaction = db.transaction(['meta', 'entries'], 'readwrite')
        await transaction.objectStore('entries').delete(date)
        await transaction.objectStore('meta').put(schemaVersion, 'schemaVersion')
        await transaction.done
      })
    },
    async savePolicyHistory(policyHistory) {
      validatePolicyHistory(policyHistory)
      await replacePolicyHistory(dbName, schemaVersion, policyHistory)
    },
    async savePreferences(preferences) {
      validatePreferences(preferences)
      await writeMetaValue(dbName, schemaVersion, 'preferences', preferences)
    },
    async saveExcludedDays(excludedDays) {
      validateExcludedDays(excludedDays)
      await writeMetaValue(dbName, schemaVersion, 'excludedDays', excludedDays)
    },
    async exportState() {
      return loadStateFromDatabase(dbName, schemaVersion, options.migrate)
    },
    async restoreState(state) {
      if (state.schemaVersion !== schemaVersion) {
        throw new BrowserStorageError(
          `Restore snapshot schema version ${state.schemaVersion} is incompatible with expected version ${schemaVersion}`,
        )
      }

      const normalizedState = validateState({
        ...state,
      })

      await withDatabase(dbName, schemaVersion, async (db) => {
        await replaceWholeState(db, normalizedState)
      })
    },
  }
}