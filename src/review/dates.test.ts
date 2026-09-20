import { describe, expect, it } from 'vitest'
import { shortDate } from './dates.ts'

describe('shortDate', () => {
  it.each([
    ['2026-09-19', 'Sat 19 Sep'],
    ['2026-09-20', 'Sun 20 Sep'],
    ['2026-01-01', 'Thu 1 Jan'],
    ['2026-12-25', 'Fri 25 Dec'],
  ])('reads %s as %s', (iso, expected) => {
    expect(shortDate(iso)).toBe(expected)
  })

  // No leading zero on the day. "Sat 9 May" reads better than "Sat 09 May".
  it('does not pad the day', () => {
    expect(shortDate('2026-05-09')).toBe('Sat 9 May')
  })

  it.each(['', 'no date', '2026-9-19', '19/09/2026', '2026-13-01', '2026-09-31'])(
    'says No date for %j',
    (iso) => {
      expect(shortDate(iso)).toBe('No date')
    },
  )
})
