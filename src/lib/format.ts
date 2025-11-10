/**
 * Date and time formatting utilities
 */

export interface FormattedDateTime {
  date: string
  time: string
}

/**
 * Format a date-time string into separate date and time components
 * @param dateTime - ISO date-time string
 * @returns Object with formatted date and time strings
 */
export function formatDateTime(dateTime: string): FormattedDateTime {
  const date = new Date(dateTime)
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
}

/**
 * Format a date string
 * @param date - ISO date string
 * @returns Formatted date string
 */
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString()
}

/**
 * Format a time string
 * @param time - ISO time string
 * @returns Formatted time string
 */
export function formatTime(time: string): string {
  return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
