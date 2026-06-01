import { useState, type ChangeEvent } from 'react'
import { BUNDESLAENDER } from '../../storage/browserStorage'
import type { BrowserStorageState } from '../../storage/browserStorage'
import type { EffectiveMonth, PolicyHistoryEntry } from '../../domain/policyResolution'
import {
  BUNDESLAND_LABELS,
  buildJsonExportFilename,
  downloadBlob,
  getVisiblePolicyHistory,
  shiftMonthKey,
  type TranslationDictionary,
} from '../model'

interface SettingsPageProps {
  snapshot: BrowserStorageState
  language: 'de' | 'en'
  today: string
  t: TranslationDictionary
  onUpdatePreferences: (preferences: { language?: 'de' | 'en'; theme?: 'light' | 'dark' | 'system'; warningThreshold?: number }) => void
  onAddPolicyHistoryEntry: (entry: PolicyHistoryEntry) => void
  onRestoreSnapshot: (state: BrowserStorageState) => Promise<void>
  onExportJson: () => Promise<BrowserStorageState>
}

function SettingsPage({
  snapshot,
  language,
  today,
  t,
  onUpdatePreferences,
  onAddPolicyHistoryEntry,
  onRestoreSnapshot,
  onExportJson,
}: SettingsPageProps) {
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null)
  const [warningThresholdInput, setWarningThresholdInput] = useState<string | null>(null)

  const latestPolicyEntry = snapshot.policyHistory[snapshot.policyHistory.length - 1]
  const visiblePolicyHistory = getVisiblePolicyHistory(snapshot.policyHistory)
  const minimumNextPolicyMonth = shiftMonthKey(
    latestPolicyEntry?.effectiveMonth ?? '1900-01',
    1,
  )
  const warningThresholdPercentage = Math.round(snapshot.preferences.warningThreshold * 100)
  const bundeslandLabels = BUNDESLAND_LABELS[language]

  const handleExportJson = async () => {
    const exportedState = await onExportJson()
    const blob = new Blob([JSON.stringify(exportedState, null, 2)], {
      type: 'application/json',
    })
    downloadBlob(blob, buildJsonExportFilename(today))
  }

  const handleRestoreFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setRestoreSuccess(null)
    setRestoreError(null)

    if (!window.confirm(t.restoreWarning)) {
      event.target.value = ''
      return
    }

    try {
      const parsedState = JSON.parse(await file.text()) as BrowserStorageState
      await onRestoreSnapshot(parsedState)
      setRestoreError(null)
      setRestoreSuccess(t.restoreSucceeded)
    } catch (error) {
      setRestoreSuccess(null)
      if (error instanceof SyntaxError) {
        setRestoreError(t.restoreInvalidJson)
      } else {
        setRestoreError(error instanceof Error ? error.message : t.restoreFailed)
      }
    } finally {
      event.target.value = ''
    }
  }

  return (
    <section className="settings-page" aria-label={t.settings}>
      <section className="settings-panel" role="region" aria-label={t.personalSettings}>
        <div className="summary-panel-head">
          <div>
            <p className="eyebrow">{t.settings}</p>
            <h2>{t.personalSettings}</h2>
          </div>
        </div>

        <div className="settings-page-grid">
          <fieldset className="settings-fieldset">
            <legend>{t.language}</legend>
            <label className="settings-choice">
              <input
                type="radio"
                name="language"
                checked={snapshot.preferences.language === 'de'}
                onChange={() => onUpdatePreferences({ language: 'de' })}
              />
              <span>{t.german}</span>
            </label>
            <label className="settings-choice">
              <input
                type="radio"
                name="language"
                checked={snapshot.preferences.language === 'en'}
                onChange={() => onUpdatePreferences({ language: 'en' })}
              />
              <span>{t.english}</span>
            </label>
          </fieldset>

          <fieldset className="settings-fieldset">
            <legend>{t.theme}</legend>
            <label className="settings-choice">
              <input
                type="radio"
                name="theme"
                checked={snapshot.preferences.theme === 'light'}
                onChange={() => onUpdatePreferences({ theme: 'light' })}
              />
              <span>{t.themeLight}</span>
            </label>
            <label className="settings-choice">
              <input
                type="radio"
                name="theme"
                checked={snapshot.preferences.theme === 'dark'}
                onChange={() => onUpdatePreferences({ theme: 'dark' })}
              />
              <span>{t.themeDark}</span>
            </label>
            <label className="settings-choice">
              <input
                type="radio"
                name="theme"
                checked={snapshot.preferences.theme === 'system'}
                onChange={() => onUpdatePreferences({ theme: 'system' })}
              />
              <span>{t.themeSystem}</span>
            </label>
          </fieldset>

          <label className="settings-field">
            <span>{t.warningThreshold}</span>
            <input
              aria-label={t.warningThreshold}
              type="number"
              min={0}
              max={100}
              step={1}
              value={warningThresholdInput ?? String(warningThresholdPercentage)}
              onBlur={() => {
                setWarningThresholdInput(null)
              }}
              onChange={(event) => {
                const nextInput = event.target.value
                setWarningThresholdInput(nextInput)

                if (nextInput === '') {
                  return
                }

                const nextValue = Number(nextInput)

                if (Number.isNaN(nextValue) || nextValue < 0 || nextValue > 100) {
                  return
                }

                onUpdatePreferences({ warningThreshold: nextValue / 100 })
              }}
            />
          </label>

          <div className="backup-panel">
            <div className="backup-copy">
              <strong>{t.localBackup}</strong>
              <p>{t.localBackupLead}</p>
            </div>

            <div className="backup-actions">
              <button type="button" className="primary-button" onClick={() => void handleExportJson()}>
                {t.exportJson}
              </button>

              <label className="ghost-button file-trigger">
                <span>{t.restoreJson}</span>
                <input
                  aria-label={t.restoreJson}
                  type="file"
                  accept="application/json,.json"
                  className="visually-hidden"
                  onChange={(event) => {
                    void handleRestoreFileChange(event)
                  }}
                />
              </label>
            </div>

            {restoreSuccess ? (
              <p className="settings-feedback settings-feedback-success" role="status">
                {restoreSuccess}
              </p>
            ) : null}
            {restoreError ? (
              <p className="settings-feedback settings-feedback-error" role="alert">
                {restoreError}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="settings-panel" role="region" aria-label={t.policyHistory}>
        <div className="summary-panel-head">
          <div>
            <p className="eyebrow">{t.policyHistory}</p>
            <h2>{t.policyHistory}</h2>
          </div>
        </div>

        <div className="policy-history-page-body">
          <ol className="policy-history-list">
            {visiblePolicyHistory.map((entry) => (
              <li key={entry.effectiveMonth} className="policy-history-item">
                <strong>{entry.effectiveMonth}</strong>
                <span>
                  {t.quota} {Math.round(entry.quota * 100)} % · {t.federalState} {entry.bundesland}
                </span>
              </li>
            ))}
          </ol>

          <form
            key={`${latestPolicyEntry?.effectiveMonth ?? '1900-01'}-${latestPolicyEntry?.quota ?? 60}-${latestPolicyEntry?.bundesland ?? 'SL'}`}
            className="policy-form"
            onSubmit={(event) => {
              event.preventDefault()

              if (!event.currentTarget.reportValidity()) {
                return
              }

              const formData = new FormData(event.currentTarget)
              const quotaValue = Number(formData.get('quota'))
              const bundeslandValue = formData.get('bundesland')
              const effectiveMonthValue = formData.get('effectiveMonth')

              if (
                !Number.isFinite(quotaValue) ||
                quotaValue < 0 ||
                quotaValue > 100 ||
                typeof bundeslandValue !== 'string' ||
                typeof effectiveMonthValue !== 'string' ||
                effectiveMonthValue < minimumNextPolicyMonth
              ) {
                return
              }

              onAddPolicyHistoryEntry({
                effectiveMonth: effectiveMonthValue as EffectiveMonth,
                quota: quotaValue / 100,
                bundesland: bundeslandValue as PolicyHistoryEntry['bundesland'],
              })
            }}
          >
            <label className="settings-field">
              <span>{t.quota}</span>
              <input
                name="quota"
                aria-label={t.quota}
                type="number"
                min={0}
                max={100}
                step={1}
                required
                defaultValue={Math.round((latestPolicyEntry?.quota ?? 0.6) * 100)}
              />
            </label>

            <label className="settings-field">
              <span>{t.federalState}</span>
              <select name="bundesland" aria-label={t.federalState} defaultValue={latestPolicyEntry?.bundesland ?? 'SL'}>
                {BUNDESLAENDER.map((bundesland: (typeof BUNDESLAENDER)[number]) => (
                  <option key={bundesland} value={bundesland}>
                    {bundeslandLabels[bundesland]} ({bundesland})
                  </option>
                ))}
              </select>
            </label>

            <label className="settings-field">
              <span>{t.effectiveMonth}</span>
              <input
                name="effectiveMonth"
                aria-label={t.effectiveMonth}
                type="month"
                min={minimumNextPolicyMonth}
                required
                defaultValue={minimumNextPolicyMonth}
              />
            </label>

            <button type="submit" className="primary-button">
              {t.addEntry}
            </button>
          </form>
        </div>
      </section>
    </section>
  )
}

export default SettingsPage
