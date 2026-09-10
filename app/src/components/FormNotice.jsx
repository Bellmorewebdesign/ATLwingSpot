import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useScrollLock } from '../hooks/useScrollLock'
import { SOCIAL, BRAND } from '../data/site'
import { Instagram, Close, ArrowUpRight } from './Icons'
import './FormNotice.css'

const FormNoticeContext = createContext(() => {})

// eslint-disable-next-line react-refresh/only-export-components
export const useFormNotice = () => useContext(FormNoticeContext)

/**
 * The contact, catering and franchise forms are front-end only: this site has
 * no server, so nothing is delivered anywhere. Rather than fake a "sent"
 * confirmation, a valid submit opens this notice, says plainly that the form is
 * not connected yet, and hands over the channel that does work today.
 */
const DEFAULT = {
  title: 'Not connected yet',
  message:
    'This form is part of the new site and does not have an inbox behind it yet, so nothing was sent.',
}

export function FormNoticeProvider({ children }) {
  const [payload, setPayload] = useState(null)
  const open = Boolean(payload)

  const show = useCallback((custom = {}) => {
    setPayload({ ...DEFAULT, ...custom })
  }, [])

  const close = useCallback(() => setPayload(null), [])
  useScrollLock(open)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  return (
    <FormNoticeContext.Provider value={show}>
      {children}
      {open && (
        <div className="fnote" role="dialog" aria-modal="true" aria-labelledby="fnote-title">
          <button className="fnote__scrim" aria-label="Close" onClick={close} />
          <div className="fnote__card">
            <h2 id="fnote-title" className="fnote__title dsp">{payload.title}</h2>
            <p className="fnote__body">{payload.message}</p>
            <p className="fnote__body fnote__body--alt">
              Message {BRAND.handle} on Instagram in the meantime and someone will pick it up.
            </p>
            <a
              className="btn btn-orange fnote__go"
              href={SOCIAL.instagram}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Instagram size={18} /> Open Instagram <ArrowUpRight size={13} />
            </a>
            <button className="btn btn-line fnote__close" onClick={close}>
              Back to the form
            </button>
            <button className="fnote__x" onClick={close} aria-label="Close dialog">
              <Close />
            </button>
          </div>
        </div>
      )}
    </FormNoticeContext.Provider>
  )
}
