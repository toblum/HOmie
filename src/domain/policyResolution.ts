export interface PolicyHistoryEntry {
  effectiveMonth: `${number}-${string}`
  quota: number
  federalState: string
}

export interface ResolvedPolicy {
  quota: number
  federalState: string
  effectiveMonth: string
}

export function resolvePolicyForMonth(
  targetMonth: `${number}-${string}`,
  policyHistory: PolicyHistoryEntry[],
): ResolvedPolicy {
  const targetMonthIndex = toMonthIndex(targetMonth)

  const sorted = [...policyHistory].sort(
    (a, b) => toMonthIndex(a.effectiveMonth) - toMonthIndex(b.effectiveMonth),
  )

  let resolved: PolicyHistoryEntry | undefined
  for (const entry of sorted) {
    if (toMonthIndex(entry.effectiveMonth) <= targetMonthIndex) {
      resolved = entry
      continue
    }
    break
  }

  if (!resolved) {
    throw new Error(
      `No policy available for month "${targetMonth}". Provide an earlier effectiveMonth entry.`,
    )
  }

  return {
    quota: resolved.quota,
    federalState: resolved.federalState,
    effectiveMonth: resolved.effectiveMonth,
  }
}

function toMonthIndex(month: string): number {
  const match = /^(\d{4})-(\d{2})$/.exec(month)
  if (!match) {
    throw new Error(`Invalid month format "${month}". Expected YYYY-MM.`)
  }

  const year = Number(match[1])
  const monthNumber = Number(match[2])
  if (monthNumber < 1 || monthNumber > 12) {
    throw new Error(`Invalid month value "${month}". Expected YYYY-MM.`)
  }

  return year * 12 + monthNumber
}
