import Holidays from 'date-holidays'

export type DayKind =
  | 'weekend'
  | 'public-holiday'
  | 'excluded-day'
  | 'overridden-working-day'
  | 'working-day'

export type NonWorkingReason = 'weekend' | 'public-holiday' | 'excluded-day'

export interface MonthClassificationInput {
  month: `${number}-${string}`
  federalState: string
  excludedDays: string[]
  overrides: string[]
}

export interface DayClassification {
  date: string
  kind: DayKind
  nonWorkingReasons: NonWorkingReason[]
}

export function classifyMonthDays({
  month,
  federalState,
  excludedDays,
  overrides,
}: MonthClassificationInput): DayClassification[] {
  const [yearPart, monthPart] = month.split('-')
  const year = Number(yearPart)
  const monthIndex = Number(monthPart) - 1
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
  const excludedDaySet = new Set(excludedDays)
  const overrideSet = new Set(overrides)
  const holidays = new Holidays('DE', federalState)

  const result: DayClassification[] = []

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(year, monthIndex, day))
    const isoDate = toIsoDate(date)
    const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6
    const isPublicHoliday = Boolean(holidays.isHoliday(date))
    const isExcludedDay = excludedDaySet.has(isoDate)

    const nonWorkingReasons: NonWorkingReason[] = []
    if (isExcludedDay) {
      nonWorkingReasons.push('excluded-day')
    }
    if (isPublicHoliday) {
      nonWorkingReasons.push('public-holiday')
    }
    if (isWeekend) {
      nonWorkingReasons.push('weekend')
    }

    const isOverridden = overrideSet.has(isoDate) && nonWorkingReasons.length > 0
    const kind = isOverridden
      ? 'overridden-working-day'
      : resolveBaseKind(nonWorkingReasons)

    result.push({
      date: isoDate,
      kind,
      nonWorkingReasons,
    })
  }

  return result
}

function resolveBaseKind(nonWorkingReasons: NonWorkingReason[]): DayKind {
  if (nonWorkingReasons.includes('excluded-day')) {
    return 'excluded-day'
  }
  if (nonWorkingReasons.includes('public-holiday')) {
    return 'public-holiday'
  }
  if (nonWorkingReasons.includes('weekend')) {
    return 'weekend'
  }

  return 'working-day'
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}
