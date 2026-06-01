import type { MonthStatus } from '../../domain/monthStatus'
import type { TranslationDictionary, ViewMode } from '../model'
import { MONTH_STATUS_LABELS } from '../model'

interface HeroPanelProps {
  viewMode: ViewMode
  lastOverviewMode: Extract<ViewMode, 'month' | 'year'>
  title: string
  eyebrow: string
  lead: string
  language: 'de' | 'en'
  monthStatus: MonthStatus | null
  quotaLabel: string | undefined
  visiblePolicyHistoryCount?: number
  settingsReturnLabel: string
  onNavigatePrevious: () => void
  onNavigateNext: () => void
  onOpenSettings: () => void
  onOpenYearOverview: () => void
  onOpenMonthOverview: () => void
  t: TranslationDictionary
}

function HeroPanel({
  viewMode,
  lastOverviewMode,
  title,
  eyebrow,
  lead,
  language,
  monthStatus,
  quotaLabel,
  visiblePolicyHistoryCount,
  settingsReturnLabel,
  onNavigatePrevious,
  onNavigateNext,
  onOpenSettings,
  onOpenYearOverview,
  onOpenMonthOverview,
  t,
}: HeroPanelProps) {
  const monthStatusLabels = MONTH_STATUS_LABELS[language]

  return (
    <section className="hero-panel">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <div className="hero-heading-row">
          {viewMode === 'settings' ? (
            <button
              type="button"
              className="month-nav-button month-nav-button--prev"
              aria-label={settingsReturnLabel}
              onClick={lastOverviewMode === 'year' ? onOpenYearOverview : onOpenMonthOverview}
            >
              {lastOverviewMode === 'year' ? t.previousYearButton : t.previousMonthButton}
            </button>
          ) : (
            <button
              type="button"
              className="month-nav-button month-nav-button--prev"
              aria-label={viewMode === 'month' ? t.previousMonth : t.previousYear}
              onClick={onNavigatePrevious}
            >
              {viewMode === 'month' ? t.previousMonthButton : t.previousYearButton}
            </button>
          )}
          <h1>{title}</h1>
          <div className="hero-heading-actions">
            {viewMode === 'settings' ? null : (
              <button
                type="button"
                className="month-nav-button month-nav-button--next"
                aria-label={viewMode === 'month' ? t.nextMonth : t.nextYear}
                onClick={onNavigateNext}
              >
                {viewMode === 'month' ? t.nextMonthButton : t.nextYearButton}
              </button>
            )}
            <button
              type="button"
              className={`icon-button${viewMode === 'settings' ? ' icon-button-active' : ''}`}
              aria-label={t.openSettings}
              aria-pressed={viewMode === 'settings'}
              onClick={onOpenSettings}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.08 7.08 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.49-.42h-3.84a.5.5 0 0 0-.49.42l-.36 2.54c-.58.23-1.13.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.82 14.52a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.32.64.22l2.39-.96c.5.4 1.05.71 1.63.94l.36 2.54c.04.24.25.42.49.42h3.84c.24 0 .45-.18.49-.42l.36-2.54c.58-.23 1.13-.54 1.63-.94l2.39.96c.24.1.51.01.64-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>
        <p className="lead">{lead}</p>
      </div>

      <div className="hero-aside">
        {viewMode === 'month' ? (
          <>
            <div className={`status-pill status-${monthStatus ?? 'normal'}`}>
              {t.monthlyStatus} {monthStatus ? monthStatusLabels[monthStatus] : null}
            </div>
            <p className="policy-chip">{quotaLabel}</p>
            <button type="button" className="hero-toggle-button" onClick={onOpenYearOverview}>
              {t.openYearOverview}
            </button>
          </>
        ) : viewMode === 'year' ? (
          <>
            <div className="status-pill">{t.yearCardsCount}</div>
            <p className="policy-chip">{t.policyPerMonth}</p>
            <button type="button" className="hero-toggle-button" onClick={onOpenMonthOverview}>
              {t.openMonthOverview}
            </button>
          </>
        ) : (
          <>
            <div className="status-pill">{visiblePolicyHistoryCount ?? 0}</div>
            <p className="policy-chip">{t.policyHistory}</p>
            <button
              type="button"
              className="hero-toggle-button"
              onClick={lastOverviewMode === 'year' ? onOpenYearOverview : onOpenMonthOverview}
            >
              {settingsReturnLabel}
            </button>
          </>
        )}
      </div>
    </section>
  )
}

export default HeroPanel
