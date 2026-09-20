import type { Flag } from '../engine/rules.ts'

/**
 * A stable DOM id for one flag, so a field can point a screen reader at the
 * flags about it through aria-describedby.
 */
export function flagId(flag: Flag): string {
  return `flag-${flag.code}-${flag.target.replace(/\./g, '-')}`
}
