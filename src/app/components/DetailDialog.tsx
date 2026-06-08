import { useEffect, useRef } from 'react'
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
  const dialogRef = useRef<HTMLElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (detailDate) {
      previousFocusRef.current = document.activeElement as HTMLElement | null

      requestAnimationFrame(() => {
        const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        firstFocusable?.focus()
      })
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
  }, [detailDate])

  if (!detailDate) {
    return null
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose()
      return
    }

    if (event.key !== 'Tab') return

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )

    if (!focusable || focusable.length === 0) return

    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="dialog-backdrop" onKeyDown={handleKeyDown}>
      <section className="detail-dialog" role="dialog" aria-modal="true" aria-label={t.editDay} ref={dialogRef}>
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
