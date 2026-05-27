import { describe, expect, it } from 'vitest'
import { classifyMonthDays } from './calendarClassification'
import { evaluateMonth } from './monthEvaluation'
import type { DayClassification } from './calendarClassification'

describe('evaluateMonth', () => {
  it('returns counts for month with no entries', () => {
    const dayClassifications = classifyMonthDays({
      month: '2026-01',
      federalState: 'BY',
      excludedDays: [],
      overrides: [],
    })

    const result = evaluateMonth({
      month: '2026-01',
      dayClassifications,
      entries: {},
      quota: 0.6,
      today: '2026-02-01',
    })

    expect(result.workingDays).toBeGreaterThan(0)
    expect(result.remoteWorkDays).toBe(0)
    expect(result.officeDays).toBe(0)
    expect(result.absenceDays).toBe(0)
    expect(result.openWorkingDays).toBe(result.workingDays)
    expect(result.monthlyStatus).toBe('normal')
  })

  it('is normal exactly at allowance', () => {
    const dayClassifications = classifyMonthDays({
      month: '2026-01',
      federalState: 'BY',
      excludedDays: [],
      overrides: [],
    })
    const entries: Record<string, { status: 'remote-work' }> = {
      '2026-01-02': { status: 'remote-work' },
      '2026-01-05': { status: 'remote-work' },
      '2026-01-07': { status: 'remote-work' },
      '2026-01-08': { status: 'remote-work' },
      '2026-01-09': { status: 'remote-work' },
      '2026-01-12': { status: 'remote-work' },
      '2026-01-13': { status: 'remote-work' },
      '2026-01-14': { status: 'remote-work' },
      '2026-01-15': { status: 'remote-work' },
      '2026-01-16': { status: 'remote-work' },
      '2026-01-19': { status: 'remote-work' },
      '2026-01-20': { status: 'remote-work' },
    }

    const result = evaluateMonth({
      month: '2026-01',
      dayClassifications,
      entries,
      quota: 0.6,
      today: '2026-02-01',
    })

    expect(result.remoteWorkDays).toBe(result.allowance)
    expect(result.monthlyStatus).toBe('normal')
  })

  it('is over-limit one day above allowance', () => {
    const dayClassifications = classifyMonthDays({
      month: '2026-01',
      federalState: 'BY',
      excludedDays: [],
      overrides: [],
    })
    const entries: Record<string, { status: 'remote-work' }> = {
      '2026-01-02': { status: 'remote-work' },
      '2026-01-05': { status: 'remote-work' },
      '2026-01-07': { status: 'remote-work' },
      '2026-01-08': { status: 'remote-work' },
      '2026-01-09': { status: 'remote-work' },
      '2026-01-12': { status: 'remote-work' },
      '2026-01-13': { status: 'remote-work' },
      '2026-01-14': { status: 'remote-work' },
      '2026-01-15': { status: 'remote-work' },
      '2026-01-16': { status: 'remote-work' },
      '2026-01-19': { status: 'remote-work' },
      '2026-01-20': { status: 'remote-work' },
      '2026-01-21': { status: 'remote-work' },
    }

    const result = evaluateMonth({
      month: '2026-01',
      dayClassifications,
      entries,
      quota: 0.6,
      today: '2026-02-01',
    })

    expect(result.remoteWorkDays).toBe(result.allowance + 1)
    expect(result.monthlyStatus).toBe('over-limit')
  })

  it('excludes absences from working days and allowance base', () => {
    const dayClassifications = classifyMonthDays({
      month: '2026-01',
      federalState: 'BY',
      excludedDays: [],
      overrides: [],
    })

    const withoutAbsence = evaluateMonth({
      month: '2026-01',
      dayClassifications,
      entries: {},
      quota: 0.6,
      today: '2026-02-01',
    })
    const withAbsence = evaluateMonth({
      month: '2026-01',
      dayClassifications,
      entries: {
        '2026-01-07': { status: 'vacation' },
      },
      quota: 0.6,
      today: '2026-02-01',
    })

    expect(withAbsence.absenceVacationDays).toBe(1)
    expect(withAbsence.workingDays).toBe(withoutAbsence.workingDays - 1)
    expect(withAbsence.allowance).toBeLessThanOrEqual(withoutAbsence.allowance)
  })

  it('includes overrides as working days for allowance base', () => {
    const withoutOverride = classifyMonthDays({
      month: '2026-01',
      federalState: 'BY',
      excludedDays: [],
      overrides: [],
    })
    const withOverride = classifyMonthDays({
      month: '2026-01',
      federalState: 'BY',
      excludedDays: [],
      overrides: ['2026-01-06'],
    })

    const withoutOverrideResult = evaluateMonth({
      month: '2026-01',
      dayClassifications: withoutOverride,
      entries: {},
      quota: 0.6,
      today: '2026-02-01',
    })
    const withOverrideResult = evaluateMonth({
      month: '2026-01',
      dayClassifications: withOverride,
      entries: {},
      quota: 0.6,
      today: '2026-02-01',
    })

    expect(withOverrideResult.workingDays).toBe(withoutOverrideResult.workingDays + 1)
    expect(withOverrideResult.allowance).toBeGreaterThanOrEqual(
      withoutOverrideResult.allowance,
    )
  })

  it('keeps public holidays out of working-day count by default', () => {
    const dayClassifications = classifyMonthDays({
      month: '2026-01',
      federalState: 'BY',
      excludedDays: [],
      overrides: [],
    })

    expect(
      dayClassifications.find((day) => day.date === '2026-01-06')?.kind,
    ).toBe('public-holiday')

    const result = evaluateMonth({
      month: '2026-01',
      dayClassifications,
      entries: {},
      quota: 0.6,
      today: '2026-02-01',
    })

    expect(result.workingDays).toBeLessThan(dayClassifications.length)
  })

  it('counts open working days only in the past (today is booking boundary)', () => {
    const dayClassifications = classifyMonthDays({
      month: '2026-01',
      federalState: 'BY',
      excludedDays: [],
      overrides: [],
    })

    const result = evaluateMonth({
      month: '2026-01',
      dayClassifications,
      entries: {},
      quota: 0.6,
      today: '2026-01-15',
    })

    expect(result.openWorkingDays).toBeGreaterThan(0)
    expect(result.openWorkingDays).toBeLessThan(result.workingDays)
  })

  it('does not count today or future working days as open', () => {
    const dayClassifications: DayClassification[] = [
      {
        date: '2026-01-14',
        kind: 'working-day',
        nonWorkingReasons: [],
      },
      {
        date: '2026-01-15',
        kind: 'working-day',
        nonWorkingReasons: [],
      },
      {
        date: '2026-01-16',
        kind: 'working-day',
        nonWorkingReasons: [],
      },
    ]

    const result = evaluateMonth({
      month: '2026-01',
      dayClassifications,
      entries: {},
      quota: 0.6,
      today: '2026-01-15',
    })

    expect(result.openWorkingDays).toBe(1)
  })

  it('returns monthly status including warning and not-applicable', () => {
    const oneWorkingDayClassification: DayClassification[] = [
      {
        date: '2026-01-02',
        kind: 'working-day',
        nonWorkingReasons: [],
      },
    ]

    const warningResult = evaluateMonth({
      month: '2026-01',
      dayClassifications: [...oneWorkingDayClassification],
      entries: {
        '2026-01-02': { status: 'remote-work' },
      },
      quota: 1,
      today: '2026-02-01',
      warningThreshold: 0.5,
    })

    const notApplicableResult = evaluateMonth({
      month: '2026-01',
      dayClassifications: [
        {
          date: '2026-01-03',
          kind: 'weekend',
          nonWorkingReasons: ['weekend'],
        },
      ],
      entries: {},
      quota: 0.6,
      today: '2026-02-01',
    })

    expect(warningResult.monthlyStatus).toBe('warning')
    expect(notApplicableResult.monthlyStatus).toBe('not-applicable')
  })
})
