import Holidays from 'date-holidays'
import type {
  ClassifyMonthInput,
  DayClassification,
  IsoDate,
  OriginalNonWorkingReason,
} from './types'

/**
 * Format a Date object as an ISO 8601 "YYYY-MM-DD" string using local calendar
 * values (year / month / day) so that timezone offsets do not shift the date.
 */
function toIsoDate(date: Date): IsoDate {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Classify every day of a given month according to calendar rules and explicit
 * caller-supplied overrides.
 *
 * Classification priority (first match wins):
 *   1. overridden-working-day  – date appears in ueberschreibungen AND is non-working
 *   2. public-holiday          – Bundesland-specific public holiday
 *   3. excluded-day            – date appears in ausschlusstage
 *   4. weekend                 – Saturday (6) or Sunday (0)
 *   5. working-day             – everything else
 *
 * @param input Plain data describing the month, Bundesland, and rule lists.
 * @returns One DayClassification per calendar day of the month, in ascending date order.
 */
export function classifyMonth(input: ClassifyMonthInput): DayClassification[] {
  const { year, month, bundesland, ausschlusstage, ueberschreibungen } = input

  // Build fast-lookup sets from the caller-supplied date lists.
  const ausschlussSet = new Set<IsoDate>(ausschlusstage)
  const ueberschreibungSet = new Set<IsoDate>(ueberschreibungen)

  // Initialise date-holidays for the requested Bundesland.
  const hd = new Holidays('DE', bundesland)

  const results: DayClassification[] = []

  // Iterate over every day in the requested month (month is 1-based).
  const date = new Date(year, month - 1, 1)
  while (date.getMonth() === month - 1) {
    const iso = toIsoDate(date)
    const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday

    // --- Determine the base (pre-override) kind ---

    const holidayInfo = hd.isHoliday(date)
    // date-holidays returns false or an array of holiday objects.
    const isPublicHoliday =
      holidayInfo !== false &&
      holidayInfo.some((h) => h.type === 'public')

    let holidayName: string | undefined
    if (isPublicHoliday) {
      const first = holidayInfo[0]
      if (first !== undefined) {
        holidayName = first.name
      }
    }

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isAusschlusstag = ausschlussSet.has(iso)

    let baseNonWorkingReason: OriginalNonWorkingReason | undefined
    if (isPublicHoliday) {
      baseNonWorkingReason = 'public-holiday'
    } else if (isAusschlusstag) {
      baseNonWorkingReason = 'excluded-day'
    } else if (isWeekend) {
      baseNonWorkingReason = 'weekend'
    }

    // --- Apply Überschreibung if present ---
    if (ueberschreibungSet.has(iso) && baseNonWorkingReason !== undefined) {
      results.push({
        date: iso,
        kind: 'overridden-working-day',
        originalNonWorkingReason: baseNonWorkingReason,
        ...(holidayName !== undefined ? { holidayName } : {}),
      })
    } else if (isPublicHoliday) {
      results.push({
        date: iso,
        kind: 'public-holiday',
        ...(holidayName !== undefined ? { holidayName } : {}),
      })
    } else if (isAusschlusstag) {
      results.push({ date: iso, kind: 'excluded-day' })
    } else if (isWeekend) {
      results.push({ date: iso, kind: 'weekend' })
    } else {
      results.push({ date: iso, kind: 'working-day' })
    }

    date.setDate(date.getDate() + 1)
  }

  return results
}
