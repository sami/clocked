/**
 * The contact address, put together at runtime from reversed halves.
 *
 * The literal string appears nowhere in the source or in the built bundle,
 * which defeats the harvesters that scrape pages for anything shaped like an
 * address. Somebody who runs the JavaScript will still see it, and no amount
 * of cleverness changes that. This is about the bots, not about hiding.
 */

const LOCAL = 'olleh'
const HOST = 'oi.imas'

function reverse(text: string): string {
  return [...text].reverse().join('')
}

export function contactAddress(): string {
  return `${reverse(LOCAL)}@${reverse(HOST)}`
}
