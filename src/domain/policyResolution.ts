import type { Bundesland, RoundingMode } from './types'

export type EffectiveMonth = `${number}-${number}${number}`

export interface PolicyHistoryEntry {
  effectiveMonth: EffectiveMonth
  quota: number
  bundesland: Bundesland
  roundingMode?: RoundingMode
}

export interface ResolvePolicyForMonthInput {
  targetMonth: EffectiveMonth
  policyHistory: PolicyHistoryEntry[]
}

function assertMonthKey(value: string, fieldName: string): asserts value is EffectiveMonth {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new Error(`${fieldName} must be in YYYY-MM format`)
  }
}

function compareMonths(left: EffectiveMonth, right: EffectiveMonth): number {
  return left.localeCompare(right)
}

export function resolvePolicyForMonth(
  input: ResolvePolicyForMonthInput,
): PolicyHistoryEntry {
  assertMonthKey(input.targetMonth, 'targetMonth')

  const sortedHistory = [...input.policyHistory]
    .map((entry) => {
      assertMonthKey(entry.effectiveMonth, 'effectiveMonth')
      return entry
    })
    .sort((left, right) => compareMonths(left.effectiveMonth, right.effectiveMonth))

  const effectiveEntry = [...sortedHistory]
    .reverse()
    .find((entry) => compareMonths(entry.effectiveMonth, input.targetMonth) <= 0)

  if (!effectiveEntry) {
    throw new Error(`No policy history entry applies to ${input.targetMonth}`)
  }

  return effectiveEntry
}
