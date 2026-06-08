# HOmie

HOmie is a local-first personal planning context for monthly office-presence policy compliance. It tracks how one person allocates working days between mobiles Arbeiten, office presence, and absences.

## Language

**Nutzer / User**:
The single person whose planning and bookings are stored in HOmie. HOmie is a single-user context rather than a multi-profile or team-planning system.
_Avoid_: Mitarbeiterprofil, Teammitglied

**Arbeitstag / Working Day**:
A calendar day that counts toward the monthly quota — i.e. a weekday that is not a public holiday, not a custom excluded date, and not an absence day (Vacation or Sick).
_Avoid_: effective workday, relevant workday, quota day, Werktag

**Abwesenheit / Absence**:
A user-recorded non-working day that removes a working day from quota usage. In HOmie, the absence types are Vacation, Sick, and Other.
_Avoid_: Fehltag

**Nicht-Arbeitstag / Non-Working Day**:
A calendar day that never counts toward the monthly quota because it is excluded by calendar rules. In HOmie, this covers weekends, public holidays, and custom excluded dates.
_Avoid_: Abwesenheit, Arbeitstag

**Ausschlusstag / Excluded Day**:
A user-defined non-working day. It is a specific kind of non-working day, distinct from weekends and public holidays. In HOmie v1, excluded days are single concrete dates rather than recurring rules.
_Avoid_: Sondertag, Sperrtag

**Bundesland / Federal State**:
The holiday region used to determine public holidays for a month. In HOmie, the federal state is part of the policy history rather than a purely current preference.
_Avoid_: Region

**Überschreibung / Override**:
A deliberate user action that turns a specific non-working day into a working day for planning and quota purposes. The original reason for the non-working day remains visible even after the override.
_Avoid_: Ausnahme

**Wirksamkeitsmonat / Effective Month**:
The first month from which a changed quota or federal-state setting applies. Earlier months keep their previously valid rules.
_Avoid_: Änderungsmonat

**Regelverlauf / Policy History**:
The chronological history of quota and federal-state rules across months. Each month is evaluated against the rule state that was active for that month.
_Avoid_: Verlauf, Historie

**Persönliche Einstellungen / Personal Preferences**:
User-specific display and application options that do not change quota math or historical month evaluation. In HOmie, these include language, theme, and warning threshold.
_Avoid_: Regelverlauf

**Rückgängig / Undo**:
The reversal of the most recent day-changing user action, regardless of whether it came from the monthly overview, quick actions, or tray interactions.
_Avoid_: lokale Rücknahme

**Monatsstand / Monthly Status**:
The current evaluated state of a month, including both future plans and present/past bookings. Future plans remain visually distinct even when they are already included in the monthly status. Its state can be normal, warning, over-limit, or not-applicable.
_Avoid_: Monatsstatistik

**Jahresübersicht / Yearly Overview**:
The year-level view that lets the user inspect month-by-month planning and booking outcomes across a full calendar year. It applies the same counting rules as the monthly status, including future plans, and drills down into the monthly overview for detailed work.
_Avoid_: Heatmap

**Monatsübersicht / Monthly Overview**:
The primary month-level view that combines the calendar, monthly status, and quick interactions for one month.
_Avoid_: Kalender

**Offener Arbeitstag / Open Working Day**:
A past working day for which no booking exists yet. Open working days are visible gaps but do not implicitly count as office, remote work, or absence. In machine-readable exports, they remain explicit rather than disappearing into empty cells.
_Avoid_: fehlendes Büro, implizite Buchung

**Warnschwelle / Warning Threshold**:
A personal display setting that marks when monthly remote-work usage is nearing the allowance. It is not part of the policy history and does not change quota math.
_Avoid_: Quote, Kontingent

**Wiederherstellung / Restore**:
The complete replacement of the current local state with a previously exported or backed-up state. It is not a merge operation. JSON export is a valid full restore source.
_Avoid_: Merge, Synchronisation

**Sicherung / Backup**:
A technical snapshot of the local state kept for recovery purposes. A backup exists to support restore, not to communicate data outward.
_Avoid_: Export

**Export**:
A user-initiated output of data for reuse, sharing, or further processing in another tool. An export is not necessarily intended for recovery. Machine-readable exports use stable canonical data values rather than depending on the current UI language, using English kebab-case status codes.
_Avoid_: Backup

**Bericht / Report**:
A human-readable document output that summarizes planning or booking data for a month or year. A report is presentation-oriented rather than machine-oriented, should not hide open working days, and defaults to the current UI language.
_Avoid_: Export

**Erinnerung / Reminder**:
A domain-level prompt that tells the user the most recent past working day is still missing a booking. It is independent of the delivery channel and fires at most once per calendar day.
_Avoid_: Benachrichtigung

**Benachrichtigung / Notification**:
The operating-system delivery channel used to surface a reminder to the user.
_Avoid_: Erinnerung

**Notiz / Note**:
An optional short text attached to a day's plan or booking. A note belongs to the day fact as a whole, not only to a specific status family. It survives status changes unless the day is explicitly reset to unset.
_Avoid_: Kommentar

**Aktiver Status / Active Status**:
The single currently effective status of a day. Setting a new status replaces the previous one rather than layering multiple statuses on the same day.
_Avoid_: Statusstapel

**Statuszyklus / Status Cycle**:
The fixed quick-entry order used to step a day through its possible statuses: unset, remote work, office, vacation, sick, other, then back to unset.
_Avoid_: freie Reihenfolge

**Leer / Unset**:
The absence of any active day status. Resetting a day to unset removes its note and leaves the day without a booking or plan.
_Avoid_: Standardstatus

**Quote / Quota**:
The configured percentage of monthly working days that may be recorded as Mobiles Arbeiten. In HOmie v1, the default quota is 60%.
_Avoid_: Kontingent

**Kontingent / Allowance**:
The computed number of Mobiles-Arbeiten days available in a specific month after applying the quota to that month's working days.
_Avoid_: Quote, Limit

**Planung / Plan**:
A future-dated intended day record. In HOmie, a Planung becomes a Buchung automatically once the relevant calendar day is reached.
_Avoid_: Buchung

**Buchung / Booking**:
A present- or past-dated recorded day record. In HOmie, the same day fact is spoken about as a Buchung once its date is no longer in the future; today already counts as Buchung.
_Avoid_: Tageseintrag

**Büro / Office**:
A working day spent in the office. It consumes no Mobiles-Arbeiten allowance but does count as a recorded working day.
_Avoid_: Präsenz, Präsenztag

**Mobiles Arbeiten / Remote Work**:
A quota-relevant working day spent outside the office. It only counts against the monthly allowance when the day is a working day.
_Avoid_: Home Office

**Sonstiges / Other**:
An absence type for non-working days that do not fall under Vacation or Sick. It counts as an absence in quota calculations.
_Avoid_: Andere

## Flagged ambiguities

- **Home Office** is retained as product/colloquial language only. The canonical tracked day status is **Mobiles Arbeiten** in German and **Remote Work** in English.
- **Abwesenheit** and **Nicht-Arbeitstag** are different concepts. Absence is user-recorded; non-working day is calendar- or rule-derived.
- **Quote** is the percentage; **Kontingent** is the month-specific computed day count.
- **Planung** is future-facing language; **Buchung** is present/past-facing language for the same day fact.
- **Überschreibung** converts one specific non-working day into a working day. *(Defined domain concept; UI implementation pending.)*

## Example dialogue

**Dev**: If I mark Tuesday as Mobiles Arbeiten, does it consume quota?
**Domain expert**: Yes, if Tuesday is a working day.

**Dev**: So the app name HOmie doesn't define the tracked status term?
**Domain expert**: Correct. The tracked status term is Mobiles Arbeiten / Remote Work.

**Dev**: Is a public holiday an absence?
**Domain expert**: No. A public holiday is a non-working day, not an absence.

**Dev**: Is 12 the quota for May?
**Domain expert**: No. 60% is the quota. 12 days is the May allowance.

**Dev**: I set next Tuesday to Mobiles Arbeiten. Is that a booking already?
**Domain expert**: Not yet. In the future it is a plan. On Tuesday it becomes a booking automatically.

**Dev**: If I work on a public holiday, is it still a non-working day?
**Domain expert**: No. That specific day has been overridden and is treated as a working day.

**Dev**: Does overriding a public holiday change the month's allowance formula?
**Domain expert**: Yes. The month is recalculated with one more working day, then the normal quota formula is applied.
