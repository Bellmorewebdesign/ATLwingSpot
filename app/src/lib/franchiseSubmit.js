import { FRANCHISE_ENDPOINT } from '../data/site'

/**
 * Posting the franchising form.
 *
 * The browser-side cooldown here is a courtesy, not a control: it stops an
 * eager person hammering the button and getting a wall of 429s. Anyone can
 * clear local storage or open a private window, so the limits that actually
 * hold are the ones in DynamoDB behind the endpoint. Treat this purely as UX.
 */

export const COOLDOWN_SECONDS = 60
const STORE_KEY = 'atlws.franchise.lastSubmitAt'

// Local storage throws in some privacy modes and is simply absent during SSR
// or a prerender. A cooldown that cannot be remembered is not worth an
// exception, so it degrades to this tab's memory.
let memoryFallback = 0

function readLastSubmit() {
  try {
    const raw = window.localStorage.getItem(STORE_KEY)
    const at = raw ? Number(raw) : 0
    return Number.isFinite(at) ? at : 0
  } catch {
    return memoryFallback
  }
}

function writeLastSubmit(at) {
  memoryFallback = at
  try {
    window.localStorage.setItem(STORE_KEY, String(at))
  } catch {
    /* memoryFallback already holds it */
  }
}

/** Whole seconds left on the cooldown, 0 when clear. */
export function cooldownRemaining(now = Date.now()) {
  const last = readLastSubmit()
  if (!last) return 0
  // A clock that has moved backwards (or a stored value from the future)
  // would otherwise lock the form for a very long time.
  if (last > now) {
    writeLastSubmit(0)
    return 0
  }
  const left = Math.ceil((last + COOLDOWN_SECONDS * 1000 - now) / 1000)
  return left > 0 ? left : 0
}

export function startCooldown(now = Date.now()) {
  writeLastSubmit(now)
}

export class SubmitError extends Error {
  constructor(message, { code = 'error', fields = null, retryAfter = 0 } = {}) {
    super(message)
    this.name = 'SubmitError'
    this.code = code
    this.fields = fields
    this.retryAfter = retryAfter
  }
}

function retryAfterFrom(res, payload) {
  // Only readable when the API exposes it through CORS
  // (Access-Control-Expose-Headers: retry-after). If it is not exposed the
  // header is still sent, the browser just hides it, so fall back rather than
  // showing nothing.
  const header = Number(res.headers.get('retry-after'))
  if (Number.isFinite(header) && header > 0) return Math.ceil(header)
  const fromBody = Number(payload && payload.retryAfter)
  if (Number.isFinite(fromBody) && fromBody > 0) return Math.ceil(fromBody)
  return COOLDOWN_SECONDS
}

/**
 * Posts one submission. Resolves on success, throws SubmitError otherwise.
 * `honeypotName` is sent as an empty string so the field is always present in
 * the payload, which keeps a real submission indistinguishable in shape from
 * one a bot filled in.
 */
export async function submitFranchiseInquiry(
  values,
  { honeypotName, honeypotValue = '', turnstileToken = '' } = {}
) {
  const payload = {
    firstName: values.firstName ?? '',
    lastName: values.lastName ?? '',
    email: values.email ?? '',
    phone: values.phone ?? '',
    territory: values.territory ?? '',
    message: values.message ?? '',
  }
  if (honeypotName) payload[honeypotName] = honeypotValue
  payload.turnstileToken = turnstileToken

  let res
  try {
    res = await fetch(FRANCHISE_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // Offline, DNS, TLS, a blocked request: the browser gives no detail here
    // on purpose, so neither do we.
    throw new SubmitError(
      'We could not reach the server. Check your connection and try again.',
      { code: 'network' }
    )
  }

  let payloadBack = null
  try {
    payloadBack = await res.json()
  } catch {
    payloadBack = null
  }

  if (res.ok && payloadBack && payloadBack.ok) return

  if (res.status === 400 && payloadBack && payloadBack.fields) {
    throw new SubmitError(
      payloadBack.message || 'Please check the highlighted fields.',
      { code: 'validation', fields: payloadBack.fields }
    )
  }
  if (res.status === 429) {
    const retryAfter = retryAfterFrom(res, payloadBack)
    throw new SubmitError(
      (payloadBack && payloadBack.message) || 'Too many requests. Please try again shortly.',
      { code: 'rate_limited', retryAfter }
    )
  }
  if (res.status === 413) {
    throw new SubmitError('That message is too long. Please shorten it and try again.', {
      code: 'too_large',
    })
  }
  if (res.status === 403) {
    // The challenge did not verify. The widget has already been reset by the
    // time this is shown, so trying again is worth a go.
    throw new SubmitError(
      (payloadBack && payloadBack.message) ||
        'That verification did not go through. Please try again.',
      { code: 'captcha' }
    )
  }
  if (res.status === 503) {
    throw new SubmitError(
      'The form is temporarily unavailable. Please try again in a few minutes.',
      { code: 'unavailable' }
    )
  }
  throw new SubmitError(
    (payloadBack && payloadBack.message) ||
      'Something went wrong sending that. Please try again in a few minutes.',
    { code: (payloadBack && payloadBack.error) || 'server_error' }
  )
}
