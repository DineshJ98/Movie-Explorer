import { useEffect, useState } from 'react'

/**
 * Returns `value` after it has stopped changing for `delay` ms.
 *
 * Debouncing the *query* here is what prevents a request burst while typing.
 * Debouncing results at the consumer level would still fire a request per
 * keystroke — the requests are already in flight by the time the results
 * arrive to be debounced.
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])

  return debounced
}
