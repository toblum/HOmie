import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import {
  CorruptStorageDataError,
  StorageUnavailableError,
  createBrowserStorage,
  type AppStateSnapshot,
} from './browserStorage'

describe('createBrowserStorage', () => {
  let sequence = 0
  const createTestStorage = () => {
    sequence += 1
    return createBrowserStorage({ dbName: `HOmie-test-${sequence}` })
  }

  it('initializes database and schema version on first load', async () => {
    const storage = createTestStorage()

    const snapshot = await storage.loadAll()

    expect(snapshot.schemaVersion).toBeGreaterThan(0)
    expect(snapshot.preferences).toEqual({
      language: 'de',
      theme: 'system',
      warningThreshold: 0.8,
    })
    expect(snapshot.entries).toEqual({})
  })

  it('throws clear error when storage is unavailable', () => {
    const originalIndexedDb = globalThis.indexedDB
    // @ts-expect-error test intentionally removes indexedDB
    globalThis.indexedDB = undefined

    expect(() => createBrowserStorage()).toThrow(StorageUnavailableError)

    globalThis.indexedDB = originalIndexedDb
  })

  it('persists and reloads day entries', async () => {
    const storage = createTestStorage()
    await storage.saveDayEntry('2026-01-07', { status: 'office' })

    const snapshot = await storage.loadAll()

    expect(snapshot.entries['2026-01-07']).toEqual({ status: 'office' })
  })

  it('persists and reloads policy history', async () => {
    const storage = createTestStorage()
    await storage.savePolicyHistory([
      { effectiveMonth: '2026-01', quota: 0.6, federalState: 'BY' },
      { effectiveMonth: '2026-04', quota: 0.5, federalState: 'NW' },
    ])

    const snapshot = await storage.loadAll()

    expect(snapshot.policyHistory).toEqual([
      { effectiveMonth: '2026-01', quota: 0.6, federalState: 'BY' },
      { effectiveMonth: '2026-04', quota: 0.5, federalState: 'NW' },
    ])
  })

  it('persists and reloads preferences', async () => {
    const storage = createTestStorage()
    await storage.savePreferences({
      language: 'en',
      theme: 'dark',
      warningThreshold: 0.9,
    })

    const snapshot = await storage.loadAll()

    expect(snapshot.preferences).toEqual({
      language: 'en',
      theme: 'dark',
      warningThreshold: 0.9,
    })
  })

  it('supports full export and restore round-trip', async () => {
    const storage = createTestStorage()
    await storage.saveDayEntry('2026-01-07', { status: 'office' })
    await storage.savePolicyHistory([
      { effectiveMonth: '2026-01', quota: 0.6, federalState: 'BY' },
    ])
    await storage.savePreferences({
      language: 'en',
      theme: 'light',
      warningThreshold: 0.7,
    })
    await storage.saveExcludedDays(['2026-01-08'])

    const exported = await storage.exportJson()
    const restoredStorage = createTestStorage()
    await restoredStorage.restoreFromJson(exported)
    const restored = await restoredStorage.loadAll()

    expect(restored).toEqual(exported)
  })

  it('restore replaces existing state (no merge)', async () => {
    const storage = createTestStorage()
    await storage.saveDayEntry('2026-01-07', { status: 'office' })

    const replacement: AppStateSnapshot = {
      schemaVersion: 2,
      preferences: {
        language: 'de',
        theme: 'system',
        warningThreshold: 0.8,
      },
      policyHistory: [{ effectiveMonth: '2026-01', quota: 0.6, federalState: 'BY' }],
      entries: {
        '2026-01-09': { status: 'remote-work' },
      },
      excludedDays: ['2026-01-10'],
    }

    await storage.restoreFromJson(replacement)
    const snapshot = await storage.loadAll()

    expect(snapshot.entries['2026-01-07']).toBeUndefined()
    expect(snapshot.entries['2026-01-09']).toEqual({ status: 'remote-work' })
    expect(snapshot.excludedDays).toEqual(['2026-01-10'])
  })

  it('throws clear error for corrupt data payload during restore', async () => {
    const storage = createTestStorage()

    await expect(
      storage.restoreFromJson({
        schemaVersion: 2,
        preferences: {
          language: 'de',
          theme: 'system',
          warningThreshold: 0.8,
        },
        policyHistory: [],
        entries: {
          '2026-01-01': { status: 'invalid-status' as 'office' },
        },
        excludedDays: [],
      }),
    ).rejects.toBeInstanceOf(CorruptStorageDataError)
  })

  it('handles schema version mismatch by migrating to current version on load', async () => {
    const storage = createTestStorage()
    await storage.restoreFromJson({
      schemaVersion: 1,
      preferences: {
        language: 'de',
        theme: 'system',
        warningThreshold: 0.8,
      },
      policyHistory: [],
      entries: {},
      excludedDays: [],
    })

    const snapshot = await storage.loadAll()

    expect(snapshot.schemaVersion).toBe(2)
  })
})
