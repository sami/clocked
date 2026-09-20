/**
 * Saved timesheets, kept in the browser.
 *
 * This is the one place Clocked keeps anything. It holds what you typed, not
 * what the engine made of it, so a sheet reopens exactly as you left it.
 *
 * Browser storage is not a safe place for this. Logging out of a work machine
 * commonly clears site data, which takes these sheets with it. Treat this as
 * the within-session convenience and the CSV as the real backup.
 */

import type { DayInput } from '../day/input.ts'
import type { Settings } from '../engine/day.ts'
import type { Flag } from '../engine/rules.ts'

/** Bumped only when the stored shape changes in a way that needs migrating. */
export const STORAGE_KEY = 'clocked.sheets.v1'

/** What you found out when you chased a flag up. */
export interface ReviewNote {
  /** The time you say it should have been. */
  readonly expected: string
  /** Ticked once the chase is done. */
  readonly reviewed: boolean
  /** The time actually confirmed, once you know it. */
  readonly actual: string
}

export const EMPTY_NOTE: ReviewNote = { expected: '', reviewed: false, actual: '' }

export interface SavedSheet {
  readonly id: string
  /** A name or an id. Whatever you need to find the person again. */
  readonly name: string
  /** The date of the shift, as YYYY-MM-DD. */
  readonly date: string
  readonly input: DayInput
  readonly settings: Settings
  /** Notes by flag key, so they survive the sheet being reopened. */
  readonly notes: Readonly<Record<string, ReviewNote>>
}

/** Just enough of the Storage interface to be faked in a test. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/**
 * A stable key for one flag.
 *
 * A flag is decided by its rule and what it points at, so this survives the
 * day being re-evaluated. An index into the flag list would not: adding a
 * punch reorders them, and a note would end up against the wrong thing.
 */
export function flagKey(flag: Pick<Flag, 'code' | 'target'>): string {
  return `${flag.code}@${flag.target}`
}

export function newSheetId(): string {
  return `sheet-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Read the saved sheets.
 *
 * Anything unreadable is dropped rather than thrown, because one corrupt
 * entry must not cost somebody the rest of their morning's work.
 */
export function readSheets(store: StorageLike): SavedSheet[] {
  let raw: string | null
  try {
    raw = store.getItem(STORAGE_KEY)
  } catch {
    // Storage can be switched off entirely. That is not an error worth
    // shouting about, it just means there is nothing saved.
    return []
  }

  if (raw === null) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }

  if (!Array.isArray(parsed)) return []
  return parsed.filter(isSheet)
}

/**
 * Write the saved sheets.
 *
 * @returns false when the browser refused, for instance in a private window
 *   or when the quota is full. The caller should say so rather than pretend.
 */
export function writeSheets(store: StorageLike, sheets: readonly SavedSheet[]): boolean {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(sheets))
    return true
  } catch {
    return false
  }
}

export function clearSheets(store: StorageLike): void {
  try {
    store.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to do. There is no state worth keeping if this fails.
  }
}

/** Add a sheet, or replace the one with the same id. */
export function upsertSheet(
  sheets: readonly SavedSheet[],
  sheet: SavedSheet,
): SavedSheet[] {
  const known = sheets.some((each) => each.id === sheet.id)
  return known ? sheets.map((each) => (each.id === sheet.id ? sheet : each)) : [...sheets, sheet]
}

export function removeSheet(sheets: readonly SavedSheet[], id: string): SavedSheet[] {
  return sheets.filter((each) => each.id !== id)
}

/** Set one note on one sheet, leaving everything else alone. */
export function setNote(sheet: SavedSheet, key: string, note: Partial<ReviewNote>): SavedSheet {
  return {
    ...sheet,
    notes: { ...sheet.notes, [key]: { ...EMPTY_NOTE, ...sheet.notes[key], ...note } },
  }
}

export function noteFor(sheet: SavedSheet, key: string): ReviewNote {
  return sheet.notes[key] ?? EMPTY_NOTE
}

/** A loose shape check, enough to know a stored entry is worth keeping. */
function isSheet(value: unknown): value is SavedSheet {
  if (typeof value !== 'object' || value === null) return false
  const each = value as Record<string, unknown>

  return (
    typeof each.id === 'string' &&
    typeof each.name === 'string' &&
    typeof each.date === 'string' &&
    typeof each.input === 'object' &&
    each.input !== null &&
    typeof each.notes === 'object' &&
    each.notes !== null
  )
}
