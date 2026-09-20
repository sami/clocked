/**
 * The CSV round trip.
 *
 * On a machine that clears its browser data at logout, this file is the only
 * thing that survives the day. So it carries the whole picture, not just the
 * checklist: the punches as typed, the settings, and every note. Import
 * rebuilds the saved sheets from it.
 *
 * The readable columns come first, so the file opens in a spreadsheet as a
 * usable checklist. The two machine columns sit at the end, out of the way.
 */

import { EMPTY_INPUT, type DayInput } from '../day/input.ts'
import { DEFAULT_SETTINGS, type Settings } from '../engine/day.ts'
import {
  EMPTY_NOTE,
  newSheetId,
  type ReviewNote,
  type SavedSheet,
} from '../storage/sheets.ts'
import { reviewItems } from './items.ts'

const COLUMNS = [
  'date',
  'name',
  'needs_checking',
  'expected',
  'reviewed',
  'actual',
  'flag_code',
  'flag_target',
  'start',
  'tbreak_out',
  'tbreak_in',
  'lunch_out',
  'lunch_in',
  'finish',
  'sheet_id',
  'extra_json',
  'settings_json',
] as const

/**
 * Render every saved sheet as CSV.
 *
 * A sheet with nothing flagged still gets a row, with the flag columns empty,
 * so a clean day is not quietly lost on the way out.
 */
export function toCsv(sheets: readonly SavedSheet[]): string {
  const items = reviewItems(sheets)
  const rows: string[][] = [[...COLUMNS]]

  for (const sheet of sheets) {
    const mine = items.filter((each) => each.sheetId === sheet.id)

    if (mine.length === 0) {
      rows.push(row(sheet, null))
      continue
    }
    for (const item of mine) rows.push(row(sheet, item))
  }

  return rows.map((each) => each.map(escape).join(',')).join('\r\n')
}

/**
 * Rebuild the saved sheets from a CSV.
 *
 * Rows are grouped by sheet id, so the punches are read once per sheet and
 * each flag row contributes its note. Columns are found by name, so a file
 * someone has reordered in a spreadsheet still loads.
 */
export function fromCsv(text: string): SavedSheet[] {
  const table = parseCsv(text)
  if (table.length < 2) return []

  const header = table[0] ?? []
  const at = (name: string) => header.indexOf(name)
  if (at('sheet_id') === -1) return []

  const cell = (line: readonly string[], name: string) => line[at(name)]?.trim() ?? ''

  const sheets = new Map<string, SavedSheet>()

  for (const line of table.slice(1)) {
    if (line.every((each) => each.trim() === '')) continue

    const id = cell(line, 'sheet_id') || newSheetId()

    const existing = sheets.get(id)
    const sheet: SavedSheet = existing ?? {
      id,
      name: cell(line, 'name'),
      date: cell(line, 'date'),
      input: inputFrom(line, cell),
      settings: settingsFrom(cell(line, 'settings_json')),
      notes: {},
    }

    const code = cell(line, 'flag_code')
    const target = cell(line, 'flag_target')
    const note = noteFrom(line, cell)

    // An empty note is not worth storing. A flag with nothing written
    // against it reads the same whether the key is there or not, and
    // leaving it out keeps a reimported file identical to what went out.
    const keep = code !== '' && target !== '' && written(note)

    sheets.set(id, {
      ...sheet,
      notes: keep ? { ...sheet.notes, [`${code}@${target}`]: note } : sheet.notes,
    })
  }

  return [...sheets.values()]
}

function row(sheet: SavedSheet, item: ReturnType<typeof reviewItems>[number] | null): string[] {
  return [
    sheet.date,
    sheet.name,
    item?.short ?? '',
    item?.expected ?? '',
    item ? (item.reviewed ? 'yes' : 'no') : '',
    item?.actual ?? '',
    item?.code ?? '',
    item?.target ?? '',
    sheet.input.start,
    sheet.input.tBreak.out,
    sheet.input.tBreak.in,
    sheet.input.lunch.out,
    sheet.input.lunch.in,
    sheet.input.finish,
    sheet.id,
    JSON.stringify(sheet.input.extra),
    JSON.stringify(sheet.settings),
  ]
}

type Cell = (line: readonly string[], name: string) => string

function inputFrom(line: readonly string[], cell: Cell): DayInput {
  return {
    start: cell(line, 'start'),
    tBreak: { out: cell(line, 'tbreak_out'), in: cell(line, 'tbreak_in') },
    lunch: { out: cell(line, 'lunch_out'), in: cell(line, 'lunch_in') },
    finish: cell(line, 'finish'),
    extra: parseJson(cell(line, 'extra_json'), EMPTY_INPUT.extra),
  }
}

function settingsFrom(raw: string): Settings {
  return { ...DEFAULT_SETTINGS, ...parseJson(raw, {} as Partial<Settings>) }
}

function noteFrom(line: readonly string[], cell: Cell): ReviewNote {
  return {
    ...EMPTY_NOTE,
    expected: cell(line, 'expected'),
    reviewed: cell(line, 'reviewed').toLowerCase() === 'yes',
    actual: cell(line, 'actual'),
  }
}

/** True when somebody actually wrote something against the flag. */
function written(note: ReviewNote): boolean {
  return note.expected !== '' || note.actual !== '' || note.reviewed
}

/** A hand-edited file is likely. Anything unreadable falls back rather than throws. */
function parseJson<T>(raw: string, fallback: T): T {
  if (raw === '') return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** Quote a field only when it needs it, so the file stays readable. */
function escape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/**
 * Read CSV into rows of cells.
 *
 * Written out rather than pulled from a library, because a quoted field can
 * hold a comma or a newline and a split on ',' gets both wrong.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let quoted = false

  for (let at = 0; at < text.length; at += 1) {
    const character = text[at]

    if (quoted) {
      if (character !== '"') {
        value += character
      } else if (text[at + 1] === '"') {
        value += '"'
        at += 1
      } else {
        quoted = false
      }
      continue
    }

    if (character === '"') {
      quoted = true
    } else if (character === ',') {
      row.push(value)
      value = ''
    } else if (character === '\n' || character === '\r') {
      // Swallow the \n of a \r\n pair rather than starting an empty row.
      if (character === '\r' && text[at + 1] === '\n') at += 1
      row.push(value)
      rows.push(row)
      row = []
      value = ''
    } else {
      value += character
    }
  }

  if (value !== '' || row.length > 0) {
    row.push(value)
    rows.push(row)
  }

  return rows
}
