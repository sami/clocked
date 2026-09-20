import { describe, expect, it } from 'vitest'
import { contactAddress } from './contact.ts'

describe('contactAddress', () => {
  it('assembles the right address', () => {
    expect(contactAddress()).toBe('hello@sami.io')
  })

  // The whole point of assembling it. If the literal creeps back in it
  // lands in the built bundle, and the harvesters read the bundle.
  it('is not a literal anywhere in the module it comes from', async () => {
    const source = (await import('./contact.ts?raw')).default as string

    expect(source).not.toContain(contactAddress())
    expect(source).not.toContain('sami.io')
  })
})
