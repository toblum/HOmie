import type { DayClassification } from './calendarClassification'

export type DayEntryStatus = 'remote-work' | 'office' | 'vacation' | 'sick'

export interface DayEntry {
  status: DayEntryStatus
  note?: string
}

export interface MonthEvaluationInput {
  month: `${number}-${string}`
  dayClassifications: DayClassification[]
  entries: Record<string, DayEntry>
  quota: number
  today: string
  warningThreshold?: number
}

export interface MonthEvaluation {
  workingDays: number
  allowance: number
  remoteWorkDays: number
  officeDays: number
  absenceVacationDays: number
  absenceSickDays: number
  absenceDays: number
  openWorkingDays: number
  usagePercentage: number
  monthlyStatus: 'normal' | 'warning' | 'over-limit' | 'not-applicable'
}

export function evaluateMonth({
  dayClassifications,
  entries,
  quota,
  today,
  warningThreshold,
}: MonthEvaluationInput): MonthEvaluation {
  let workingDays = 0
  let remoteWorkDays = 0
  let officeDays = 0
  let absenceVacationDays = 0
  let absenceSickDays = 0
  let openWorkingDays = 0

  for (const day of dayClassifications) {
    const entry = entries[day.date]
    const isWorkingDayByCalendar =
      day.kind === 'working-day' || day.kind === 'overridden-working-day'

    if (!isWorkingDayByCalendar) {
      continue
    }

    if (entry?.status === 'vacation') {
      absenceVacationDays += 1
      continue
    }
    if (entry?.status === 'sick') {
      absenceSickDays += 1
      continue
    }

    workingDays += 1

    if (entry?.status === 'remote-work') {
      remoteWorkDays += 1
    } else if (entry?.status === 'office') {
      officeDays += 1
    } else if (day.date < today) {
      // Open working days are only missing bookings in the past.
      // Today/future empty days are planning gaps and are intentionally not counted as open.
      // Both values are canonical ISO dates (YYYY-MM-DD), so lexicographic compare is chronological.
      openWorkingDays += 1
    }
  }

  const allowance = Math.floor(workingDays * quota)
  const usagePercentage = allowance > 0 ? remoteWorkDays / allowance : 0
  const monthlyStatus = resolveMonthlyStatus(
    workingDays,
    remoteWorkDays,
    allowance,
    usagePercentage,
    warningThreshold,
  )

  return {
    workingDays,
    allowance,
    remoteWorkDays,
    officeDays,
    absenceVacationDays,
    absenceSickDays,
    absenceDays: absenceVacationDays + absenceSickDays,
    openWorkingDays,
    usagePercentage,
    monthlyStatus,
  }
}

function resolveMonthlyStatus(
  workingDays: number,
  remoteWorkDays: number,
  allowance: number,
  usagePercentage: number,
  warningThreshold?: number,
): MonthEvaluation['monthlyStatus'] {
  if (workingDays === 0) {
    return 'not-applicable'
  }
  if (remoteWorkDays > allowance) {
    return 'over-limit'
  }
  if (
    typeof warningThreshold === 'number' &&
    warningThreshold >= 0 &&
    usagePercentage >= warningThreshold
  ) {
    return 'warning'
  }
  return 'normal'
}
