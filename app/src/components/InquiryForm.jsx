import { useState } from 'react'
import { useFormNotice } from './FormNotice'
import { BRAND } from '../data/site'
import { ArrowRight } from './Icons'
import './InquiryForm.css'

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * A validated, front-end-only enquiry form. There is no server behind this
 * site, so a valid submit opens the shared FormNotice, which says so and
 * points at Instagram. Nothing here claims a message was delivered.
 */
export function InquiryForm({ fields, submitLabel = 'Submit', notice, columns = 2 }) {
  const showNotice = useFormNotice()
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.name, f.default ?? '']))
  )
  const [errors, setErrors] = useState({})

  const setField = (name, value) => {
    setValues((v) => ({ ...v, [name]: value }))
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }))
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

  const onSubmit = (e) => {
    e.preventDefault()
    const found = validate()
    if (Object.keys(found).length > 0) {
      const firstBad = fields.find((f) => found[f.name])
      document.getElementById(`f-${firstBad.name}`)?.focus()
      return
    }
    showNotice(notice)
  }

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
                  >
                    {o}
                  </button>
                ))}
              </div>
            ) : f.type === 'textarea' ? (
              <textarea id={id} name={f.name} rows={f.rows || 4}
                value={values[f.name]} onChange={(e) => setField(f.name, e.target.value)}
                aria-invalid={!!err} aria-describedby={err ? `${id}-err` : undefined}
                placeholder={f.placeholder} />
            ) : f.type === 'select' ? (
              <select id={id} name={f.name} value={values[f.name]}
                onChange={(e) => setField(f.name, e.target.value)}
                aria-invalid={!!err} aria-describedby={err ? `${id}-err` : undefined}>
                <option value="" disabled>{f.placeholder || 'Select…'}</option>
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input id={id} name={f.name} type={f.type || 'text'}
                value={values[f.name]} onChange={(e) => setField(f.name, e.target.value)}
                aria-invalid={!!err} aria-describedby={err ? `${id}-err` : undefined}
                placeholder={f.placeholder} autoComplete={f.autoComplete} />
            )}

            {err && <span id={`${id}-err`} className="mform__error" role="alert">{err}</span>}
          </div>
        )
      })}

      <div className="mform__submit is-full">
        <button type="submit" className="btn btn-orange btn-lg">
          {submitLabel} <ArrowRight />
        </button>
        <p className="mform__note">
          This form is not connected to an inbox yet. For anything time-sensitive,
          message {BRAND.handle} on Instagram.
        </p>
      </div>
    </form>
  )
}
