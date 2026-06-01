import {
  STATUS_LABELS,
  STATUS_SEQUENCE,
  capitalizeMonthHeading,
  formatFullDate,
  type TranslationDictionary,
} from '../model'
import type { DayEntryStatus } from '../../domain/monthEvaluation'

interface DetailDialogProps {
  detailDate: string | null
  detailStatus: DayEntryStatus | 'unset'
  detailNote: string
  language: 'de' | 'en'
  t: TranslationDictionary
  onClose: () => void
  onSetStatus: (status: DayEntryStatus | 'unset') => void
  onSetNote: (note: string) => void
  onSave: () => void
}

function DetailDialog({
  detailDate,
  detailStatus,
  detailNote,
  language,
  t,
  onClose,
  onSetStatus,
  onSetNote,
  onSave,
}: DetailDialogProps) {
  if (!detailDate) {
    return null
  }

  return (
    <div className="dialog-backdrop">
      <section className="detail-dialog" role="dialog" aria-modal="true" aria-label={t.editDay}>
        <div className="detail-dialog-head">
          <p className="eyebrow">{t.detailView}</p>
          <h2>{t.editDay}</h2>
          <p className="lead dialog-date">{capitalizeMonthHeading(formatFullDate(detailDate, language))}</p>
        </div>

        <fieldset className="detail-status-list">
          <legend>{t.status}</legend>
          {STATUS_SEQUENCE.map((status) => (
            <label key={status} className="detail-status-option">
              <input
                type="radio"
                name="detail-status"
                checked={detailStatus === status}
                onChange={() => {
                  onSetStatus(status)
                }}
              />
              <span>{STATUS_LABELS[language][status]}</span>
            </label>
          ))}
        </fieldset>

        <label className="detail-note-field">
          <span>{t.note}</span>
          <textarea
            aria-label={t.note}
            rows={4}
            value={detailNote}
            onChange={(event) => {
              onSetNote(event.target.value)
            }}
          />
        </label>

        <div className="detail-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            {t.cancel}
          </button>
          <button type="button" className="primary-button" onClick={onSave}>
            {t.save}
          </button>
        </div>
      </section>
    </div>
  )
}

export default DetailDialog
