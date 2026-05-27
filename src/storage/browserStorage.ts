import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { DayEntry } from '../domain/monthEvaluation'
import type { PolicyHistoryEntry } from '../domain/policyResolution'

const DB_NAME = 'HOmie'
const DB_VERSION = 2
const PREFERENCES_KEY = 'preferences'
const META_SCHEMA_VERSION_KEY = 'schemaVersion'

export interface Preferences {
  language: 'de' | 'en'
  theme: 'light' | 'dark' | 'system'
  warningThreshold: number
}

export interface AppStateSnapshot {
  schemaVersion: number
  preferences: Preferences
  policyHistory: PolicyHistoryEntry[]
  entries: Record<string, DayEntry>
  excludedDays: string[]
}

interface HOmieDB extends DBSchema {
  entries: {
    key: string
    value: { date: string; entry: DayEntry }
  }
  policyHistory: {
    key: string
    value: PolicyHistoryEntry
  }
  preferences: {
    key: string
    value: Preferences
  }
  excludedDays: {
    key: string
    value: { date: string }
  }
  meta: {
    key: string
    value: { key: string; value: number }
  }
}

export class StorageUnavailableError extends Error {}
export class CorruptStorageDataError extends Error {}

interface BrowserStorageOptions {
  dbName?: string
  dbVersion?: number
}

export function createBrowserStorage(options: BrowserStorageOptions = {}) {
  if (!globalThis.indexedDB) {
    throw new StorageUnavailableError('IndexedDB is not available in this browser.')
  }

  const dbName = options.dbName ?? DB_NAME
  const dbVersion = options.dbVersion ?? DB_VERSION
  let dbPromise: Promise<IDBPDatabase<HOmieDB>> | undefined

  const getDb = () => {
    if (!dbPromise) {
      dbPromise = openDB<HOmieDB>(dbName, dbVersion, {
        upgrade(db, oldVersion, _newVersion, transaction) {
          if (!db.objectStoreNames.contains('entries')) {
            db.createObjectStore('entries', { keyPath: 'date' })
          }
          if (!db.objectStoreNames.contains('policyHistory')) {
            db.createObjectStore('policyHistory', { keyPath: 'effectiveMonth' })
          }
          if (!db.objectStoreNames.contains('preferences')) {
            db.createObjectStore('preferences')
          }
          if (!db.objectStoreNames.contains('excludedDays')) {
            db.createObjectStore('excludedDays', { keyPath: 'date' })
          }
          if (!db.objectStoreNames.contains('meta')) {
            db.createObjectStore('meta')
          }

          const metaStore = transaction.objectStore('meta')
          metaStore.put(
            { key: META_SCHEMA_VERSION_KEY, value: dbVersion },
            META_SCHEMA_VERSION_KEY,
          )

          if (oldVersion === 0) {
            const preferencesStore = transaction.objectStore('preferences')
            preferencesStore.put(defaultPreferences(), PREFERENCES_KEY)
          }
        },
      })
    }
    return dbPromise
  }

  const ensureSchemaVersion = async (db: IDBPDatabase<HOmieDB>) => {
    await db.put('meta', { key: META_SCHEMA_VERSION_KEY, value: dbVersion }, META_SCHEMA_VERSION_KEY)
  }

  return {
    async loadAll(): Promise<AppStateSnapshot> {
      const db = await getDb()
      await ensureSchemaVersion(db)

      const [entriesRows, policyHistoryRows, preferences, excludedRows] = await Promise.all([
        db.getAll('entries'),
        db.getAll('policyHistory'),
        db.get('preferences', PREFERENCES_KEY),
        db.getAll('excludedDays'),
      ])

      const validatedPreferences = validatePreferences(preferences)
      const entries = entriesRows.reduce<Record<string, DayEntry>>((acc, row) => {
        acc[row.date] = validateDayEntry(row.entry, row.date)
        return acc
      }, {})
      const policyHistory = policyHistoryRows.map(validatePolicyHistoryEntry)
      const excludedDays = excludedRows.map((row) => row.date)

      return {
        schemaVersion: dbVersion,
        preferences: validatedPreferences,
        policyHistory,
        entries,
        excludedDays,
      }
    },

    async saveDayEntry(date: string, entry: DayEntry): Promise<void> {
      const db = await getDb()
      await db.put('entries', { date, entry: validateDayEntry(entry, date) })
    },

    async deleteDayEntry(date: string): Promise<void> {
      const db = await getDb()
      await db.delete('entries', date)
    },

    async savePolicyHistory(policyHistory: PolicyHistoryEntry[]): Promise<void> {
      const db = await getDb()
      const tx = db.transaction('policyHistory', 'readwrite')
      await tx.store.clear()
      for (const entry of policyHistory.map(validatePolicyHistoryEntry)) {
        await tx.store.put(entry)
      }
      await tx.done
    },

    async savePreferences(preferences: Preferences): Promise<void> {
      const db = await getDb()
      await db.put('preferences', validatePreferences(preferences), PREFERENCES_KEY)
    },

    async saveExcludedDays(excludedDays: string[]): Promise<void> {
      const db = await getDb()
      const tx = db.transaction('excludedDays', 'readwrite')
      await tx.store.clear()
      for (const date of excludedDays) {
        await tx.store.put({ date })
      }
      await tx.done
    },

    async exportJson(): Promise<AppStateSnapshot> {
      return this.loadAll()
    },

    async restoreFromJson(snapshot: AppStateSnapshot): Promise<void> {
      validateSnapshot(snapshot)
      const db = await getDb()
      const tx = db.transaction(
        ['entries', 'policyHistory', 'preferences', 'excludedDays', 'meta'],
        'readwrite',
      )

      await Promise.all([
        tx.objectStore('entries').clear(),
        tx.objectStore('policyHistory').clear(),
        tx.objectStore('excludedDays').clear(),
      ])

      for (const [date, entry] of Object.entries(snapshot.entries)) {
        await tx.objectStore('entries').put({ date, entry: validateDayEntry(entry, date) })
      }
      for (const entry of snapshot.policyHistory.map(validatePolicyHistoryEntry)) {
        await tx.objectStore('policyHistory').put(entry)
      }
      await tx.objectStore('preferences').put(
        validatePreferences(snapshot.preferences),
        PREFERENCES_KEY,
      )
      for (const date of snapshot.excludedDays) {
        await tx.objectStore('excludedDays').put({ date })
      }
      await tx.objectStore('meta').put(
        { key: META_SCHEMA_VERSION_KEY, value: dbVersion },
        META_SCHEMA_VERSION_KEY,
      )

      await tx.done
    },

    async clearAll(): Promise<void> {
      const db = await getDb()
      db.close()
      dbPromise = undefined
      await deleteDB(dbName)
    },
  }
}

function defaultPreferences(): Preferences {
  return {
    language: 'de',
    theme: 'system',
    warningThreshold: 0.8,
  }
}

function validateDayEntry(entry: DayEntry, date: string): DayEntry {
  const statuses = ['remote-work', 'office', 'vacation', 'sick']
  if (!statuses.includes(entry.status)) {
    throw new CorruptStorageDataError(`Invalid day entry status at "${date}".`)
  }
  return entry
}

function validatePolicyHistoryEntry(entry: PolicyHistoryEntry): PolicyHistoryEntry {
  if (!entry || !entry.effectiveMonth || typeof entry.quota !== 'number' || !entry.federalState) {
    throw new CorruptStorageDataError('Invalid policyHistory entry found in storage.')
  }
  return entry
}

function validatePreferences(preferences: Preferences | undefined): Preferences {
  if (!preferences) {
    return defaultPreferences()
  }

  if (
    (preferences.language !== 'de' && preferences.language !== 'en') ||
    !['light', 'dark', 'system'].includes(preferences.theme) ||
    typeof preferences.warningThreshold !== 'number'
  ) {
    throw new CorruptStorageDataError('Invalid preferences found in storage.')
  }

  return preferences
}

function validateSnapshot(snapshot: AppStateSnapshot): void {
  if (!snapshot || typeof snapshot.schemaVersion !== 'number') {
    throw new CorruptStorageDataError('Invalid JSON restore payload: schemaVersion is required.')
  }
}
