/**
 * Compose className strings — falsy values are skipped.
 * Lightweight alternative to clsx/classnames for our simple needs.
 */
export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(" ");
}
