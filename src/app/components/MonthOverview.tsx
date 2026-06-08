import { useCallback, useEffect, useRef } from 'react'
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

  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return

    const dayButtons = grid.querySelectorAll<HTMLButtonElement>('.day-button')
    dayButtons.forEach((btn, i) => {
      btn.tabIndex = i === 0 ? 0 : -1
    })
  }, [])

  const handleGridKeyDown = useCallback((event: React.KeyboardEvent) => {
    const grid = gridRef.current
    if (!grid) return

    const activeElement = document.activeElement
    if (!activeElement || !grid.contains(activeElement)) return

    const currentCell = activeElement.closest<HTMLElement>('[role="gridcell"]')
    if (!currentCell) return

    const allCells = Array.from(grid.querySelectorAll<HTMLElement>('[role="gridcell"]'))
    const currentPos = allCells.indexOf(currentCell)
    if (currentPos === -1) return

    const COLUMNS = 7

    const findInteractive = (from: number, direction: 1 | -1): number | null => {
      let pos = from
      while (pos >= 0 && pos < allCells.length) {
        if (allCells[pos]!.querySelector('.day-button')) return pos
        pos += direction
      }
      return null
    }

    let targetPos: number | null = null

    switch (event.key) {
      case 'ArrowRight':
        targetPos = findInteractive(currentPos + 1, 1)
        break
      case 'ArrowLeft':
        targetPos = findInteractive(currentPos - 1, -1)
        break
      case 'ArrowDown': {
        const next = findInteractive(currentPos + COLUMNS, 1)
        if (next !== null && Math.floor(next / COLUMNS) > Math.floor(currentPos / COLUMNS)) {
          targetPos = next
        }
        break
      }
      case 'ArrowUp': {
        const prev = findInteractive(currentPos - COLUMNS, -1)
        if (prev !== null && Math.floor(prev / COLUMNS) < Math.floor(currentPos / COLUMNS)) {
          targetPos = prev
        }
        break
      }
      case 'Home':
        targetPos = findInteractive(0, 1)
        break
      case 'End':
        targetPos = findInteractive(allCells.length - 1, -1)
        break
      default:
        return
    }

    if (targetPos === null) return

    const targetButton = allCells[targetPos]?.querySelector<HTMLButtonElement>('.day-button')
    if (!targetButton) return

    event.preventDefault()

    allCells.forEach((cell) => {
      const btn = cell.querySelector<HTMLButtonElement>('.day-button')
      if (btn) btn.tabIndex = -1
    })

    targetButton.tabIndex = 0
    targetButton.focus()
  }, [])

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

        <div className="calendar-grid" role="grid" aria-label={t.monthGrid} ref={gridRef} onKeyDown={handleGridKeyDown}>
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
                  {day.entry ? <strong key={day.entry.status} className="day-status">{day.statusLabel}</strong> : null}
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
          </div>
        </div>

        <dl className="summary-grid">
          <div className="summary-metric">
            <dt>{t.workingDays}</dt>
            <dd>{calendar.evaluation.workingDays}</dd>
          </div>
          <div className="summary-metric">
            <dt>{t.office}</dt>
            <dd>{calendar.evaluation.officeDays}</dd>
          </div>
          {
            (() => {
              const overLimit = calendar.evaluation.remoteWorkDays > calendar.evaluation.allowance
              return (
                <div className={`summary-metric summary-metric-wide${overLimit ? ' summary-metric--over-limit' : ' summary-metric--on-track'}`}>
                  <dt>{t.remoteWork}</dt>
                  <dd>
                    {calendar.evaluation.remoteWorkDays} von {calendar.evaluation.allowance}
                  </dd>
                </div>
              )
            })()
          }
          <div className="summary-metric">
            <dt>{t.absence}</dt>
            <dd>{calendar.evaluation.absenceDays}</dd>
          </div>
          <div className="summary-metric">
            <dt>{t.openWorkingDays}</dt>
            <dd>{calendar.evaluation.openWorkingDays}</dd>
          </div>
        </dl>

        {(() => {
          const bookedDays = calendar.evaluation.remoteWorkDays + calendar.evaluation.officeDays
          const actualRate = bookedDays > 0 ? calendar.evaluation.remoteWorkDays / bookedDays : 0
          const actualPct = Math.round(actualRate * 100)
          const allowedPct = Math.round(calendar.policy.quota * 100)
          const isOver = actualRate > calendar.policy.quota
          return (
            <div className="homeoffice-bar-panel">
              <div className="homeoffice-bar-head">
                <span className="homeoffice-bar-label">
                  {language === 'de' ? 'Homeoffice-Quote' : 'Home Office Rate'}
                </span>
                <span className={`homeoffice-bar-value${isOver ? ' homeoffice-bar-value--over' : ''}`}>
                  {bookedDays > 0 ? `${actualPct} %` : '—'}
                </span>
              </div>
              <div
                className="homeoffice-bar"
                role="progressbar"
                aria-label={language === 'de' ? 'Homeoffice-Quote' : 'Home Office Rate'}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={actualPct}
              >
                <span
                  className={`homeoffice-bar-fill${isOver ? ' homeoffice-bar-fill--over' : ''}`}
                  style={{ width: `${Math.min(100, actualPct)}%` }}
                />
                <span
                  className="homeoffice-bar-limit"
                  style={{ left: `${allowedPct}%` }}
                  aria-label={`${language === 'de' ? 'Erlaubt' : 'Allowed'}: ${allowedPct} %`}
                  title={`${language === 'de' ? 'Erlaubt' : 'Allowed'}: ${allowedPct} %`}
                />
              </div>
              <div className="homeoffice-bar-footer">
                <span />
                <span className="homeoffice-bar-limit-label" style={{ left: `${allowedPct}%` }}>
                  {language === 'de' ? `Max. ${allowedPct} %` : `Max. ${allowedPct} %`}
                </span>
              </div>
            </div>
          )
        })()}

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
