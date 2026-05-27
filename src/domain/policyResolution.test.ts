import { describe, expect, it } from 'vitest'
import { resolvePolicyForMonth } from './policyResolution'

describe('resolvePolicyForMonth', () => {
  it('uses a single entry for all later months', () => {
    const result = resolvePolicyForMonth('2026-12', [
      { effectiveMonth: '2026-01', quota: 0.6, federalState: 'BY' },
    ])

    expect(result).toEqual({
      effectiveMonth: '2026-01',
      quota: 0.6,
      federalState: 'BY',
    })
  })

  it('resolves policy across Wirksamkeitsmonat boundary', () => {
    const policyHistory = [
      { effectiveMonth: '2026-01', quota: 0.6, federalState: 'BY' },
      { effectiveMonth: '2026-04', quota: 0.5, federalState: 'NW' },
    ] as const

    const march = resolvePolicyForMonth('2026-03', [...policyHistory])
    const april = resolvePolicyForMonth('2026-04', [...policyHistory])

    expect(march.quota).toBe(0.6)
    expect(march.federalState).toBe('BY')
    expect(april.quota).toBe(0.5)
    expect(april.federalState).toBe('NW')
  })

  it('picks new entry exactly at boundary month', () => {
    const result = resolvePolicyForMonth('2026-08', [
      { effectiveMonth: '2026-01', quota: 0.6, federalState: 'BY' },
      { effectiveMonth: '2026-08', quota: 0.7, federalState: 'HH' },
    ])

    expect(result.quota).toBe(0.7)
    expect(result.federalState).toBe('HH')
  })

  it('fails explicitly when target month is before first entry', () => {
    expect(() =>
      resolvePolicyForMonth('2025-12', [
        { effectiveMonth: '2026-01', quota: 0.6, federalState: 'BY' },
      ]),
    ).toThrow('No policy available')
  })

  it('handles out-of-order policy entries', () => {
    const result = resolvePolicyForMonth('2026-06', [
      { effectiveMonth: '2026-04', quota: 0.5, federalState: 'NW' },
      { effectiveMonth: '2026-01', quota: 0.6, federalState: 'BY' },
    ])

    expect(result.quota).toBe(0.5)
    expect(result.federalState).toBe('NW')
    expect(result.effectiveMonth).toBe('2026-04')
  })
})
