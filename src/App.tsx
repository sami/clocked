import { useEffect, useMemo, useRef, useState } from 'react'
import { Flags } from './components/Flags.tsx'
import { HouseRules } from './components/HouseRules.tsx'
import { flagId } from './components/flagId.ts'
import { TimeField } from './components/TimeField.tsx'
import { Totals } from './components/Totals.tsx'
import {
  addExtraBreak,
  EMPTY_INPUT,
  EXAMPLE_INPUT,
  removeExtraBreak,
  setExtraPaid,
  setPunch,
  toDay,
  type DayInput,
} from './day/input.ts'
import { DEFAULT_SETTINGS, type BreakType, type PunchId, type Settings } from './engine/day.ts'
import { evaluateDay } from './engine/rules.ts'
import { summariseDay } from './engine/summary.ts'

/** The six standard fields, in the order they are typed and tabbed through. */
const STANDARD_FIELDS: readonly { punch: PunchId; label: string }[] = [
  { punch: 'start', label: 'Start' },
  { punch: 'tBreak.out', label: 'T-break out' },
  { punch: 'tBreak.in', label: 'T-break in' },
  { punch: 'lunch.out', label: 'Lunch out' },
  { punch: 'lunch.in', label: 'Lunch in' },
  { punch: 'finish', label: 'Finish' },
]

const BREAK_NAMES: Readonly<Record<BreakType, string>> = {
  tbreak: 'T-break',
  lunch: 'Lunch',
  other: 'Break',
}

export default function App() {
  const [input, setInput] = useState<DayInput>(EMPTY_INPUT)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [copied, setCopied] = useState(false)
  const startField = useRef<HTMLInputElement>(null)

  // The cursor starts in the first field, because this is used one timesheet
  // after another and the first keystroke should always land somewhere useful.
  useEffect(() => {
    startField.current?.focus()
  }, [])

  const day = useMemo(() => toDay(input), [input])
  const evaluation = useMemo(() => evaluateDay(day, settings), [day, settings])
  const { totals, flags } = evaluation

  // A note changes nothing, so it should not cast doubt on the number.
  const provisional = flags.some((each) => each.severity !== 'note')

  function edit(punch: PunchId, text: string) {
    setInput((current) => setPunch(current, punch, text))
    setCopied(false)
  }

  function clear() {
    setInput(EMPTY_INPUT)
    setCopied(false)
    startField.current?.focus()
  }

  async function copy() {
    await navigator.clipboard.writeText(summariseDay(day, evaluation))
    setCopied(true)
  }

  /** The flags attached to one field, for aria-describedby. */
  function flagsFor(punch: PunchId) {
    return flags.filter((each) => each.target === punch)
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Clocked</h1>
        <p className="mt-1 text-sm text-ink-muted">
          One day at a time. Type the punches and read off the total. Nothing is stored
          and nothing is sent.
        </p>
      </header>

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => event.preventDefault()}
        aria-label="Day"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {STANDARD_FIELDS.map((field) => {
            const attached = flagsFor(field.punch)
            return (
              <TimeField
                key={field.punch}
                ref={field.punch === 'start' ? startField : undefined}
                punch={field.punch}
                label={field.label}
                value={valueOf(input, field.punch)}
                onChange={edit}
                flagged={attached.length > 0}
                describedBy={attached.map(flagId).join(' ') || undefined}
              />
            )
          })}
        </div>

        {/* Extra rows come after the six fields, so the standard tab order is
            untouched and nothing above them moves when one is added. */}
        {input.extra.map((extra, index) => (
          <fieldset
            key={index}
            className="rounded-md border border-line p-3"
          >
            <legend className="px-1 text-sm text-ink-muted">
              {BREAK_NAMES[extra.type]} {index + 1}
            </legend>

            <div className="grid grid-cols-2 gap-3">
              <TimeField
                punch={`extra.${index}.out`}
                label="Out"
                value={extra.out}
                onChange={edit}
              />
              <TimeField
                punch={`extra.${index}.in`}
                label="In"
                value={extra.in}
                onChange={edit}
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
              {extra.type === 'other' ? (
                <label className="flex items-center gap-2 text-ink-muted">
                  <input
                    type="checkbox"
                    checked={extra.paid ?? false}
                    onChange={(event) =>
                      setInput((current) => setExtraPaid(current, index, event.target.checked))
                    }
                  />
                  Paid
                </label>
              ) : (
                <span className="text-ink-muted">
                  {extra.type === 'tbreak' ? 'Paid' : 'Unpaid'}
                </span>
              )}

              <button
                type="button"
                onClick={() => setInput((current) => removeExtraBreak(current, index))}
                className="text-accent underline"
              >
                Remove
              </button>
            </div>
          </fieldset>
        ))}

        <div className="flex flex-wrap gap-3 text-sm">
          <AddBreak type="tbreak" onAdd={setInput} />
          <AddBreak type="lunch" onAdd={setInput} />
          <AddBreak type="other" onAdd={setInput} />
        </div>
      </form>

      <Totals totals={totals} provisional={provisional} />

      <Flags flags={flags} onAccept={edit} />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={copy}
          className="rounded-md bg-accent px-4 py-2 font-medium text-surface-raised"
        >
          {copied ? 'Copied' : 'Copy result'}
        </button>
        <button
          type="button"
          onClick={clear}
          className="rounded-md border border-line px-4 py-2 font-medium text-ink"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => {
            setInput(EXAMPLE_INPUT)
            setCopied(false)
          }}
          className="rounded-md border border-line px-4 py-2 font-medium text-ink"
        >
          Example day
        </button>
      </div>

      <HouseRules settings={settings} onChange={setSettings} />

      <p className="text-xs text-ink-muted">
        T-breaks are paid and never change the total. Lunch is unpaid and comes off at
        its actual length. Clocked never invents a break and never guesses in silence.
      </p>
    </main>
  )
}

function AddBreak({
  type,
  onAdd,
}: {
  readonly type: BreakType
  readonly onAdd: (update: (current: DayInput) => DayInput) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onAdd((current) => addExtraBreak(current, type))}
      className="text-accent underline"
    >
      Add {BREAK_NAMES[type].toLowerCase()}
    </button>
  )
}

/** Read one of the six standard fields out of the form state. */
function valueOf(input: DayInput, punch: PunchId): string {
  if (punch === 'start') return input.start
  if (punch === 'finish') return input.finish
  if (punch === 'tBreak.out') return input.tBreak.out
  if (punch === 'tBreak.in') return input.tBreak.in
  if (punch === 'lunch.out') return input.lunch.out
  if (punch === 'lunch.in') return input.lunch.in
  return ''
}
