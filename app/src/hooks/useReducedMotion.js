import { useMediaQuery } from './useMediaQuery'

// True when the user asked for reduced motion. Drives every animation
// decision so the site stays intentional without movement.
export function useReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
