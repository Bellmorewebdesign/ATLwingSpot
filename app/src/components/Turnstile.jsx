import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import './Turnstile.css'

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

/**
 * Cloudflare Turnstile, rendered explicitly.
 *
 * Explicit rather than automatic rendering because automatic scans the DOM on
 * script load and would never see a widget React mounts later, or would render
 * into a node React is about to replace. Explicit means we render when our own
 * element exists and remove when it goes, which is the only version of this
 * that survives route changes and StrictMode's double mount.
 *
 * The script is fetched once per page and shared: a second mount reuses the
 * same promise instead of appending another tag.
 */

let scriptPromise = null

function loadTurnstile() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`)
    const script = existing || document.createElement('script')
    const done = () => {
      if (window.turnstile) resolve(window.turnstile)
      else reject(new Error('turnstile script loaded without the api'))
    }
    script.addEventListener('load', done)
    script.addEventListener('error', () => {
      // Cleared so a later mount can try again: a blocked or flaky first load
      // should not permanently poison every subsequent attempt.
      scriptPromise = null
      reject(new Error('turnstile script failed to load'))
    })
    if (!existing) {
      script.src = SCRIPT_SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    } else if (window.turnstile) {
      done()
    }
  })
  return scriptPromise
}

/**
 * Calls onToken with a token, or with '' whenever the current one stops being
 * usable. Exposes reset() so the form can throw the token away after every
 * attempt: Cloudflare rejects a token that has already been redeemed, so a
 * retry with the same one would be refused as a duplicate.
 *
 * status is 'loading', 'ready' or 'unavailable'.
 */
export const Turnstile = forwardRef(function Turnstile(
  { siteKey, action, onToken, onStatus, theme = 'light' },
  ref
) {
  const hostRef = useRef(null)
  const widgetId = useRef(null)
  const [status, setStatus] = useState('loading')

  // The effect runs once, so reading the callbacks through refs keeps it from
  // closing over a stale render's versions.
  const cb = useRef({ onToken, onStatus })
  cb.current = { onToken, onStatus }

  const announce = (next) => {
    setStatus(next)
    cb.current.onStatus?.(next)
  }

  useEffect(() => {
    let cancelled = false

    loadTurnstile()
      .then((turnstile) => {
        // StrictMode mounts, unmounts and mounts again; without this the first
        // run would render into an element that is already detached.
        if (cancelled || !hostRef.current || widgetId.current !== null) return
        widgetId.current = turnstile.render(hostRef.current, {
          sitekey: siteKey,
          action,
          theme,
          callback: (token) => cb.current.onToken?.(token),
          // Every one of these means the token in hand is no longer good, so
          // they all clear it rather than leaving a stale value to be sent.
          'expired-callback': () => { cb.current.onToken?.(''); announce('ready') },
          'timeout-callback': () => { cb.current.onToken?.(''); announce('ready') },
          'error-callback': () => { cb.current.onToken?.(''); announce('unavailable') },
        })
        announce('ready')
      })
      .catch(() => {
        if (cancelled) return
        cb.current.onToken?.('')
        announce('unavailable')
      })

    return () => {
      cancelled = true
      if (widgetId.current !== null) {
        try {
          window.turnstile?.remove(widgetId.current)
        } catch {
          // Already gone, or the script never arrived. Nothing to undo.
        }
        widgetId.current = null
      }
    }
    // Deliberately once: re-rendering the widget on a prop change would throw
    // the visitor's solved challenge away mid-form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useImperativeHandle(ref, () => ({
    reset() {
      cb.current.onToken?.('')
      if (widgetId.current === null) return
      try {
        window.turnstile?.reset(widgetId.current)
      } catch {
        /* the widget is gone; the cleared token is what matters */
      }
    },
    status: () => status,
  }))

  return (
    <div className="ts">
      <div ref={hostRef} className="ts__widget" />
      {status === 'loading' && (
        <p className="ts__note" role="status">Checking your browser…</p>
      )}
      {status === 'unavailable' && (
        <p className="ts__note ts__note--bad" role="alert">
          The verification check could not load. It may be blocked by an
          extension or your network. Reload the page to try again.
        </p>
      )}
    </div>
  )
})
