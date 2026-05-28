import { describe, expect, it } from 'vitest'
import { resolvePolicyForMonth } from './policyResolution'

describe('resolvePolicyForMonth', () => {
  it('uses a single Regelverlauf entry for later months', () => {
    expect(
      resolvePolicyForMonth({
        targetMonth: '2025-06',
        policyHistory: [
          {
            effectiveMonth: '2025-01',
            quota: 0.6,
            bundesland: 'NW',
          },
        ],
      }),
    ).toEqual({
      effectiveMonth: '2025-01',
      quota: 0.6,
      bundesland: 'NW',
    })
  })

  it('picks the new entry exactly at the Wirksamkeitsmonat boundary', () => {
    expect(
      resolvePolicyForMonth({
        targetMonth: '2025-07',
        policyHistory: [
          {
            effectiveMonth: '2025-01',
            quota: 0.6,
            bundesland: 'NW',
          },
          {
            effectiveMonth: '2025-07',
            quota: 0.4,
            bundesland: 'BY',
          },
        ],
      }),
    ).toEqual({
      effectiveMonth: '2025-07',
      quota: 0.4,
      bundesland: 'BY',
    })
  })

  it('keeps the previous entry before the next Wirksamkeitsmonat starts', () => {
    expect(
      resolvePolicyForMonth({
        targetMonth: '2025-06',
        policyHistory: [
          {
            effectiveMonth: '2025-01',
            quota: 0.6,
            bundesland: 'NW',
          },
          {
            effectiveMonth: '2025-07',
            quota: 0.4,
            bundesland: 'BY',
          },
        ],
      }),
    ).toEqual({
      effectiveMonth: '2025-01',
      quota: 0.6,
      bundesland: 'NW',
    })
  })

  it('fails explicitly when the target month is before all entries', () => {
    expect(() =>
      resolvePolicyForMonth({
        targetMonth: '2024-12',
        policyHistory: [
          {
            effectiveMonth: '2025-01',
            quota: 0.6,
            bundesland: 'NW',
          },
        ],
      }),
    ).toThrow('No policy history entry applies to 2024-12')
  })

  it('handles entries supplied out of chronological order', () => {
    expect(
      resolvePolicyForMonth({
        targetMonth: '2025-08',
        policyHistory: [
          {
            effectiveMonth: '2025-07',
            quota: 0.4,
            bundesland: 'BY',
          },
          {
            effectiveMonth: '2025-01',
            quota: 0.6,
            bundesland: 'NW',
          },
        ],
      }),
    ).toEqual({
      effectiveMonth: '2025-07',
      quota: 0.4,
      bundesland: 'BY',
    })
  })
})
