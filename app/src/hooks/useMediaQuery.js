import { useCallback, useSyncExternalStore } from 'react'

/**
 * Whether a CSS media query currently matches.
 *
 * Built on useSyncExternalStore so it is safe with the prerendered HTML: the
 * page files are rendered at build time, where no media query can match, so
 * the first client render must also say "no match" or React would find the
 * page different from its HTML and throw the whole thing away. React reads the
 * server value while it attaches to the HTML, then switches to the real one.
 */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const mq = window.matchMedia(query)
      mq.addEventListener?.('change', onChange)
      return () => mq.removeEventListener?.('change', onChange)
    },
    [query]
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  )
}
