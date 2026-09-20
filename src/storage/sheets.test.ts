import { describe, expect, it } from 'vitest'
import { EMPTY_INPUT } from '../day/input.ts'
import { DEFAULT_SETTINGS } from '../engine/day.ts'
import {
  clearSheets,
  flagKey,
  newSheetId,
  noteFor,
  readSheets,
  removeSheet,
  setNote,
  STORAGE_KEY,
  upsertSheet,
  writeSheets,
  type SavedSheet,
  type StorageLike,
} from './sheets.ts'

/** An in-memory stand-in for localStorage. */
function fakeStore(initial: Record<string, string> = {}): StorageLike {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}

/** A store that refuses everything, like a locked-down private window. */
const brokenStore: StorageLike = {
  getItem: () => {
    throw new Error('denied')
  },
  setItem: () => {
    throw new Error('quota')
  },
  removeItem: () => {
    throw new Error('denied')
  },
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

describe('flagKey', () => {
  // Notes hang off this, so it must not move when a day is re-evaluated.
  it('is decided by the rule and what it points at', () => {
    expect(flagKey({ code: 'missing-finish', target: 'finish' })).toBe('missing-finish@finish')
    expect(flagKey({ code: 'unclosed-break', target: 'lunch.in' })).toBe(
      'unclosed-break@lunch.in',
    )
  })
})

describe('newSheetId', () => {
  it('does not repeat itself', () => {
    const ids = new Set(Array.from({ length: 50 }, newSheetId))
    expect(ids.size).toBe(50)
  })
})

describe('reading and writing', () => {
  it('round trips', () => {
    const store = fakeStore()
    expect(writeSheets(store, [sheet()])).toBe(true)
    expect(readSheets(store)).toEqual([sheet()])
  })

  it('reads nothing when there is nothing saved', () => {
    expect(readSheets(fakeStore())).toEqual([])
  })

  it('clears', () => {
    const store = fakeStore()
    writeSheets(store, [sheet()])
    clearSheets(store)
    expect(readSheets(store)).toEqual([])
  })

  // One bad entry must not cost somebody the rest of their work.
  it('drops entries that are not sheets and keeps the rest', () => {
    const store = fakeStore({
      [STORAGE_KEY]: JSON.stringify([sheet(), { rubbish: true }, null, sheet({ id: 'sheet-2' })]),
    })
    expect(readSheets(store).map((each) => each.id)).toEqual(['sheet-1', 'sheet-2'])
  })

  it.each(['not json at all', '{"not":"an array"}', '42'])('survives %j in storage', (raw) => {
    expect(readSheets(fakeStore({ [STORAGE_KEY]: raw }))).toEqual([])
  })

  // A private window throws on access. That is not a crash worth having.
  it('reports a refusal rather than throwing', () => {
    expect(readSheets(brokenStore)).toEqual([])
    expect(writeSheets(brokenStore, [sheet()])).toBe(false)
    expect(() => clearSheets(brokenStore)).not.toThrow()
  })
})

describe('changing the set', () => {
  it('appends a new sheet and replaces a known one', () => {
    const one = sheet()
    const two = sheet({ id: 'sheet-2', name: 'CD' })

    const both = upsertSheet([one], two)
    expect(both).toHaveLength(2)

    const edited = upsertSheet(both, { ...two, name: 'EF' })
    expect(edited).toHaveLength(2)
    expect(edited[1]?.name).toBe('EF')
  })

  it('removes by id', () => {
    expect(removeSheet([sheet(), sheet({ id: 'sheet-2' })], 'sheet-1')).toHaveLength(1)
  })
})

describe('notes', () => {
  it('starts empty and fills in a field at a time', () => {
    const key = 'missing-finish@finish'
    expect(noteFor(sheet(), key)).toEqual({ expected: '', reviewed: false, actual: '' })

    const withExpected = setNote(sheet(), key, { expected: '1730' })
    expect(noteFor(withExpected, key).expected).toBe('1730')

    const chased = setNote(withExpected, key, { reviewed: true, actual: '1742' })
    expect(noteFor(chased, key)).toEqual({ expected: '1730', reviewed: true, actual: '1742' })
  })

  it('leaves other notes alone', () => {
    const one = setNote(sheet(), 'a@start', { expected: '0900' })
    const two = setNote(one, 'b@finish', { expected: '1730' })
    expect(noteFor(two, 'a@start').expected).toBe('0900')
  })
})
