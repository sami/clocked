import { useEffect, useRef } from 'react'

interface ConfirmProps {
  readonly open: boolean
  readonly title: string
  readonly body: string
  readonly confirmLabel: string
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

/**
 * An in-page confirmation.
 *
 * A native confirm() would do the job, but it blocks the page, cannot be
 * styled, and cannot be driven by a test. A dialog element gives the same
 * guarantee, keyboard and screen reader handling included, without any of
 * that. Escape cancels, because a destructive dialog should be easy to leave.
 */
export function Confirm({ open, title, body, confirmLabel, onConfirm, onCancel }: ConfirmProps) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    if (!element) return

    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open])

  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      // m-auto because Tailwind's reset zeroes the margin that a modal
      // dialog relies on to centre itself.
      className="m-auto max-w-sm rounded-lg border border-line bg-surface-raised p-4 text-ink backdrop:bg-black/50"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-ink-muted">{body}</p>

      <div className="mt-4 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-line px-4 py-2 font-medium text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-md bg-error px-4 py-2 font-medium text-surface-raised"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
