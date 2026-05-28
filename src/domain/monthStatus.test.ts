import { describe, expect, it } from 'vitest'
import { classifyMonthStatus } from './monthStatus'

describe('classifyMonthStatus', () => {
  it('returns normal below the warning threshold', () => {
    expect(
      classifyMonthStatus({
        evaluation: { workingDays: 20, allowance: 10, remoteWorkDays: 7 },
        warningThreshold: 0.75,
      }),
    ).toBe('normal')
  })

  it('returns warning when usage exceeds the warning threshold', () => {
    expect(
      classifyMonthStatus({
        evaluation: { workingDays: 20, allowance: 10, remoteWorkDays: 8 },
        warningThreshold: 0.75,
      }),
    ).toBe('warning')
  })

  it('returns over-limit when usage exceeds the allowance', () => {
    expect(
      classifyMonthStatus({
        evaluation: { workingDays: 20, allowance: 10, remoteWorkDays: 11 },
        warningThreshold: 0.75,
      }),
    ).toBe('over-limit')
  })

  it('returns not-applicable when there are no working days', () => {
    expect(
      classifyMonthStatus({
        evaluation: { workingDays: 0, allowance: 0, remoteWorkDays: 0 },
        warningThreshold: 0.75,
      }),
    ).toBe('not-applicable')
  })
})