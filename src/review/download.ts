/**
 * Saving a CSV to the machine and reading one back.
 *
 * Date handling lives here rather than in the engine. The engine has no
 * concept of which day it is and should keep it that way, but a file name
 * and a sensible default for the date field both need today's date.
 */

/** Today as YYYY-MM-DD, in local time rather than UTC. */
export function isoDate(when: Date): string {
  const year = when.getFullYear()
  const month = String(when.getMonth() + 1).padStart(2, '0')
  const day = String(when.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function csvFilename(when: Date): string {
  return `clocked-review-${isoDate(when)}.csv`
}

/**
 * Hand the file to the browser.
 *
 * A blob URL rather than a data URL, because a morning's sheets can be
 * larger than a data URL comfortably carries, and the blob is revoked
 * straight afterwards so nothing is left holding memory.
 */
export function saveCsv(filename: string, text: string): void {
  // The BOM is what makes Excel open a UTF-8 CSV without mangling it.
  const blob = new Blob([`\uFEFF${text}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()

  URL.revokeObjectURL(url)
}

/** Read a chosen file as text. */
export function readFile(file: File): Promise<string> {
  return file.text()
}
