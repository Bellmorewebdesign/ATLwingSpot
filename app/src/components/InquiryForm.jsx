import { useEffect, useRef, useState } from 'react'
import { Turnstile } from './Turnstile'
import { useFormNotice } from './FormNotice'
import { BRAND } from '../data/site'
import { ArrowRight } from './Icons'
import './InquiryForm.css'

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * A validated enquiry form, in one of two modes.
 *
 * Without a `submit` prop it behaves as it always has: validate, then open the
 * shared FormNotice saying the form has no inbox behind it. The contact form
 * still works that way, because it still has no inbox.
 *
 * With a `submit` prop it posts for real. The franchising form passes one.
 * Success is only ever shown after the server has said so, and the entered
 * values are only cleared at that point, so a failure of any kind leaves
 * everything typed exactly where it was.
 *
 * `captcha` ({ siteKey, action }) adds a Turnstile challenge. Only the
 * franchising form passes one, so the contact form neither renders the widget
 * nor fetches Cloudflare's script. A submission is not attempted without a
 * token, and the token is thrown away after every attempt because Cloudflare
 * refuses one that has already been redeemed.
 *
 * `honeypot` renders a decoy input under that name. It is positioned out of
 * sight rather than display:none, so something that fills every input it finds
 * in the markup will fill it; it is aria-hidden and tabIndex -1 so nobody
 * using a keyboard or a screen reader can reach it, and autoComplete="off"
 * with a name no autofill heuristic recognises keeps browsers out of it.
 */
export function InquiryForm({
  fields,
  submitLabel = 'Submit',
  notice,
  columns = 2,
  submit,
  honeypot,
  captcha,
  note,
  sendingLabel = 'Sending…',
  successTitle = 'Thanks, that came through.',
  successMessage = 'We have your details and will be in touch.',
  cooldownRemaining,
  onCooldownStart,
}) {
  const showNotice = useFormNotice()
  const blank = () => Object.fromEntries(fields.map((f) => [f.name, f.default ?? '']))
  const [values, setValues] = useState(blank)
  const [errors, setErrors] = useState({})
  const [hp, setHp] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [formError, setFormError] = useState(null)
  const [cooldown, setCooldown] = useState(() => (cooldownRemaining ? cooldownRemaining() : 0))
  const liveRef = useRef(null)
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaStatus, setCaptchaStatus] = useState('loading')
  const captchaRef = useRef(null)

  // One timer for the whole countdown, started whenever there is time left,
  // including on mount: the cooldown is persisted, so a reload mid-wait has to
  // pick it up rather than present a ready-looking button.
  useEffect(() => {
    if (!cooldownRemaining || cooldown <= 0) return undefined
    const id = setInterval(() => setCooldown(cooldownRemaining()), 1000)
    return () => clearInterval(id)
  }, [cooldown, cooldownRemaining])

  const setField = (name, value) => {
    setValues((v) => ({ ...v, [name]: value }))
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }))
    // Editing after a rejection means the message on screen is about to be out
    // of date, so it goes.
    if (status === 'error') { setStatus('idle'); setFormError(null) }
  }

  const validate = () => {
    const next = {}
    fields.forEach((f) => {
      const val = (values[f.name] || '').trim()
      if (f.required && !val) next[f.name] = `${f.label} is required`
      else if (val && f.type === 'email' && !emailRe.test(val)) next[f.name] = 'Enter a valid email'
      else if (val && f.type === 'tel' && val.replace(/\D/g, '').length < 7) next[f.name] = 'Enter a valid phone'
    })
    setErrors(next)
    return next
  }

  /**
   * Focus has to wait for the next render, not happen inline. When the server
   * rejects a submission the inputs are still disabled from the sending state
   * at the moment the catch runs, and a disabled input cannot take focus, so
   * calling focus() there silently did nothing. Setting a target and moving
   * the focus from an effect means it lands after the re-render that enables
   * the fields again. The counter makes the object new every time, so two
   * rejections of the same field still re-focus it.
   */
  const focusToken = useRef(0)
  const [focusTarget, setFocusTarget] = useState(null)

  useEffect(() => {
    if (!focusTarget) return
    document.getElementById(`f-${focusTarget.name}`)?.focus()
  }, [focusTarget])

  const focusFirstBad = (found) => {
    const firstBad = fields.find((f) => found[f.name])
    if (firstBad) setFocusTarget({ name: firstBad.name, n: (focusToken.current += 1) })
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    // Guards the double-click, the double-tap and the Enter key held down.
    if (status === 'sending') return

    const found = validate()
    if (Object.keys(found).length > 0) {
      focusFirstBad(found)
      return
    }

    if (!submit) {
      showNotice(notice)
      return
    }

    if (cooldownRemaining) {
      const left = cooldownRemaining()
      if (left > 0) {
        setCooldown(left)
        setStatus('error')
        setFormError(`Just sent one. You can send another in ${left} seconds.`)
        return
      }
    }

    if (captcha) {
      if (captchaStatus === 'unavailable') {
        setStatus('error')
        setFormError(
          'We cannot run the verification check, so this cannot be sent right now. ' +
          'Reload the page, or message us on Instagram.'
        )
        return
      }
      if (!captchaToken) {
        setStatus('error')
        setFormError(
          captchaStatus === 'loading'
            ? 'Still checking your browser. Give it a second and try again.'
            : 'Please complete the verification below, then send.'
        )
        return
      }
    }

    setStatus('sending')
    setFormError(null)
    try {
      await submit(values, {
        honeypotName: honeypot,
        honeypotValue: hp,
        turnstileToken: captchaToken,
      })
      setValues(blank())
      setHp('')
      setErrors({})
      // Spent, whatever happened next. Cloudflare rejects a redeemed token as
      // a duplicate, so holding onto it would make the next send fail.
      captchaRef.current?.reset()
      setStatus('sent')
      if (onCooldownStart) onCooldownStart()
      if (cooldownRemaining) setCooldown(cooldownRemaining())
      liveRef.current?.focus()
    } catch (err) {
      // Everything the person typed stays put; only the token is discarded.
      captchaRef.current?.reset()
      setStatus('error')
      if (err && err.fields) {
        setErrors(err.fields)
        focusFirstBad(err.fields)
      }
      if (err && err.code === 'rate_limited' && err.retryAfter) {
        setFormError(`${err.message} (about ${err.retryAfter} seconds)`)
      } else {
        setFormError((err && err.message) || 'Something went wrong. Please try again.')
      }
    }
  }

  const sending = status === 'sending'
  const waiting = cooldown > 0
  const disabled = sending || waiting

  return (
    <form className={`mform mform--cols-${columns}`} onSubmit={onSubmit} noValidate>
      {fields.map((f) => {
        const err = errors[f.name]
        const id = `f-${f.name}`
        const full = f.full || f.type === 'textarea'
        return (
          <div key={f.name} className={`mform__field ${full ? 'is-full' : ''} ${err ? 'has-error' : ''}`}>
            <label htmlFor={id} className="mform__label">
              {f.label}{f.required && <span className="mform__req" aria-hidden="true"> *</span>}
            </label>

            {f.type === 'segmented' ? (
              <div className="mform__segmented" role="radiogroup" aria-label={f.label}>
                {f.options.map((o) => (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={values[f.name] === o}
                    className={`mform__seg ${values[f.name] === o ? 'is-active' : ''}`}
                    onClick={() => setField(f.name, o)}
                    disabled={sending}
                  >
                    {o}
                  </button>
                ))}
              </div>
            ) : f.type === 'textarea' ? (
              <textarea id={id} name={f.name} rows={f.rows || 4}
                value={values[f.name]} onChange={(e) => setField(f.name, e.target.value)}
                aria-invalid={!!err} aria-describedby={err ? `${id}-err` : undefined}
                placeholder={f.placeholder} disabled={sending} />
            ) : f.type === 'select' ? (
              <select id={id} name={f.name} value={values[f.name]}
                onChange={(e) => setField(f.name, e.target.value)}
                aria-invalid={!!err} aria-describedby={err ? `${id}-err` : undefined}
                disabled={sending}>
                <option value="" disabled>{f.placeholder || 'Select…'}</option>
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input id={id} name={f.name} type={f.type || 'text'}
                value={values[f.name]} onChange={(e) => setField(f.name, e.target.value)}
                aria-invalid={!!err} aria-describedby={err ? `${id}-err` : undefined}
                placeholder={f.placeholder} autoComplete={f.autoComplete} disabled={sending} />
            )}

            {err && <span id={`${id}-err`} className="mform__error" role="alert">{err}</span>}
          </div>
        )
      })}

      {honeypot && (
        <div className="mform__hp" aria-hidden="true">
          <label htmlFor={`f-${honeypot}`}>Leave this field empty</label>
          <input
            id={`f-${honeypot}`}
            name={honeypot}
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={hp}
            onChange={(e) => setHp(e.target.value)}
          />
        </div>
      )}

      {captcha && (
        <div className="mform__field is-full mform__captcha">
          <Turnstile
            ref={captchaRef}
            siteKey={captcha.siteKey}
            action={captcha.action}
            onToken={setCaptchaToken}
            onStatus={setCaptchaStatus}
          />
        </div>
      )}

      <div className="mform__submit is-full">
        <button type="submit" className="btn btn-orange btn-lg" disabled={disabled} aria-busy={sending}>
          {sending ? sendingLabel : waiting ? `Wait ${cooldown}s` : submitLabel}
          {!sending && !waiting && <ArrowRight />}
        </button>

        {status === 'sent' && (
          <div className="mform__ok" role="status" tabIndex={-1} ref={liveRef}>
            <strong>{successTitle}</strong>
            <span>{successMessage}</span>
          </div>
        )}
        {status === 'error' && formError && (
          <p className="mform__formerr" role="alert">{formError}</p>
        )}

        {note !== undefined ? (
          note
        ) : (
          <p className="mform__note">
            This form is not connected to an inbox yet. For anything time-sensitive,
            message {BRAND.handle} on Instagram.
          </p>
        )}
      </div>
    </form>
  )
}
