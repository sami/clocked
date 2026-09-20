/**
 * The review list: everything flagged across every saved sheet.
 *
 * One row per flag, date ordered, ready to print as a checklist and work
 * through. Chasing a flag up means asking somebody or checking a recording,
 * which is none of this app's business. All it does is hold the list, the
 * time you expected, and what you found out.
 */

import { toDay } from '../day/input.ts'
import { evaluateDay, type FlagCode } from '../engine/rules.ts'
import { flagKey, noteFor, type SavedSheet } from '../storage/sheets.ts'

export interface ReviewItem {
  readonly sheetId: string
  readonly key: string
  readonly name: string
  /** The date of the shift, as YYYY-MM-DD. */
  readonly date: string
  readonly code: FlagCode
  readonly target: string
  /** The plain English reason, straight from the rule that raised it. */
  readonly reason: string
  readonly expected: string
  readonly reviewed: boolean
  readonly actual: string
}

/**
 * Every flag on every sheet, oldest shift first.
 *
 * Ordered by date, then name, so a checklist reads the way you work through
 * it. Sheets with nothing flagged contribute nothing.
 */
export function reviewItems(sheets: readonly SavedSheet[]): ReviewItem[] {
  const items: ReviewItem[] = []

  for (const sheet of sheets) {
    const { flags } = evaluateDay(toDay(sheet.input), sheet.settings)

    for (const flag of flags) {
      const key = flagKey(flag)
      const note = noteFor(sheet, key)

      items.push({
        sheetId: sheet.id,
        key,
        name: sheet.name,
        date: sheet.date,
        code: flag.code,
        target: flag.target,
        reason: flag.reason,
        expected: note.expected,
        reviewed: note.reviewed,
        actual: note.actual,
      })
    }
  }

  return items.sort(byDateThenName)
}

/** How many are still to be chased. */
export function outstanding(items: readonly ReviewItem[]): number {
  return items.filter((each) => !each.reviewed).length
}

// Dates are YYYY-MM-DD, which sorts correctly as text, so no date maths and
// no library. An empty date sorts last, since an undated sheet is the one
// you want to notice at the bottom of the list.
function byDateThenName(a: ReviewItem, b: ReviewItem): number {
  if (a.date !== b.date) {
    if (a.date === '') return 1
    if (b.date === '') return -1
    return a.date < b.date ? -1 : 1
  }
  if (a.name !== b.name) return a.name < b.name ? -1 : 1
  return a.key < b.key ? -1 : 1
}
