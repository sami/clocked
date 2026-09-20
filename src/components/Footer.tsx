import { contactAddress } from './contact.ts'

/**
 * Who made this, and how to reach them.
 *
 * The address is assembled rather than written down. See contact.ts.
 */
export function Footer() {
  const address = contactAddress()

  return (
    <footer className="no-print border-t border-line pt-4 text-xs text-ink-muted">
      <p>
        Built by Sami to scratch a personal itch. Adding up timesheets by hand was slow, and
        the arguments about missing punches were slower.
      </p>
      <p className="mt-1">
        Questions are welcome at{' '}
        <a href={`mailto:${address}`} rel="nofollow noreferrer" className="text-accent underline">
          {address}
        </a>
        .
      </p>
    </footer>
  )
}
