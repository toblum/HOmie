import { describe, expect, it } from 'vitest'
import { classifyMonthDays } from './calendarClassification'

describe('classifyMonthDays', () => {
  it('classifies weekday and weekend boundaries', () => {
    const result = classifyMonthDays({
      month: '2026-01',
      federalState: 'BY',
      excludedDays: [],
      overrides: [],
    })

    const friday = result.find((day) => day.date === '2026-01-02')
    const saturday = result.find((day) => day.date === '2026-01-03')

    expect(friday?.kind).toBe('working-day')
    expect(saturday?.kind).toBe('weekend')
  })

  it('resolves public holidays by Bundesland', () => {
    const byResult = classifyMonthDays({
      month: '2026-01',
      federalState: 'BY',
      excludedDays: [],
      overrides: [],
    })
    const nwResult = classifyMonthDays({
      month: '2026-01',
      federalState: 'NW',
      excludedDays: [],
      overrides: [],
    })

    expect(byResult.find((day) => day.date === '2026-01-06')?.kind).toBe(
      'public-holiday',
    )
    expect(nwResult.find((day) => day.date === '2026-01-06')?.kind).toBe(
      'working-day',
    )
  })

  it('treats Ausschlusstag on a weekday as excluded-day', () => {
    const result = classifyMonthDays({
      month: '2026-01',
      federalState: 'BY',
      excludedDays: ['2026-01-07'],
      overrides: [],
    })

    expect(result.find((day) => day.date === '2026-01-07')?.kind).toBe(
      'excluded-day',
    )
  })

  it('keeps excluded-day classification when Ausschlusstag overlaps a public holiday', () => {
    const result = classifyMonthDays({
      month: '2026-01',
      federalState: 'BY',
      excludedDays: ['2026-01-06'],
      overrides: [],
    })

    const day = result.find((entry) => entry.date === '2026-01-06')
    expect(day?.kind).toBe('excluded-day')
    expect(day?.nonWorkingReasons).toEqual(
      expect.arrayContaining(['excluded-day', 'public-holiday']),
    )
  })

  it('converts public holidays to overridden-working-day when overridden', () => {
    const result = classifyMonthDays({
      month: '2026-01',
      federalState: 'BY',
      excludedDays: [],
      overrides: ['2026-01-06'],
    })

    const day = result.find((entry) => entry.date === '2026-01-06')
    expect(day?.kind).toBe('overridden-working-day')
    expect(day?.nonWorkingReasons).toContain('public-holiday')
  })

  it('converts excluded days to overridden-working-day when overridden', () => {
    const result = classifyMonthDays({
      month: '2026-01',
      federalState: 'BY',
      excludedDays: ['2026-01-07'],
      overrides: ['2026-01-07'],
    })

    const day = result.find((entry) => entry.date === '2026-01-07')
    expect(day?.kind).toBe('overridden-working-day')
    expect(day?.nonWorkingReasons).toContain('excluded-day')
  })

  it('handles overlapping rules for overridden non-working days', () => {
    const result = classifyMonthDays({
      month: '2026-01',
      federalState: 'BY',
      excludedDays: ['2026-01-06'],
      overrides: ['2026-01-06'],
    })

    const day = result.find((entry) => entry.date === '2026-01-06')
    expect(day?.kind).toBe('overridden-working-day')
    expect(day?.nonWorkingReasons).toEqual(
      expect.arrayContaining(['excluded-day', 'public-holiday']),
    )
  })

  it('fails explicitly for invalid month input', () => {
    expect(() =>
      classifyMonthDays({
        month: '2026-13',
        federalState: 'BY',
        excludedDays: [],
        overrides: [],
      }),
    ).toThrow('Invalid month value')
  })
})
