import type { Flag, FlagSeverity } from '../engine/rules.ts'
import { flagId } from './flagId.ts'

interface FlagsProps {
  readonly flags: readonly Flag[]
}

const SEVERITY: Readonly<Record<FlagSeverity, { label: string; classes: string }>> = {
  'needs-input': { label: 'Needs you', classes: 'border-flag bg-flag/10' },
  assumption: { label: 'Assumed', classes: 'border-flag bg-flag/5' },
  note: { label: 'Note', classes: 'border-line bg-surface' },
}

/** Every flag, each with the reason the rule gave for raising it. */
export function Flags({ flags }: FlagsProps) {
  if (flags.length === 0) return null

  return (
    <section aria-label="Flags" className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-ink-muted">
        {flags.length === 1 ? '1 thing to check' : `${flags.length} things to check`}
      </h2>

      <ul className="flex flex-col gap-2">
        {flags.map((flag) => {
          const severity = SEVERITY[flag.severity]
          return (
            <li
              key={`${flag.code}-${flag.target}`}
              id={flagId(flag)}
              className={`rounded-md border p-3 text-sm ${severity.classes}`}
            >
              <p className="text-ink">
                <span className="font-medium">{severity.label}. </span>
                {flag.reason}
              </p>

            </li>
          )
        })}
      </ul>
    </section>
  )
}
