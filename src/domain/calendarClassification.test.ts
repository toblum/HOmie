import { describe, expect, it } from 'vitest'
import { classifyMonth } from './calendarClassification'
import type { DayClassification } from './types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function find(days: DayClassification[], isoDate: string): DayClassification {
  const day = days.find((d) => d.date === isoDate)
  if (!day) throw new Error(`Date ${isoDate} not found in result`)
  return day
}

// ---------------------------------------------------------------------------
// Weekday / Weekend boundary
// ---------------------------------------------------------------------------

describe('weekday / weekend boundary', () => {
  // January 2025: 1 = Wednesday, 4 = Saturday, 5 = Sunday, 6 = Monday
  const days = classifyMonth({
    year: 2025,
    month: 1,
    bundesland: 'BE', // Berlin — few extra holidays; clear baseline
    ausschlusstage: [],
    ueberschreibungen: [],
  })

  it('has 31 entries for January 2025', () => {
    expect(days).toHaveLength(31)
  })

  it('classifies a Monday as working-day', () => {
    expect(find(days, '2025-01-06').kind).toBe('working-day')
  })

  it('classifies a Saturday as weekend', () => {
    expect(find(days, '2025-01-04').kind).toBe('weekend')
  })

  it('classifies a Sunday as weekend', () => {
    expect(find(days, '2025-01-05').kind).toBe('weekend')
  })
})

// ---------------------------------------------------------------------------
// Public holiday — Bundesland BY
// ---------------------------------------------------------------------------

describe('public holiday — Bayern (BY)', () => {
  // 6 January is Heilige Drei Könige in BY but NOT in NW
  const daysBY = classifyMonth({
    year: 2025,
    month: 1,
    bundesland: 'BY',
    ausschlusstage: [],
    ueberschreibungen: [],
  })

  it('classifies 6 Jan 2025 as public-holiday in BY', () => {
    const day = find(daysBY, '2025-01-06')
    expect(day.kind).toBe('public-holiday')
    expect(day.holidayName).toBeTruthy()
  })

  it('classifies New Year (1 Jan) as public-holiday in BY', () => {
    expect(find(daysBY, '2025-01-01').kind).toBe('public-holiday')
  })
})

// ---------------------------------------------------------------------------
// Public holiday — Bundesland NW
// ---------------------------------------------------------------------------

describe('public holiday — Nordrhein-Westfalen (NW)', () => {
  // 6 January is NOT a public holiday in NW
  const daysNW = classifyMonth({
    year: 2025,
    month: 1,
    bundesland: 'NW',
    ausschlusstage: [],
    ueberschreibungen: [],
  })

  it('classifies 6 Jan 2025 as working-day in NW (not a public holiday there)', () => {
    expect(find(daysNW, '2025-01-06').kind).toBe('working-day')
  })

  it('classifies New Year (1 Jan) as public-holiday in NW', () => {
    expect(find(daysNW, '2025-01-01').kind).toBe('public-holiday')
  })

  // Tag der Arbeit — 1 May — is a public holiday everywhere in Germany
  const daysMay = classifyMonth({
    year: 2025,
    month: 5,
    bundesland: 'NW',
    ausschlusstage: [],
    ueberschreibungen: [],
  })

  it('classifies 1 May 2025 (Tag der Arbeit) as public-holiday in NW', () => {
    const day = find(daysMay, '2025-05-01')
    expect(day.kind).toBe('public-holiday')
    expect(day.holidayName).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Ausschlusstag on a weekday
// ---------------------------------------------------------------------------

describe('Ausschlusstag on a plain weekday', () => {
  // 7 January 2025 is a Tuesday — a plain working day in NW
  const days = classifyMonth({
    year: 2025,
    month: 1,
    bundesland: 'NW',
    ausschlusstage: ['2025-01-07'],
    ueberschreibungen: [],
  })

  it('classifies 7 Jan 2025 as excluded-day', () => {
    expect(find(days, '2025-01-07').kind).toBe('excluded-day')
  })

  it('does not affect the adjacent working day (8 Jan)', () => {
    expect(find(days, '2025-01-08').kind).toBe('working-day')
  })
})

// ---------------------------------------------------------------------------
// Ausschlusstag on a public holiday
// ---------------------------------------------------------------------------

describe('Ausschlusstag on a public holiday', () => {
  // 1 January is already a public holiday; adding it to ausschlusstage too
  // — public holiday takes priority over excluded-day.
  const days = classifyMonth({
    year: 2025,
    month: 1,
    bundesland: 'NW',
    ausschlusstage: ['2025-01-01'],
    ueberschreibungen: [],
  })

  it('classifies 1 Jan 2025 as public-holiday even when it is also in ausschlusstage', () => {
    expect(find(days, '2025-01-01').kind).toBe('public-holiday')
  })
})

// ---------------------------------------------------------------------------
// Überschreibung of a public holiday
// ---------------------------------------------------------------------------

describe('Überschreibung of a public holiday', () => {
  // 6 January 2025 is Heilige Drei Könige in BY (a Monday)
  const days = classifyMonth({
    year: 2025,
    month: 1,
    bundesland: 'BY',
    ausschlusstage: [],
    ueberschreibungen: ['2025-01-06'],
  })

  it('classifies 6 Jan 2025 as overridden-working-day', () => {
    expect(find(days, '2025-01-06').kind).toBe('overridden-working-day')
  })

  it('preserves the original non-working reason as public-holiday', () => {
    expect(find(days, '2025-01-06').originalNonWorkingReason).toBe('public-holiday')
  })

  it('preserves the holiday name', () => {
    expect(find(days, '2025-01-06').holidayName).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Überschreibung of an Ausschlusstag
// ---------------------------------------------------------------------------

describe('Überschreibung of an Ausschlusstag', () => {
  // 7 Jan 2025 — Tuesday in NW; mark as ausschlusstag and override it
  const days = classifyMonth({
    year: 2025,
    month: 1,
    bundesland: 'NW',
    ausschlusstage: ['2025-01-07'],
    ueberschreibungen: ['2025-01-07'],
  })

  it('classifies 7 Jan 2025 as overridden-working-day', () => {
    expect(find(days, '2025-01-07').kind).toBe('overridden-working-day')
  })

  it('preserves the original non-working reason as excluded-day', () => {
    expect(find(days, '2025-01-07').originalNonWorkingReason).toBe('excluded-day')
  })
})

// ---------------------------------------------------------------------------
// Überschreibung of a weekend day
// ---------------------------------------------------------------------------

describe('Überschreibung of a weekend day', () => {
  // 4 Jan 2025 is a Saturday
  const days = classifyMonth({
    year: 2025,
    month: 1,
    bundesland: 'NW',
    ausschlusstage: [],
    ueberschreibungen: ['2025-01-04'],
  })

  it('classifies Saturday 4 Jan 2025 as overridden-working-day', () => {
    expect(find(days, '2025-01-04').kind).toBe('overridden-working-day')
  })

  it('preserves the original non-working reason as weekend', () => {
    expect(find(days, '2025-01-04').originalNonWorkingReason).toBe('weekend')
  })
})

// ---------------------------------------------------------------------------
// Überschreibung of a plain working day — should be a no-op
// ---------------------------------------------------------------------------

describe('Überschreibung of a plain working day (no-op)', () => {
  // 6 Jan 2025 is a plain working day in NW (not a public holiday there)
  const days = classifyMonth({
    year: 2025,
    month: 1,
    bundesland: 'NW',
    ausschlusstage: [],
    ueberschreibungen: ['2025-01-06'],
  })

  it('leaves a plain working day as working-day when it appears in ueberschreibungen', () => {
    expect(find(days, '2025-01-06').kind).toBe('working-day')
  })

  it('does not set originalNonWorkingReason on a plain working day', () => {
    expect(find(days, '2025-01-06').originalNonWorkingReason).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Overlapping rules — Ausschlusstag AND Überschreibung on a public holiday
// ---------------------------------------------------------------------------

describe('overlapping rules — Ausschlusstag + Überschreibung on a public holiday', () => {
  // 1 Jan 2025 is in ausschlusstage AND ueberschreibungen AND is a public holiday
  const days = classifyMonth({
    year: 2025,
    month: 1,
    bundesland: 'NW',
    ausschlusstage: ['2025-01-01'],
    ueberschreibungen: ['2025-01-01'],
  })

  it('classifies 1 Jan 2025 as overridden-working-day', () => {
    expect(find(days, '2025-01-01').kind).toBe('overridden-working-day')
  })

  it('preserves original non-working reason as public-holiday (public holiday wins over excluded-day)', () => {
    expect(find(days, '2025-01-01').originalNonWorkingReason).toBe('public-holiday')
  })

  it('preserves the holiday name', () => {
    expect(find(days, '2025-01-01').holidayName).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Module returns only days from the requested month
// ---------------------------------------------------------------------------

describe('classifyMonth returns exactly the days of the requested month', () => {
  it('returns 28 entries for February 2025 (non-leap year)', () => {
    const days = classifyMonth({
      year: 2025,
      month: 2,
      bundesland: 'BY',
      ausschlusstage: [],
      ueberschreibungen: [],
    })
    expect(days).toHaveLength(28)
    expect(days[0].date).toBe('2025-02-01')
    expect(days[27].date).toBe('2025-02-28')
  })

  it('returns 29 entries for February 2024 (leap year)', () => {
    const days = classifyMonth({
      year: 2024,
      month: 2,
      bundesland: 'BY',
      ausschlusstage: [],
      ueberschreibungen: [],
    })
    expect(days).toHaveLength(29)
  })

  it('ignores ausschlusstage that fall outside the requested month', () => {
    const days = classifyMonth({
      year: 2025,
      month: 1,
      bundesland: 'NW',
      ausschlusstage: ['2025-02-10'], // outside January
      ueberschreibungen: [],
    })
    expect(days.every((d) => d.kind !== 'excluded-day')).toBe(true)
  })
})
