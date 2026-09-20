import { forwardRef, type ReactNode } from 'react'
import type { PunchId } from '../engine/day.ts'

interface TimeFieldProps {
  readonly punch: PunchId
  readonly label: string
  readonly value: string
  readonly onChange: (punch: PunchId, text: string) => void
  /** Ids of the flags about this field, so a screen reader reads them with it. */
  readonly describedBy?: string
  readonly flagged?: boolean
  /** Rendered under the input, for the expected time when this one is flagged. */
  readonly children?: ReactNode
}

/**
 * One time input, labelled.
 *
 * Numeric keypad on a phone, no autocomplete, and no browser time picker. A
 * native time input costs several taps and forbids the shorthand the whole
 * speed target depends on.
 */
export const TimeField = forwardRef<HTMLInputElement, TimeFieldProps>(function TimeField(
  { punch, label, value, onChange, describedBy, flagged, children },
  ref,
) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={punch} className="text-sm text-ink-muted">
        {label}
      </label>
      <input
        ref={ref}
        id={punch}
        name={punch}
        value={value}
        onChange={(event) => onChange(punch, event.target.value)}
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        placeholder="0915"
        aria-describedby={describedBy}
        aria-invalid={flagged || undefined}
        className={`w-full rounded-md border bg-surface-raised px-3 py-2 font-mono text-lg tabular-nums text-ink ${
          flagged ? 'border-flag' : 'border-line'
        }`}
      />
      {children}
    </div>
  )
})
