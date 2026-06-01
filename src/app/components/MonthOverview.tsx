import type { MonthStatus } from '../../domain/monthStatus'
import type { EffectiveMonth } from '../../domain/policyResolution'
import type {
  CalendarMonthViewModel,
  TranslationDictionary,
} from '../model'
import {
  DAY_KIND_LABELS,
  MONTH_STATUS_LABELS,
  STATUS_LABELS,
  buildCsvExportFilename,
  buildMonthlyReportHtml,
  downloadBlob,
  formatUsagePercentage,
  formatWeekday,
  getDayNumber,
  serializeMonthAsCsv,
} from '../model'

interface MonthOverviewProps {
  calendar: CalendarMonthViewModel
  monthStatus: MonthStatus
  language: 'de' | 'en'
  selectedMonth: EffectiveMonth
  t: TranslationDictionary
  onCycleDayStatus: (date: string) => void
  onOpenDetailView: (date: string) => void
}

function MonthOverview({
  calendar,
  monthStatus,
  language,
  selectedMonth,
  t,
  onCycleDayStatus,
  onOpenDetailView,
}: MonthOverviewProps) {
  const dayKindLabels = DAY_KIND_LABELS[language]
  const monthStatusLabels = MONTH_STATUS_LABELS[language]
  const calendarLegend = [
    { tone: 'empty', label: t.openWorkingDays },
    { tone: 'remote-work', label: t.remoteWork },
    { tone: 'office', label: t.office },
    { tone: 'vacation', label: STATUS_LABELS[language].vacation },
    { tone: 'sick', label: STATUS_LABELS[language].sick },
    { tone: 'other', label: t.otherAbsence },
  ] as const

  const handleExportCsv = () => {
    const blob = new Blob([serializeMonthAsCsv(calendar)], {
      type: 'text/csv;charset=utf-8',
    })
    downloadBlob(blob, buildCsvExportFilename(selectedMonth))
  }

  const handlePrintReport = () => {
    const reportWindow = window.open('', '_blank')

    if (!reportWindow) {
      return
    }

    reportWindow.opener = null
    reportWindow.document.write(
      buildMonthlyReportHtml({
        calendar,
        language,
        t,
        dayKindLabels,
        monthStatusLabel: monthStatusLabels[monthStatus],
      }),
    )
    reportWindow.document.close()
    reportWindow.focus()
  }

  return (
    <>
      <section className="calendar-panel" aria-label={t.monthView}>
        <div className="calendar-panel-head">
          <div>
            <p className="eyebrow">{t.monthView}</p>
            <h2>{calendar.heading}</h2>
            <p className="calendar-copy">{t.calendarHint}</p>
          </div>

          <div className="calendar-legend" aria-label={t.calendarLegend}>
            {calendarLegend.map((item) => (
              <span key={item.tone} className="legend-item">
                <span className={`legend-swatch tone-${item.tone}`} aria-hidden="true" />
                <span>{item.label}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="calendar-weekdays" aria-hidden="true">
          {calendar.weekdayHeaders.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>

        <div className="calendar-grid" role="grid" aria-label={t.monthGrid}>
          {Array.from({ length: calendar.leadingBlankCount }, (_, index) => (
            <div key={`blank-${index}`} className="calendar-blank" aria-hidden="true" />
          ))}

          {calendar.days.map((day) => (
            <article
              key={day.classification.date}
              role="gridcell"
              aria-current={day.isToday ? 'date' : undefined}
              aria-label={`${Number(getDayNumber(day.classification.date))} ${formatWeekday(day.classification.date, language)}`}
              className={`day-card tone-${day.tone} kind-${day.classification.kind}${day.isToday ? ' day-card--today' : ''}`}
            >
              {day.isInteractive ? (
                <button
                  type="button"
                  className="day-button"
                  onClick={() => {
                    onCycleDayStatus(day.classification.date)
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    onOpenDetailView(day.classification.date)
                  }}
                >
                  <span className="day-topline">
                    <span className="day-number">{getDayNumber(day.classification.date)}</span>
                    <span className="day-weekday">{formatWeekday(day.classification.date, language)}</span>
                  </span>
                  {day.entry ? <strong className="day-status">{day.statusLabel}</strong> : null}
                  {day.entry?.note ? <span className="day-note">{day.entry.note}</span> : null}
                </button>
              ) : (
                <div className="day-static">
                  <span className="day-topline">
                    <span className="day-number">{getDayNumber(day.classification.date)}</span>
                    <span className="day-weekday">{formatWeekday(day.classification.date, language)}</span>
                  </span>
                  <strong className="day-status">{dayKindLabels[day.classification.kind]}</strong>
                  {day.classification.holidayName ? (
                    <span className="day-note">{day.classification.holidayName}</span>
                  ) : null}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="summary-panel" aria-label={t.monthlyStatus}>
        <div className="summary-panel-head">
          <div>
            <p className="eyebrow">{t.evaluation}</p>
            <h2>{t.monthlyStatus}</h2>
          </div>
          <div className="summary-panel-actions">
            <button type="button" className="primary-button" onClick={handlePrintReport}>
              {t.printReport}
            </button>
            <button type="button" className="ghost-button" onClick={handleExportCsv}>
              {t.exportCsv}
            </button>
            <div className={`status-pill status-${monthStatus}`}>
              {monthStatusLabels[monthStatus]}
            </div>
          </div>
        </div>

        <dl className="summary-grid">
          <div className="summary-metric">
            <dt>{t.workingDays}</dt>
            <dd>{calendar.evaluation.workingDays}</dd>
          </div>
          <div className="summary-metric">
            <dt>{t.allowance}</dt>
            <dd>{calendar.evaluation.allowance}</dd>
          </div>
          <div className="summary-metric summary-metric-wide">
            <dt>{t.remoteWork}</dt>
            <dd>
              {calendar.evaluation.remoteWorkDays} / {calendar.evaluation.allowance}
            </dd>
          </div>
          <div className="summary-metric">
            <dt>{t.office}</dt>
            <dd>{calendar.evaluation.officeDays}</dd>
          </div>
          <div className="summary-metric">
            <dt>{t.absence}</dt>
            <dd>{calendar.evaluation.absenceDays}</dd>
          </div>
          <div className="summary-metric summary-metric-wide">
            <dt>{t.openWorkingDays}</dt>
            <dd>{calendar.evaluation.openWorkingDays}</dd>
          </div>
        </dl>

        <div className="usage-panel" data-status={monthStatus}>
          <div className="usage-copy">
            <div>
              <p className="usage-label">{t.usage}</p>
              <strong>{formatUsagePercentage(calendar.evaluation.usagePercentage)}</strong>
            </div>
            <p>{t.usageSummary(calendar.evaluation)}</p>
          </div>
          <div
            className="usage-meter"
            role="progressbar"
            aria-label={t.usage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.max(0, Math.min(100, Math.round(calendar.evaluation.usagePercentage)))}
          >
            <span
              className="usage-meter-fill"
              style={{
                width: `${Math.max(0, Math.min(100, calendar.evaluation.usagePercentage))}%`,
              }}
            />
          </div>
        </div>
      </section>
    </>
  )
}

export default MonthOverview
