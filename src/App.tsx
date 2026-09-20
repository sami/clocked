import { useEffect, useMemo, useRef, useState } from 'react'
import { Confirm } from './components/Confirm.tsx'
import { ExpectedTime } from './components/ExpectedTime.tsx'
import { Flags } from './components/Flags.tsx'
import { flagId } from './components/flagId.ts'
import { HouseRules } from './components/HouseRules.tsx'
import { ReviewSheet } from './components/ReviewSheet.tsx'
import { SavedSheets } from './components/SavedSheets.tsx'
import { SheetHeader } from './components/SheetHeader.tsx'
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
import { fromCsv, toCsv } from './review/csv.ts'
import { csvFilename, isoDate, readFile, saveCsv } from './review/download.ts'
import { outstanding, reviewItems } from './review/items.ts'
import {
  clearSheets,
  flagKey,
  EMPTY_NOTE,
  newSheetId,
  readSheets,
  setNote,
  upsertSheet,
  writeSheets,
  type ReviewNote,
  type SavedSheet,
} from './storage/sheets.ts'

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

/** The sheet being typed right now, before New commits it to the saved set. */
interface Current {
  readonly id: string
  readonly name: string
  readonly date: string
  readonly input: DayInput
  readonly notes: Readonly<Record<string, ReviewNote>>
}

function blankSheet(date: string): Current {
  return { id: newSheetId(), name: '', date, input: EMPTY_INPUT, notes: {} }
}

export default function App() {
  const today = useMemo(() => isoDate(new Date()), [])

  const [sheets, setSheetsState] = useState<readonly SavedSheet[]>(() =>
    readSheets(window.localStorage),
  )
  const [current, setCurrent] = useState<Current>(() => blankSheet(today))
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [view, setView] = useState<'day' | 'review'>('day')
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState('')

  const startField = useRef<HTMLInputElement>(null)
  const fileField = useRef<HTMLInputElement>(null)

  useEffect(() => {
    startField.current?.focus()
  }, [])

  /**
   * Change the saved set and write it through in the same breath.
   *
   * Persisting here rather than in an effect watching `sheets` means a
   * browser that refuses storage is reported at the moment it refuses,
   * which is the only moment the warning is any use.
   */
  function setSheets(next: readonly SavedSheet[]) {
    setSheetsState(next)
    if (!writeSheets(window.localStorage, next)) {
      setMessage('This browser refused to save. Export the CSV before you close the tab.')
    }
  }

  const day = useMemo(() => toDay(current.input), [current.input])
  const evaluation = useMemo(() => evaluateDay(day, settings), [day, settings])
  const { totals, flags } = evaluation

  const provisional = flags.some((each) => each.severity !== 'note')
  const saved = useMemo(() => sheets.map((each) => each.id), [sheets])
  const isSaved = saved.includes(current.id)

  /** Worth keeping: it has a name, or somebody has typed a punch into it. */
  function hasContent(sheet: Current): boolean {
    const { start, finish, tBreak, lunch, extra } = sheet.input
    return (
      sheet.name.trim() !== '' ||
      [start, finish, tBreak.out, tBreak.in, lunch.out, lunch.in].some((each) => each !== '') ||
      extra.length > 0
    )
  }

  /** Fold the current sheet into the saved set, if there is anything to fold. */
  function commit(sheet: Current): readonly SavedSheet[] {
    if (!hasContent(sheet)) return sheets
    return upsertSheet(sheets, { ...sheet, settings })
  }

  function edit(punch: PunchId, text: string) {
    setCurrent((now) => ({ ...now, input: setPunch(now.input, punch, text) }))
    setMessage('')
  }

  function note(key: string, patch: Partial<ReviewNote>) {
    setCurrent((now) => ({
      ...now,
      notes: { ...now.notes, [key]: { ...EMPTY_NOTE, ...now.notes[key], ...patch } },
    }))
  }

  /** Save what is on screen and start the next person. */
  function startNew() {
    const kept = commit(current)
    setSheets(kept)
    setCurrent(blankSheet(today))
    setMessage(hasContent(current) ? 'Saved. Next sheet.' : 'Nothing to save yet.')
    startField.current?.focus()
  }

  function wipeEverything() {
    clearSheets(window.localStorage)
    setSheets([])
    setCurrent(blankSheet(today))
    setConfirming(false)
    setMessage('Everything cleared.')
    startField.current?.focus()
  }

  function openSheet(id: string) {
    // Keep what is on screen first, or reopening loses it.
    const kept = commit(current)
    const wanted = kept.find((each) => each.id === id)
    if (!wanted) return

    setSheets(kept)
    setCurrent({
      id: wanted.id,
      name: wanted.name,
      date: wanted.date,
      input: wanted.input,
      notes: wanted.notes,
    })
    setSettings(wanted.settings)
    setView('day')
    setMessage('')
  }

  function show(next: 'day' | 'review') {
    // The review list has to include the sheet still on screen.
    if (next === 'review') setSheets(commit(current))
    setView(next)
  }

  function exportCsv() {
    const all = commit(current)
    setSheets(all)
    if (all.length === 0) {
      setMessage('Nothing to export yet.')
      return
    }
    saveCsv(csvFilename(new Date()), toCsv(all))
    setMessage(`Exported ${all.length === 1 ? '1 sheet' : `${all.length} sheets`}.`)
  }

  async function importCsv(file: File) {
    const loadedSheets = fromCsv(await readFile(file))
    if (loadedSheets.length === 0) {
      setMessage('That file had nothing Clocked could read.')
      return
    }

    // Anything with the same id replaces what is here, so importing the
    // file you exported this morning picks up where you left off.
    setSheets(loadedSheets.reduce<readonly SavedSheet[]>(upsertSheet, sheets))
    setMessage(`Loaded ${loadedSheets.length === 1 ? '1 sheet' : `${loadedSheets.length} sheets`}.`)
  }

  const items = reviewItems(sheets)
  const left = outstanding(items)

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="no-print">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Clocked</h1>
        <p className="mt-1 text-sm text-ink-muted">
          One sheet at a time. Flag what needs chasing, then work through the list. Everything
          stays on this machine.
        </p>
      </header>

      <nav className="no-print flex gap-2" aria-label="Views">
        <Tab active={view === 'day'} onClick={() => show('day')}>
          Timesheet
        </Tab>
        <Tab active={view === 'review'} onClick={() => show('review')}>
          Review list{items.length > 0 ? ` (${left})` : ''}
        </Tab>
      </nav>

      {message !== '' && (
        <p role="status" className="no-print rounded-md border border-line px-3 py-2 text-sm text-ink">
          {message}
        </p>
      )}

      {view === 'review' ? (
        <ReviewSheet
          sheets={sheets}
          onNote={(sheetId, key, patch) =>
            setSheets(sheets.map((each) => (each.id === sheetId ? setNote(each, key, patch) : each)))
          }
        />
      ) : (
        <>
          <form
            className="no-print flex flex-col gap-4"
            onSubmit={(event) => event.preventDefault()}
            aria-label="Timesheet"
          >
            <SheetHeader
              name={current.name}
              date={current.date}
              onName={(name) => setCurrent((now) => ({ ...now, name }))}
              onDate={(date) => setCurrent((now) => ({ ...now, date }))}
            />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {STANDARD_FIELDS.map((field) => {
                const attached = flags.filter((each) => each.target === field.punch)
                return (
                  <TimeField
                    key={field.punch}
                    ref={field.punch === 'start' ? startField : undefined}
                    punch={field.punch}
                    label={field.label}
                    value={valueOf(current.input, field.punch)}
                    onChange={edit}
                    flagged={attached.length > 0}
                    describedBy={attached.map(flagId).join(' ') || undefined}
                  >
                    {attached.map((flag) => {
                      const key = flagKey(flag)
                      return (
                        <ExpectedTime
                          key={key}
                          id={`expected-${key.replace(/[@.]/g, '-')}`}
                          label={field.label.toLowerCase()}
                          note={current.notes[key] ?? EMPTY_NOTE}
                          onChange={(patch) => note(key, patch)}
                        />
                      )
                    })}
                  </TimeField>
                )
              })}
            </div>

            {/* Extra rows come after the six fields, so the standard tab order
                is untouched and nothing above them moves when one is added. */}
            {current.input.extra.map((extra, index) => (
              <fieldset key={index} className="rounded-md border border-line p-3">
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
                          setCurrent((now) => ({
                            ...now,
                            input: setExtraPaid(now.input, index, event.target.checked),
                          }))
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
                    onClick={() =>
                      setCurrent((now) => ({ ...now, input: removeExtraBreak(now.input, index) }))
                    }
                    className="text-accent underline"
                  >
                    Remove
                  </button>
                </div>
              </fieldset>
            ))}

            <div className="flex flex-wrap gap-3 text-sm">
              {(['tbreak', 'lunch', 'other'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setCurrent((now) => ({ ...now, input: addExtraBreak(now.input, type) }))
                  }
                  className="text-accent underline"
                >
                  Add {BREAK_NAMES[type].toLowerCase()}
                </button>
              ))}
            </div>
          </form>

          <div className="no-print">
            <Totals totals={totals} provisional={provisional} />
          </div>

          <div className="no-print">
            <Flags flags={flags} onAccept={edit} />
          </div>

          <div className="no-print flex flex-wrap gap-3">
            <button
              type="button"
              onClick={startNew}
              className="rounded-md bg-accent px-4 py-2 font-medium text-surface-raised"
            >
              New {isSaved ? '(update and start next)' : '(save and start next)'}
            </button>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(summariseDay(day, evaluation))
                setMessage('Result copied.')
              }}
              className="rounded-md border border-line px-4 py-2 font-medium text-ink"
            >
              Copy result
            </button>
            <button
              type="button"
              onClick={() => setCurrent((now) => ({ ...now, input: EXAMPLE_INPUT }))}
              className="rounded-md border border-line px-4 py-2 font-medium text-ink"
            >
              Example day
            </button>
          </div>

          <div className="no-print">
            <SavedSheets sheets={sheets} currentId={current.id} onOpen={openSheet} />
          </div>

          <div className="no-print">
            <HouseRules settings={settings} onChange={setSettings} />
          </div>
        </>
      )}

      <section aria-label="Your data" className="no-print flex flex-col gap-3 border-t border-line pt-4">
        <p className="text-sm text-ink-muted">
          Saved sheets live in this browser only, and logging out of the computer clears them.
          Export the CSV before you finish, and load it back tomorrow to carry on.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-md border border-line px-4 py-2 font-medium text-ink"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => fileField.current?.click()}
            className="rounded-md border border-line px-4 py-2 font-medium text-ink"
          >
            Load CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md border border-line px-4 py-2 font-medium text-ink"
          >
            Print checklist
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-md border border-error px-4 py-2 font-medium text-error"
          >
            Clear everything
          </button>
        </div>

        <input
          ref={fileField}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          aria-label="Load a CSV of saved sheets"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void importCsv(file)
            event.target.value = ''
          }}
        />
      </section>

      <p className="no-print text-xs text-ink-muted">
        T-breaks are paid and never change the total. Lunch is unpaid and comes off at its actual
        length. Clocked never invents a break and never guesses in silence.
      </p>

      <Confirm
        open={confirming}
        title="Clear everything?"
        body={`This deletes the sheet on screen and all ${sheets.length} saved ${
          sheets.length === 1 ? 'sheet' : 'sheets'
        }, including the review list. It cannot be undone. Export the CSV first if you need it.`}
        confirmLabel="Delete everything"
        onConfirm={wipeEverything}
        onCancel={() => setConfirming(false)}
      />
    </main>
  )
}

function Tab({
  active,
  onClick,
  children,
}: {
  readonly active: boolean
  readonly onClick: () => void
  readonly children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
        active ? 'border-accent text-accent' : 'border-line text-ink-muted'
      }`}
    >
      {children}
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
