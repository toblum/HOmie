import type { MonthEvaluation } from './monthEvaluation'

export type MonthStatus = 'normal' | 'warning' | 'over-limit' | 'not-applicable'

export function classifyMonthStatus(input: {
  evaluation: Pick<MonthEvaluation, 'workingDays' | 'allowance' | 'remoteWorkDays'>
  warningThreshold: number
}): MonthStatus {
  const { evaluation, warningThreshold } = input

  if (evaluation.workingDays === 0) {
    return 'not-applicable'
  }

  if (evaluation.remoteWorkDays > evaluation.allowance) {
    return 'over-limit'
  }

  if (evaluation.allowance === 0) {
    return 'normal'
  }

  return evaluation.remoteWorkDays / evaluation.allowance > warningThreshold ? 'warning' : 'normal'
}