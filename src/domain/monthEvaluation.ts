import type { DayClassification, IsoDate } from './types'

export type DayEntryStatus = 'remote-work' | 'office' | 'vacation' | 'sick' | 'other'

export interface DayEntry {
  date: IsoDate
  status: DayEntryStatus
  note?: string
}

export interface EvaluateMonthInput {
  year: number
  month: number
  classifications: DayClassification[]
  entries: DayEntry[]
  quota: number
  today: IsoDate
}

export interface MonthEvaluation {
  workingDays: number
  allowance: number
  remoteWorkDays: number
  officeDays: number
  vacationDays: number
  sickDays: number
  absenceDays: number
  openWorkingDays: number
  usagePercentage: number
}

function isWorkingDay(day: DayClassification): boolean {
  return day.kind === 'working-day' || day.kind === 'overridden-working-day'
}

function calculateUsagePercentage(remoteWorkDays: number, allowance: number): number {
  if (allowance === 0) {
    return remoteWorkDays === 0 ? 0 : 100
  }

  return (remoteWorkDays / allowance) * 100
}

export function evaluateMonth(input: EvaluateMonthInput): MonthEvaluation {
  const entryByDate = new Map<IsoDate, DayEntry>()

  for (const entry of input.entries) {
    entryByDate.set(entry.date, entry)
  }

  let workingDays = 0
  let remoteWorkDays = 0
  let officeDays = 0
  let vacationDays = 0
  let sickDays = 0
  let otherAbsenceDays = 0
  let openWorkingDays = 0

  for (const classification of input.classifications) {
    if (!isWorkingDay(classification)) {
      continue
    }

    const entry = entryByDate.get(classification.date)

    if (entry?.status === 'vacation') {
      vacationDays += 1
      continue
    }

    if (entry?.status === 'sick') {
      sickDays += 1
      continue
    }

    if (entry?.status === 'other') {
      otherAbsenceDays += 1
      continue
    }

    workingDays += 1

    if (entry?.status === 'remote-work') {
      remoteWorkDays += 1
      continue
    }

    if (entry?.status === 'office') {
      officeDays += 1
      continue
    }

    if (classification.date >= input.today) {
      openWorkingDays += 1
    }
  }

  const allowance = Math.floor(workingDays * input.quota)
  const absenceDays = vacationDays + sickDays + otherAbsenceDays

  return {
    workingDays,
    allowance,
    remoteWorkDays,
    officeDays,
    vacationDays,
    sickDays,
    absenceDays,
    openWorkingDays,
    usagePercentage: calculateUsagePercentage(remoteWorkDays, allowance),
  }
}
