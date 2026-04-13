/**
 * Zentraler Logger — loggt nur in Development.
 * In Production sind alle Ausgaben stumm.
 */
const isDev = import.meta.env.DEV

export const logger = {
  log: (...args: unknown[]) => { if (isDev) console.log('[MealDeal]', ...args) },
  warn: (...args: unknown[]) => { if (isDev) console.warn('[MealDeal]', ...args) },
  error: (...args: unknown[]) => { if (isDev) console.error('[MealDeal]', ...args) },
}
