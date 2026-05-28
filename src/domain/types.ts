/**
 * The five mutually exclusive day kinds recognised by the calendar-classification module.
 *
 * Priority (highest → lowest) when multiple rules would apply to the same date:
 *   overridden-working-day  – user explicitly turned a non-working day into a working day
 *   public-holiday          – Bundesland-specific public holiday
 *   excluded-day            – caller-supplied Ausschlusstag
 *   weekend                 – Saturday or Sunday
 *   working-day             – any weekday that is not otherwise excluded
 */
export type DayKind =
  | 'working-day'
  | 'weekend'
  | 'public-holiday'
  | 'excluded-day'
  | 'overridden-working-day'

/**
 * The non-working reason that was in effect before an Überschreibung was applied.
 * Only present when kind === 'overridden-working-day'.
 */
export type OriginalNonWorkingReason = 'public-holiday' | 'excluded-day' | 'weekend'

/** ISO 8601 date string, e.g. "2025-01-06". */
export type IsoDate = string

/**
 * Two-letter Bundesland code used by date-holidays, e.g. "BY", "NW", "BE".
 */
export type Bundesland =
  | 'BB'
  | 'BE'
  | 'BW'
  | 'BY'
  | 'HB'
  | 'HE'
  | 'HH'
  | 'MV'
  | 'NI'
  | 'NW'
  | 'RP'
  | 'SH'
  | 'SL'
  | 'SN'
  | 'ST'
  | 'TH'

/**
 * The classification result for a single calendar day.
 */
export interface DayClassification {
  /** The calendar date, ISO 8601 "YYYY-MM-DD". */
  date: IsoDate
  /** The effective day kind. */
  kind: DayKind
  /**
   * When kind === 'overridden-working-day', the non-working reason that applied
   * before the override.  Absent for all other kinds.
   */
  originalNonWorkingReason?: OriginalNonWorkingReason
  /**
   * Human-readable name of the public holiday, when the day is (or was, before an
   * override) a public holiday.  Absent for all other kinds.
   */
  holidayName?: string
}

/**
 * Input descriptor for the calendar-classification module.
 */
export interface ClassifyMonthInput {
  /** Full calendar year, e.g. 2025. */
  year: number
  /** Month number, 1-based, e.g. 1 for January. */
  month: number
  /** Bundesland whose public-holiday calendar is used. */
  bundesland: Bundesland
  /**
   * List of caller-supplied Ausschlusstage (ISO 8601 dates).
   * Days in this list that fall within the requested month are treated as
   * non-working days of kind 'excluded-day'.
   */
  ausschlusstage: IsoDate[]
  /**
   * List of Überschreibungen: dates (ISO 8601) that the caller wants to convert
   * from a non-working day to a working day.  Only dates that would otherwise be
   * non-working (weekend / public-holiday / excluded-day) are promoted; plain
   * working days are unaffected.
   */
  ueberschreibungen: IsoDate[]
}
