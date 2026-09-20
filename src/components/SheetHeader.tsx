interface SheetHeaderProps {
  readonly name: string
  readonly date: string
  readonly onName: (name: string) => void
  readonly onDate: (date: string) => void
}

/**
 * Who the sheet belongs to and which shift it covers.
 *
 * Both are needed before a sheet can be saved, because a flag you cannot
 * attach to a person and a date is not something you can chase up.
 */
export function SheetHeader({ name, date, onName, onDate }: SheetHeaderProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="sheet-name" className="text-sm text-ink-muted">
          Name or ID
        </label>
        <input
          id="sheet-name"
          value={name}
          onChange={(event) => onName(event.target.value)}
          autoComplete="off"
          placeholder="initials or ID"
          className="w-full rounded-md border border-line bg-surface-raised px-3 py-2 text-ink"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="sheet-date" className="text-sm text-ink-muted">
          Date of shift
        </label>
        <input
          id="sheet-date"
          type="date"
          value={date}
          onChange={(event) => onDate(event.target.value)}
          className="w-full rounded-md border border-line bg-surface-raised px-3 py-2 font-mono text-ink"
        />
      </div>
    </div>
  )
}
