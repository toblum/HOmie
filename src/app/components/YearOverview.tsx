import type { EffectiveMonth } from '../../domain/policyResolution'
import { MONTH_STATUS_LABELS, type TranslationDictionary, type YearOverviewViewModel } from '../model'

interface YearOverviewProps {
  yearOverview: YearOverviewViewModel
  language: 'de' | 'en'
  t: TranslationDictionary
  onSelectMonth: (monthKey: EffectiveMonth) => void
}

function YearOverview({ yearOverview, language, t, onSelectMonth }: YearOverviewProps) {
  const monthStatusLabels = MONTH_STATUS_LABELS[language]

  return (
    <section className="year-panel" aria-label={t.yearOverview}>
      <div className="year-grid">
        {yearOverview.cards.map((card) => (
          <button
            key={card.monthKey}
            type="button"
            className={`year-card status-${card.monthStatus}`}
            aria-label={t.openMonth(card.heading)}
            onClick={() => {
              onSelectMonth(card.monthKey)
            }}
          >
            <span className="year-card-topline">
              <span className="year-card-month">{card.heading}</span>
              <span className={`status-pill status-${card.monthStatus}`}>
                {monthStatusLabels[card.monthStatus]}
              </span>
            </span>
            <span className="year-card-policy">
              {t.quota} {Math.round(card.policy.quota * 100)} % · {t.federalState} {card.policy.bundesland}
            </span>
            <dl className="year-card-metrics">
              <div>
                <dt>{t.remoteWork}</dt>
                <dd>
                  {card.evaluation.remoteWorkDays} von {card.evaluation.allowance}
                </dd>
              </div>
              <div>
                <dt>{t.office}</dt>
                <dd>{card.evaluation.officeDays}</dd>
              </div>
            </dl>
          </button>
        ))}
      </div>
    </section>
  )
}

export default YearOverview
