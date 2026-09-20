import { useState } from 'react'
import { DEFAULT_SETTINGS, type Rounding, type Settings } from '../engine/day.ts'
import { formatClock, parseTime } from '../engine/time.ts'

interface HouseRulesProps {
  readonly settings: Settings
  readonly onChange: (settings: Settings) => void
}

const ROUNDING: readonly { value: Rounding; label: string }[] = [
  { value: 'exact', label: 'Exact' },
  { value: 1, label: 'Nearest minute' },
  { value: 5, label: 'Nearest 5 minutes' },
  { value: 6, label: 'Nearest 6 minutes' },
  { value: 15, label: 'Nearest 15 minutes' },
]

/**
 * The settings, folded away.
 *
 * Kept below everything else and closed by default, so the six standard
 * fields keep the top of the page and the first few tab stops to themselves.
 *
 * The usual start and finish are what make a one-click proposal possible.
 * They are never applied on their own, only offered when a punch is missing.
 *
 * These two fields hold their own text, for the same reason the day form
 * does. Feeding a parsed value straight back into the box rewrites it under
 * the typist after a single keystroke, and nobody can type a time that way.
 */
export function HouseRules({ settings, onChange }: HouseRulesProps) {
  const [usual, setUsual] = useState({
    start: settings.usualStart === null ? '' : formatClock(settings.usualStart),
    finish: settings.usualFinish === null ? '' : formatClock(settings.usualFinish),
  })

  function editUsual(field: 'start' | 'finish', text: string) {
    setUsual((current) => ({ ...current, [field]: text }))
    onChange({
      ...settings,
      [field === 'start' ? 'usualStart' : 'usualFinish']: parseTime(text),
    })
  }

  function reset() {
    setUsual({ start: '', finish: '' })
    onChange(DEFAULT_SETTINGS)
  }

  return (
    <details className="rounded-lg border border-line bg-surface-raised p-3">
      <summary className="cursor-pointer text-sm font-medium text-ink-muted">
        House rules
      </summary>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-ink-muted">
          Usual start
          <input
            value={usual.start}
            onChange={(event) => editUsual('start', event.target.value)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="none"
            className="rounded-md border border-line bg-surface px-3 py-2 font-mono tabular-nums text-ink"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink-muted">
          Usual finish
          <input
            value={usual.finish}
            onChange={(event) => editUsual('finish', event.target.value)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="none"
            className="rounded-md border border-line bg-surface px-3 py-2 font-mono tabular-nums text-ink"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink-muted">
          Rounding
          <select
            value={String(settings.rounding)}
            onChange={(event) => onChange({ ...settings, rounding: toRounding(event.target.value) })}
            className="rounded-md border border-line bg-surface px-3 py-2 text-ink"
          >
            {ROUNDING.map((option) => (
              <option key={String(option.value)} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink-muted">
          Lunch is paid
          <span className="flex items-center gap-2 py-2 text-ink">
            <input
              type="checkbox"
              checked={settings.paid.lunch}
              onChange={(event) =>
                onChange({
                  ...settings,
                  paid: { ...settings.paid, lunch: event.target.checked },
                })
              }
            />
            <span className="text-sm text-ink-muted">
              Off by default. T-breaks are always paid.
            </span>
          </span>
        </label>
      </div>

      <button
        type="button"
        onClick={reset}
        className="mt-3 text-sm text-accent underline"
      >
        Reset house rules
      </button>
    </details>
  )
}

/** The select carries strings, so turn one back into a rounding step. */
function toRounding(value: string): Rounding {
  const step = Number(value)
  return ROUNDING.some((each) => each.value === step) ? (step as Rounding) : 'exact'
}
