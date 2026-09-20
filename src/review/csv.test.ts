import { describe, expect, it } from 'vitest'
import { EMPTY_INPUT, type DayInput } from '../day/input.ts'
import { DEFAULT_SETTINGS } from '../engine/day.ts'
import { setNote, type SavedSheet } from '../storage/sheets.ts'
import { fromCsv, parseCsv, toCsv } from './csv.ts'
import { reviewItems } from './items.ts'

function punches(over: Partial<DayInput> = {}): DayInput {
  return { ...EMPTY_INPUT, ...over }
}

function sheet(over: Partial<SavedSheet> = {}): SavedSheet {
  return {
    id: 'sheet-1',
    name: 'AB',
    date: '2026-09-21',
    input: EMPTY_INPUT,
    settings: DEFAULT_SETTINGS,
    notes: {},
    ...over,
  }
}

const NO_FINISH = punches({ start: '0900', lunch: { out: '1300', in: '1330' } })

describe('parseCsv', () => {
  it('reads plain rows', () => {
    expect(parseCsv('a,b\r\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  // The reason this is not a split on a comma.
  it('reads a quoted field holding a comma, a quote or a newline', () => {
    expect(parseCsv('a,"one, two"')).toEqual([['a', 'one, two']])
    expect(parseCsv('a,"he said ""no"""')).toEqual([['a', 'he said "no"']])
    expect(parseCsv('a,"line\nbreak"')).toEqual([['a', 'line\nbreak']])
  })

  it('handles either line ending', () => {
    expect(parseCsv('a\r\nb\nc')).toEqual([['a'], ['b'], ['c']])
  })
})

describe('the round trip', () => {
  it('brings a sheet back exactly as it went out', () => {
    const original = sheet({ input: NO_FINISH })
    expect(fromCsv(toCsv([original]))).toEqual([original])
  })

  it('keeps the notes against the right flags', () => {
    const noted = setNote(sheet({ input: NO_FINISH }), 'missing-finish@finish', {
      expected: '1730',
      reviewed: true,
      actual: '1742',
    })
    const back = fromCsv(toCsv([noted]))
    expect(back[0]?.notes['missing-finish@finish']).toEqual({
      expected: '1730',
      reviewed: true,
      actual: '1742',
    })
  })

  // A clean day still has to survive the trip.
  it('keeps a sheet with nothing flagged', () => {
    const clean = sheet({
      input: punches({ start: '0900', lunch: { out: '1300', in: '1330' }, finish: '1730' }),
    })
    expect(fromCsv(toCsv([clean]))).toEqual([clean])
  })

  it('keeps extra break rows and settings', () => {
    const rich = sheet({
      input: punches({
        start: '0700',
        finish: '1700',
        extra: [{ type: 'other', out: '1500', in: '1515', paid: true }],
      }),
      settings: { ...DEFAULT_SETTINGS, rounding: 15, maxShift: 600 },
    })
    const back = fromCsv(toCsv([rich]))
    expect(back[0]?.input.extra).toEqual(rich.input.extra)
    expect(back[0]?.settings).toMatchObject({ rounding: 15, maxShift: 600 })
  })

  it('carries several sheets, each with its own flags', () => {
    const many = [
      sheet({ id: '1', name: 'AB', date: '2026-09-21', input: NO_FINISH }),
      sheet({ id: '2', name: 'CD', date: '2026-09-22', input: punches({ finish: '1700' }) }),
    ]
    expect(fromCsv(toCsv(many))).toEqual(many)
  })

  it('survives a name holding a comma', () => {
    const awkward = sheet({ name: 'Smith, A', input: NO_FINISH })
    expect(fromCsv(toCsv([awkward]))[0]?.name).toBe('Smith, A')
  })

  // Somebody will reorder the columns in a spreadsheet.
  it('finds its columns by name, not by position', () => {
    const csv = toCsv([sheet({ input: NO_FINISH })])
    const [header, ...rest] = csv.split('\r\n')
    const columns = (header ?? '').split(',')

    const flipped = [
      [...columns].reverse().join(','),
      ...rest.map((line) => line.split(',').reverse().join(',')),
    ].join('\r\n')

    expect(fromCsv(flipped)[0]?.name).toBe('AB')
  })
})

describe('reading a file that is not ours', () => {
  it.each(['', 'just one line', 'a,b\r\n1,2'])('returns nothing for %j', (text) => {
    expect(fromCsv(text)).toEqual([])
  })

  it('falls back rather than throwing on broken json columns', () => {
    const csv = toCsv([sheet({ input: NO_FINISH })]).replace(/\[\]/g, '{oops')
    expect(() => fromCsv(csv)).not.toThrow()
  })
})

describe('the printed shape', () => {
  it('leads with the columns somebody reads', () => {
    const header = toCsv([sheet()]).split('\r\n')[0]
    expect(header).toBe(
      'date,name,needs_checking,expected,reviewed,actual,flag_code,flag_target,start,tbreak_out,tbreak_in,lunch_out,lunch_in,finish,sheet_id,extra_json,settings_json',
    )
  })

  it('writes one row per flag', () => {
    const messy = sheet({ input: punches({ start: '0600', finish: '0030' }) })
    const flags = reviewItems([messy]).length
    expect(toCsv([messy]).split('\r\n')).toHaveLength(flags + 1)
  })
})
