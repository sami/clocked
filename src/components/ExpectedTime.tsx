import type { ReviewNote } from '../storage/sheets.ts'

interface ExpectedTimeProps {
  readonly id: string
  /** What the flag is about, so the label says which punch is missing. */
  readonly label: string
  readonly note: ReviewNote
  readonly onChange: (note: Partial<ReviewNote>) => void
}

/**
 * The time you say a missing punch should have been.
 *
 * It sits under the input it belongs to, so the judgement is recorded next
 * to the gap that prompted it rather than somewhere else on the page. It
 * never touches the total: it is a note for the review list, not a punch.
 */
export function ExpectedTime({ id, label, note, onChange }: ExpectedTimeProps) {
  return (
    <div className="mt-1 rounded-md border border-flag/40 bg-flag/5 p-2">
      <label htmlFor={id} className="text-xs text-ink-muted">
        Expected {label}
      </label>
      <input
        id={id}
        value={note.expected}
        onChange={(event) => onChange({ expected: event.target.value })}
        inputMode="numeric"
        autoComplete="off"
        placeholder="0915"
        className="mt-1 w-full rounded-sm border border-line bg-surface-raised px-2 py-1 font-mono text-sm tabular-nums text-ink"
      />
    </div>
  )
}
