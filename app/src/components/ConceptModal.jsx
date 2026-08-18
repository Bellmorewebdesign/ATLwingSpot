import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useScrollLock } from '../hooks/useScrollLock'
import { Check, Close } from './Icons'
import './ConceptModal.css'

const ConceptContext = createContext(() => {})

// eslint-disable-next-line react-refresh/only-export-components
export const useConcept = () => useContext(ConceptContext)

const DEFAULT = {
  title: 'Concept Preview',
  message:
    'This interaction is part of the ATL Wing Spot website redesign concept and is not connected to a live submission system yet.',
}

export function ConceptProvider({ children }) {
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
    <ConceptContext.Provider value={show}>
      {children}
      {open && (
        <div className="concept" role="dialog" aria-modal="true" aria-labelledby="concept-title">
          <button className="concept__scrim" aria-label="Close" onClick={close} />
          <div className="concept__card">
            <div className="concept__mark" aria-hidden="true"><Check size={28} /></div>
            <p className="concept__kicker">{payload.summary || 'Got it, that came through'}</p>
            <h2 id="concept-title" className="concept__title dsp">{payload.title}</h2>
            <p className="concept__body">{payload.message}</p>
            <button className="btn btn-orange concept__close" onClick={close}>
              Back to it
            </button>
            <button className="concept__x" onClick={close} aria-label="Close dialog">
              <Close />
            </button>
          </div>
        </div>
      )}
    </ConceptContext.Provider>
  )
}
