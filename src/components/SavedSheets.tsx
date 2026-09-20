import type { SavedSheet } from '../storage/sheets.ts'
import { reviewItems } from '../review/items.ts'

interface SavedSheetsProps {
  readonly sheets: readonly SavedSheet[]
  readonly currentId: string | null
  readonly onOpen: (id: string) => void
}

/**
 * The sheets saved so far this session.
 *
 * Reopening loads one back exactly as it was typed, so a sheet can be
 * corrected after the fact without starting it again.
 */
export function SavedSheets({ sheets, currentId, onOpen }: SavedSheetsProps) {
  if (sheets.length === 0) return null

  return (
    <section aria-label="Saved sheets" className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-ink-muted">
        {sheets.length === 1 ? '1 saved sheet' : `${sheets.length} saved sheets`}
      </h2>

      <ul className="flex flex-col gap-1">
        {[...sheets]
          .sort((a, b) => (a.date === b.date ? a.name.localeCompare(b.name) : a.date < b.date ? -1 : 1))
          .map((sheet) => {
            const flags = reviewItems([sheet]).length
            return (
              <li key={sheet.id}>
                <button
                  type="button"
                  onClick={() => onOpen(sheet.id)}
                  aria-current={sheet.id === currentId || undefined}
                  className={`flex w-full flex-wrap items-baseline justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm ${
                    sheet.id === currentId ? 'border-accent' : 'border-line'
                  }`}
                >
                  <span className="font-medium text-ink">{sheet.name || 'Unnamed'}</span>
                  <span className="font-mono text-ink-muted">{sheet.date || 'no date'}</span>
                  <span className={flags > 0 ? 'text-flag' : 'text-ink-muted'}>
                    {flags === 0 ? 'clear' : flags === 1 ? '1 flag' : `${flags} flags`}
                  </span>
                </button>
              </li>
            )
          })}
      </ul>
    </section>
  )
}
