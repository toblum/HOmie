import { afterEach, describe, expect, it, vi } from 'vitest'
import { BrowserStorageError, createBrowserStorage } from './browserStorage'

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

function uniqueDatabaseName(): string {
  const dbName = `homie-storage-test-${crypto.randomUUID()}`
  createdDatabases.add(dbName)
  return dbName
}

async function writeRawEntry(dbName: string, value: unknown): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(dbName)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction('entries', 'readwrite')
      transaction.oncomplete = () => {
        db.close()
        resolve()
      }
      transaction.onerror = () => {
        db.close()
        reject(transaction.error)
      }
      transaction.objectStore('entries').put(value as never)
    }
  })
}

describe('createBrowserStorage', () => {
  it('initializes the schema on first load and returns an empty default state', async () => {
    const storage = createBrowserStorage({ dbName: uniqueDatabaseName() })

    await expect(storage.load()).resolves.toEqual({
      schemaVersion: 1,
      entries: [],
      policyHistory: [],
      preferences: {
        language: 'de',
        theme: 'system',
        warningThreshold: 0.8,
      },
      excludedDays: [],
    })
  })

  it('persists and reloads a single day entry', async () => {
    const storage = createBrowserStorage({ dbName: uniqueDatabaseName() })

    await storage.saveDayEntry({
      date: '2026-05-05',
      status: 'other',
      note: 'Focus time',
    })

    await expect(storage.load()).resolves.toMatchObject({
      entries: [
        {
          date: '2026-05-05',
          status: 'other',
          note: 'Focus time',
        },
      ],
    })
  })

  it('persists and reloads the full policy history', async () => {
    const storage = createBrowserStorage({ dbName: uniqueDatabaseName() })

    await storage.savePolicyHistory([
      { effectiveMonth: '2026-01', quota: 0.6, bundesland: 'BY' },
      { effectiveMonth: '2026-04', quota: 0.4, bundesland: 'NW' },
    ])

    await expect(storage.load()).resolves.toMatchObject({
      policyHistory: [
        { effectiveMonth: '2026-01', quota: 0.6, bundesland: 'BY' },
        { effectiveMonth: '2026-04', quota: 0.4, bundesland: 'NW' },
      ],
    })
  })

  it('persists and reloads personal preferences', async () => {
    const storage = createBrowserStorage({ dbName: uniqueDatabaseName() })

    await storage.savePreferences({
      language: 'en',
      theme: 'dark',
      warningThreshold: 0.9,
    })

    await expect(storage.load()).resolves.toMatchObject({
      preferences: {
        language: 'en',
        theme: 'dark',
        warningThreshold: 0.9,
      },
    })
  })

  it('persists and reloads excluded days', async () => {
    const storage = createBrowserStorage({ dbName: uniqueDatabaseName() })

    await storage.saveExcludedDays(['2026-05-01', '2026-05-21'])

    await expect(storage.load()).resolves.toMatchObject({
      excludedDays: ['2026-05-01', '2026-05-21'],
    })
  })

  it('deletes a single day entry so the day becomes unset again', async () => {
    const storage = createBrowserStorage({ dbName: uniqueDatabaseName() })

    await storage.saveDayEntry({
      date: '2026-05-05',
      status: 'office',
      note: 'Desk day',
    })
    await storage.deleteDayEntry('2026-05-05')

    await expect(storage.load()).resolves.toMatchObject({
      entries: [],
    })
  })

  it('exports the full state as a serializable snapshot with schema version', async () => {
    const storage = createBrowserStorage({ dbName: uniqueDatabaseName() })

    await storage.saveDayEntry({ date: '2026-05-05', status: 'vacation', note: 'Trip' })
    await storage.savePolicyHistory([{ effectiveMonth: '2026-01', quota: 0.6, bundesland: 'BY' }])
    await storage.savePreferences({ language: 'en', theme: 'light', warningThreshold: 0.75 })
    await storage.saveExcludedDays(['2026-05-21'])

    await expect(storage.exportState()).resolves.toEqual({
      schemaVersion: 1,
      entries: [{ date: '2026-05-05', status: 'vacation', note: 'Trip' }],
      policyHistory: [{ effectiveMonth: '2026-01', quota: 0.6, bundesland: 'BY' }],
      preferences: {
        language: 'en',
        theme: 'light',
        warningThreshold: 0.75,
      },
      excludedDays: ['2026-05-21'],
    })
  })

  it('restores a snapshot by replacing the entire existing state', async () => {
    const storage = createBrowserStorage({ dbName: uniqueDatabaseName() })

    await storage.saveDayEntry({ date: '2026-05-05', status: 'office', note: 'Old entry' })
    await storage.savePolicyHistory([{ effectiveMonth: '2026-01', quota: 0.6, bundesland: 'BY' }])
    await storage.savePreferences({ language: 'en', theme: 'dark', warningThreshold: 0.9 })
    await storage.saveExcludedDays(['2026-05-21'])

    await storage.restoreState({
      schemaVersion: 1,
      entries: [{ date: '2026-05-12', status: 'remote-work', note: 'New entry' }],
      policyHistory: [{ effectiveMonth: '2026-03', quota: 0.4, bundesland: 'NW' }],
      preferences: {
        language: 'de',
        theme: 'light',
        warningThreshold: 0.7,
      },
      excludedDays: ['2026-05-01'],
    })

    await expect(storage.load()).resolves.toEqual({
      schemaVersion: 1,
      entries: [{ date: '2026-05-12', status: 'remote-work', note: 'New entry' }],
      policyHistory: [{ effectiveMonth: '2026-03', quota: 0.4, bundesland: 'NW' }],
      preferences: {
        language: 'de',
        theme: 'light',
        warningThreshold: 0.7,
      },
      excludedDays: ['2026-05-01'],
    })
  })

  it('throws a clear catchable error when stored entry data is corrupt', async () => {
    const dbName = uniqueDatabaseName()
    const storage = createBrowserStorage({ dbName })

    await storage.load()
    await writeRawEntry(dbName, { date: '2026-05-05', status: 'invalid-status' })

    await expect(storage.load()).rejects.toEqual(
      new BrowserStorageError('Stored entries are corrupt'),
    )
  })

  it('runs migration automatically when the stored schema version is outdated', async () => {
    const dbName = uniqueDatabaseName()
    const v1Storage = createBrowserStorage({ dbName, schemaVersion: 1 })

    await v1Storage.saveDayEntry({ date: '2026-05-05', status: 'office', note: 'Legacy entry' })
    await v1Storage.savePreferences({ language: 'de', theme: 'system', warningThreshold: 0.8 })

    const migrate = vi.fn(({ toVersion, state }) => ({
      ...state,
      schemaVersion: toVersion,
      preferences: {
        ...state.preferences,
        theme: 'dark' as const,
      },
      excludedDays: ['2026-05-21'],
    }))

    const v2Storage = createBrowserStorage({
      dbName,
      schemaVersion: 2,
      migrate,
    })

    await expect(v2Storage.load()).resolves.toEqual({
      schemaVersion: 2,
      entries: [{ date: '2026-05-05', status: 'office', note: 'Legacy entry' }],
      policyHistory: [],
      preferences: {
        language: 'de',
        theme: 'dark',
        warningThreshold: 0.8,
      },
      excludedDays: ['2026-05-21'],
    })

    expect(migrate).toHaveBeenCalledWith({
      fromVersion: 1,
      toVersion: 2,
      state: {
        schemaVersion: 1,
        entries: [{ date: '2026-05-05', status: 'office', note: 'Legacy entry' }],
        policyHistory: [],
        preferences: {
          language: 'de',
          theme: 'system',
          warningThreshold: 0.8,
        },
        excludedDays: [],
      },
    })
  })

  it('throws a clear error when the stored schema version is incompatible and no migration exists', async () => {
    const dbName = uniqueDatabaseName()
    const v1Storage = createBrowserStorage({ dbName, schemaVersion: 1 })

    await v1Storage.saveDayEntry({ date: '2026-05-05', status: 'office' })

    const v2Storage = createBrowserStorage({ dbName, schemaVersion: 2 })

    await expect(v2Storage.load()).rejects.toEqual(
      new BrowserStorageError('Storage schema version 1 is incompatible with expected version 2'),
    )
  })

  it('rejects restore snapshots with an incompatible schema version and leaves state untouched', async () => {
    const storage = createBrowserStorage({ dbName: uniqueDatabaseName(), schemaVersion: 1 })

    await storage.saveDayEntry({ date: '2026-05-05', status: 'office', note: 'Current state' })

    await expect(
      storage.restoreState({
        schemaVersion: 2,
        entries: [{ date: '2026-05-12', status: 'remote-work' }],
        policyHistory: [],
        preferences: {
          language: 'de',
          theme: 'light',
          warningThreshold: 0.8,
        },
        excludedDays: [],
      }),
    ).rejects.toEqual(
      new BrowserStorageError('Restore snapshot schema version 2 is incompatible with expected version 1'),
    )

    await expect(storage.load()).resolves.toMatchObject({
      entries: [{ date: '2026-05-05', status: 'office', note: 'Current state' }],
    })
  })
})