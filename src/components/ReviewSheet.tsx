import type { ReactNode } from 'react'
import { shortDate } from '../review/dates.ts'
import { outstanding, reviewItems, type ReviewItem } from '../review/items.ts'
import type { ReviewNote, SavedSheet } from '../storage/sheets.ts'

interface ReviewSheetProps {
  readonly sheets: readonly SavedSheet[]
  readonly onNote: (sheetId: string, key: string, note: Partial<ReviewNote>) => void
}

/**
 * The checklist: everything flagged, grouped by the day of the shift.
 *
 * The date is a heading rather than a column, because a stack of timesheets
 * covers a handful of days and repeating the date on every row is noise.
 * What needs checking is a few words with the time in it, not a paragraph.
 *
 * Chasing an item up means asking the person, asking their manager, or
 * looking at a recording. None of that is this app's business. All it does
 * is hold the list, the time you expected, a tick, and the time confirmed.
 *
 * On paper the tick box and the confirmed time become blanks to write on,
 * because the whole point of printing it is filling it in by hand.
 */
export function ReviewSheet({ sheets, onNote }: ReviewSheetProps) {
  const items = reviewItems(sheets)
  const left = outstanding(items)

  if (items.length === 0) {
    return (
      <section aria-label="Review list">
        <h2 className="text-lg font-semibold text-ink">Review list</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Nothing flagged. Either every sheet was complete, or none have been saved yet.
        </p>
      </section>
    )
  }

  return (
    <section aria-label="Review list" className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold text-ink">Review list</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {items.length} flagged, {left} still to chase.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line text-ink-muted">
              <Th>Name</Th>
              <Th>Needs checking</Th>
              <Th>Expected</Th>
              <Th>Done</Th>
              <Th>Confirmed</Th>
            </tr>
          </thead>

          {groupByDate(items).map((group) => (
            <tbody key={group.date}>
              <tr>
                <th
                  colSpan={5}
                  className="border-b border-line pt-4 pb-1 text-left text-sm font-semibold text-ink"
                >
                  {shortDate(group.date)}
                </th>
              </tr>

              {group.items.map((item) => (
                <Row key={`${item.sheetId}-${item.key}`} item={item} onNote={onNote} />
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  )
}

function Row({
  item,
  onNote,
}: {
  readonly item: ReviewItem
  readonly onNote: ReviewSheetProps['onNote']
}) {
  const tickId = `done-${item.sheetId}-${item.key}`
  const actualId = `actual-${item.sheetId}-${item.key}`

  return (
    <tr className="border-b border-line align-top">
      <Td>{item.name || 'Unnamed'}</Td>
      <Td>
        <span className="text-ink">{item.short}</span>
      </Td>
      <Td>
        <span className="font-mono tabular-nums">{item.expected || '—'}</span>
      </Td>

      <Td>
        <label htmlFor={tickId} className="sr-only">
          Reviewed: {item.name} {item.short}
        </label>
        <input
          id={tickId}
          type="checkbox"
          checked={item.reviewed}
          onChange={(event) => onNote(item.sheetId, item.key, { reviewed: event.target.checked })}
          className="no-print"
        />
        <span className="print-only tick-box" aria-hidden="true" />
      </Td>

      <Td>
        <label htmlFor={actualId} className="sr-only">
          Actual time confirmed: {item.name} {item.short}
        </label>
        <input
          id={actualId}
          value={item.actual}
          onChange={(event) => onNote(item.sheetId, item.key, { actual: event.target.value })}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0915"
          className="no-print w-24 rounded-sm border border-line bg-surface-raised px-2 py-1 font-mono text-sm tabular-nums text-ink"
        />
        {/* Room to write the time in by hand, with whatever was already
            recorded printed above it so nothing is chased twice. */}
        <span className="print-only">
          {item.actual !== '' && <span className="font-mono">{item.actual}</span>}
          <span className="write-in" />
        </span>
      </Td>
    </tr>
  )
}

interface DateGroup {
  readonly date: string
  readonly items: ReviewItem[]
}

/** Items arrive date ordered, so a group ends when the date changes. */
function groupByDate(items: readonly ReviewItem[]): DateGroup[] {
  const groups: DateGroup[] = []

  for (const item of items) {
    const last = groups[groups.length - 1]
    if (last && last.date === item.date) last.items.push(item)
    else groups.push({ date: item.date, items: [item] })
  }

  return groups
}

function Th({ children }: { readonly children: ReactNode }) {
  return <th className="px-2 py-2 font-medium">{children}</th>
}

function Td({ children }: { readonly children: ReactNode }) {
  return <td className="px-2 py-2">{children}</td>
}
