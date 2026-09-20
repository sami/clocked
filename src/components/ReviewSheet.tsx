import { outstanding, reviewItems, type ReviewItem } from '../review/items.ts'
import type { ReviewNote, SavedSheet } from '../storage/sheets.ts'

interface ReviewSheetProps {
  readonly sheets: readonly SavedSheet[]
  readonly onNote: (sheetId: string, key: string, note: Partial<ReviewNote>) => void
}

/**
 * The checklist: everything flagged, oldest shift first.
 *
 * Chasing an item up means asking the person, asking their manager, or
 * looking at a recording. None of that is this app's business. All it does
 * is hold the list, the time you expected, a tick, and the time confirmed.
 *
 * Built as a table so it prints as a checklist on paper.
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
          {items.length} flagged, {left} still to chase. Ordered by date of shift.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line text-ink-muted">
              <Th>Date</Th>
              <Th>Name</Th>
              <Th>What needs checking</Th>
              <Th>Expected</Th>
              <Th>Done</Th>
              <Th>Actual</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <Row key={`${item.sheetId}-${item.key}`} item={item} onNote={onNote} />
            ))}
          </tbody>
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
      <Td>
        <span className="font-mono tabular-nums">{item.date || 'no date'}</span>
      </Td>
      <Td>{item.name || 'Unnamed'}</Td>
      <Td>
        <span className="text-ink">{item.reason}</span>
      </Td>
      <Td>
        <span className="font-mono tabular-nums">{item.expected || '—'}</span>
      </Td>
      <Td>
        {/* A printed checklist needs a box to tick by hand, so the checkbox
            stays visible on paper rather than being hidden for print. */}
        <label htmlFor={tickId} className="sr-only">
          Reviewed: {item.name} {item.date}
        </label>
        <input
          id={tickId}
          type="checkbox"
          checked={item.reviewed}
          onChange={(event) => onNote(item.sheetId, item.key, { reviewed: event.target.checked })}
        />
      </Td>
      <Td>
        <label htmlFor={actualId} className="sr-only">
          Actual time confirmed: {item.name} {item.date}
        </label>
        <input
          id={actualId}
          value={item.actual}
          onChange={(event) => onNote(item.sheetId, item.key, { actual: event.target.value })}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0915"
          className="w-24 rounded-sm border border-line bg-surface-raised px-2 py-1 font-mono text-sm tabular-nums text-ink"
        />
      </Td>
    </tr>
  )
}

function Th({ children }: { readonly children: React.ReactNode }) {
  return <th className="px-2 py-2 font-medium">{children}</th>
}

function Td({ children }: { readonly children: React.ReactNode }) {
  return <td className="px-2 py-2">{children}</td>
}
