import { describe, expect, it } from 'vitest'
import { csvFilename, isoDate } from './download.ts'

describe('isoDate', () => {
  // Local time, not UTC. Late on the 21st in London, toISOString would
  // still say the 21st, but in a positive offset it would say the 22nd.
  it('reads the local date', () => {
    expect(isoDate(new Date(2026, 8, 21, 23, 30))).toBe('2026-09-21')
    expect(isoDate(new Date(2026, 0, 5, 0, 15))).toBe('2026-01-05')
  })

  it('pads the month and the day', () => {
    expect(isoDate(new Date(2026, 0, 1))).toBe('2026-01-01')
  })
})

describe('csvFilename', () => {
  it('names the file by the day it was saved', () => {
    expect(csvFilename(new Date(2026, 8, 21))).toBe('clocked-review-2026-09-21.csv')
  })
})
