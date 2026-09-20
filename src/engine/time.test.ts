import { describe, expect, it } from 'vitest'
import { formatClock, parseTime } from './time.ts'

describe('parseTime', () => {
  // Fixed by the spec: all three spellings of quarter past nine.
  it.each([
    ['0915', 555],
    ['9:15', 555],
    ['915', 555],
  ])('reads %s as 09:15', (input, expected) => {
    expect(parseTime(input)).toBe(expected)
  })

  it.each([
    ['0000', 0],
    ['00:00', 0],
    ['1730', 1050],
    ['17:30', 1050],
    ['2359', 1439],
  ])('handles 24 hour time %s', (input, expected) => {
    expect(parseTime(input)).toBe(expected)
  })

  it('ignores surrounding whitespace', () => {
    expect(parseTime('  0915 ')).toBe(555)
  })

  it.each(['', '   ', 'abc', '960', '0960', '2500', '25:00', '9:60', '12345', '-915'])(
    'rejects %j',
    (input) => {
      expect(parseTime(input)).toBeNull()
    },
  )

  // Judgement calls, now settled. The reasoning lives in the doc comment on
  // parseTime, so the rule and its justification stay in one place.

  // Typing `9` instead of `0900` is three keystrokes saved on every field,
  // which is most of the fifteen second target.
  it.each([
    ['9', 540],
    ['17', 1020],
    ['0', 0],
  ])('reads bare %s as a whole hour', (input, expected) => {
    expect(parseTime(input)).toBe(expected)
  })

  it.each([
    ['9.15', 555],
    ['9 15', 555],
  ])('accepts %s, because a numeric keypad has no colon', (input, expected) => {
    expect(parseTime(input)).toBe(expected)
  })

  // One spelling of midnight keeps every time inside 0 to 1439. A shift that
  // finishes at midnight is a cross-midnight shift, handled by the gap rules.
  it.each(['2400', '24:00'])('rejects %s, because midnight is 0000', (input) => {
    expect(parseTime(input)).toBeNull()
  })

  // 09:50 would be a digit nobody typed, and this app never guesses silently.
  it('reads 9:5 as 09:05, the minutes exactly as written', () => {
    expect(parseTime('9:5')).toBe(545)
  })

  it.each(['9:15pm', '915p', '9am'])('rejects %j, because the field is 24 hour', (input) => {
    expect(parseTime(input)).toBeNull()
  })
})

describe('formatClock', () => {
  it.each([
    [0, '00:00'],
    [555, '09:15'],
    [1050, '17:30'],
    [1439, '23:59'],
  ])('formats %i as %s', (minutes, expected) => {
    expect(formatClock(minutes)).toBe(expected)
  })

  it('wraps past midnight, for shifts that cross it', () => {
    expect(formatClock(1440 + 90)).toBe('01:30')
  })
})
