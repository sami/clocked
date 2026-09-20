import type { DayResult } from '../engine/day.ts'
import { formatDuration } from '../engine/time.ts'

interface TotalsProps {
  readonly totals: DayResult
  /** True when any flag changed the numbers or blocks them being trusted. */
  readonly provisional: boolean
}

/**
 * The four numbers, updating as you type.
 *
 * A total resting on an assumption is labelled as such right here, because
 * the spec is explicit that it must never look like one built from real
 * punches.
 */
export function Totals({ totals, provisional }: TotalsProps) {
  return (
    <section aria-label="Totals" className="rounded-lg border border-line bg-surface-raised p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-ink-muted">Actual work time</h2>
        {provisional && (
          <span className="rounded-sm bg-flag/15 px-2 py-0.5 text-xs font-medium text-flag">
            Check the flags
          </span>
        )}
      </div>

      <p
        aria-live="polite"
        className="mt-1 font-mono text-4xl font-semibold tabular-nums text-ink"
      >
        {totals.workTime === null ? '—' : formatDuration(totals.workTime)}
      </p>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <Figure label="Gross" value={totals.gross} />
        <Figure label="Paid breaks" value={totals.paidBreaks} />
        <Figure label="Unpaid breaks" value={totals.unpaidBreaks} />
      </dl>
    </section>
  )
}

function Figure({ label, value }: { readonly label: string; readonly value: number | null }) {
  return (
    <div>
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-mono tabular-nums text-ink">
        {value === null ? '—' : formatDuration(value)}
      </dd>
    </div>
  )
}
