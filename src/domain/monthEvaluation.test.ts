import { describe, expect, it } from 'vitest'
import { classifyMonth } from './calendarClassification'
import { evaluateMonth } from './monthEvaluation'

describe('evaluateMonth', () => {
  it('returns the base month counts for a future month without entries', () => {
    const classifications = classifyMonth({
      year: 2025,
      month: 2,
      bundesland: 'NW',
      ausschlusstage: [],
      ueberschreibungen: [],
    })

    expect(
      evaluateMonth({
        year: 2025,
        month: 2,
        quota: 0.6,
        classifications,
        entries: [],
        today: '2025-01-31',
      }),
    ).toEqual({
      workingDays: 20,
      allowance: 12,
      remoteWorkDays: 0,
      officeDays: 0,
      vacationDays: 0,
      sickDays: 0,
      absenceDays: 0,
      openWorkingDays: 0,
      usagePercentage: 0,
    })
  })

  it('reports full usage when remote-work days exactly match allowance', () => {
    const classifications = classifyMonth({
      year: 2025,
      month: 2,
      bundesland: 'NW',
      ausschlusstage: [],
      ueberschreibungen: [],
    })

    const result = evaluateMonth({
      year: 2025,
      month: 2,
      quota: 0.1,
      classifications,
      entries: [
        { date: '2025-02-03', status: 'remote-work' },
        { date: '2025-02-04', status: 'remote-work' },
      ],
      today: '2025-02-01',
    })

    expect(result.allowance).toBe(2)
    expect(result.remoteWorkDays).toBe(2)
    expect(result.usagePercentage).toBe(100)
  })

  it('reports usage above one hundred percent when remote-work days exceed allowance', () => {
    const classifications = classifyMonth({
      year: 2025,
      month: 2,
      bundesland: 'NW',
      ausschlusstage: [],
      ueberschreibungen: [],
    })

    const result = evaluateMonth({
      year: 2025,
      month: 2,
      quota: 0.1,
      classifications,
      entries: [
        { date: '2025-02-03', status: 'remote-work' },
        { date: '2025-02-04', status: 'remote-work' },
        { date: '2025-02-05', status: 'remote-work' },
      ],
      today: '2025-02-01',
    })

    expect(result.allowance).toBe(2)
    expect(result.remoteWorkDays).toBe(3)
    expect(result.usagePercentage).toBe(150)
  })

  it('reduces the quota base when a working day is marked as vacation', () => {
    const classifications = classifyMonth({
      year: 2025,
      month: 2,
      bundesland: 'NW',
      ausschlusstage: [],
      ueberschreibungen: [],
    })

    expect(
      evaluateMonth({
        year: 2025,
        month: 2,
        quota: 0.6,
        classifications,
        entries: [{ date: '2025-02-03', status: 'vacation' }],
        today: '2025-02-01',
      }),
    ).toMatchObject({
      workingDays: 19,
      allowance: 11,
      vacationDays: 1,
      sickDays: 0,
      absenceDays: 1,
    })
  })

  it('reflects an override by increasing the working-day base and allowance', () => {
    const classifications = classifyMonth({
      year: 2025,
      month: 1,
      bundesland: 'BY',
      ausschlusstage: [],
      ueberschreibungen: ['2025-01-06'],
    })

    expect(
      evaluateMonth({
        year: 2025,
        month: 1,
        quota: 0.6,
        classifications,
        entries: [],
        today: '2024-12-31',
      }),
    ).toMatchObject({
      workingDays: 22,
      allowance: 13,
    })
  })

  it('excludes public holidays from the working-day base when not overridden', () => {
    const classifications = classifyMonth({
      year: 2025,
      month: 1,
      bundesland: 'BY',
      ausschlusstage: [],
      ueberschreibungen: [],
    })

    expect(
      evaluateMonth({
        year: 2025,
        month: 1,
        quota: 0.6,
        classifications,
        entries: [],
        today: '2024-12-31',
      }),
    ).toMatchObject({
      workingDays: 21,
      allowance: 12,
    })
  })

  it('counts only past working days without entries as open working days', () => {
    const classifications = classifyMonth({
      year: 2025,
      month: 1,
      bundesland: 'NW',
      ausschlusstage: [],
      ueberschreibungen: [],
    })

    expect(
      evaluateMonth({
        year: 2025,
        month: 1,
        quota: 0.6,
        classifications,
        entries: [
          { date: '2025-01-10', status: 'office' },
          { date: '2025-01-13', status: 'remote-work' },
        ],
        today: '2025-01-10',
      }),
    ).toMatchObject({
      officeDays: 1,
      remoteWorkDays: 1,
      openWorkingDays: 6,
    })
  })

  it('returns not-applicable when the month has no working days after absences', () => {
    expect(
      evaluateMonth({
        year: 2025,
        month: 1,
        quota: 0.6,
        classifications: [
          { date: '2025-01-01', kind: 'working-day' },
          { date: '2025-01-02', kind: 'working-day' },
        ],
        entries: [
          { date: '2025-01-01', status: 'vacation' },
          { date: '2025-01-02', status: 'sick' },
        ],
        today: '2025-01-03',
      }),
    ).toMatchObject({
      workingDays: 0,
      allowance: 0,
      vacationDays: 1,
      sickDays: 1,
      absenceDays: 2,
      openWorkingDays: 0,
    })
  })
})
