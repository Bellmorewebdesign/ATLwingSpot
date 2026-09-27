import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { findByZip, formatPhone, mapsUrl } from '../data/locations'
import { ORDER_URL, ORDER_LABEL } from '../data/site'
import { Search, MapPin, ArrowUpRight } from './Icons'
import './ZipLookup.css'

/**
 * Type a ZIP, get the shops closest to it.
 *
 * Deliberately small: one field, one button, at most three results. It runs
 * entirely on the bundled location data, so it works on a static Pages build
 * with no geocoder and no network call.
 *
 * The phone line renders only when a shop has a number on file. None do yet,
 * so today the card shows the address, directions and ordering; the moment
 * numbers land in locations.js the phone appears with no other change.
 */
export function ZipLookup({ heading = 'Find your closest shop' }) {
  const id = useId()
  const [value, setValue] = useState('')
  const [result, setResult] = useState(null)

  const submit = (e) => {
    e.preventDefault()
    setResult(findByZip(value))
  }

  const onChange = (e) => {
    setValue(e.target.value.replace(/[^\d]/g, '').slice(0, 5))
    if (result) setResult(null)
  }

  return (
    <div className="zipl">
      <form className="zipl__form" onSubmit={submit}>
        <label className="zipl__label" htmlFor={`${id}-zip`}>{heading}</label>
        <div className="zipl__row">
          <div className="zipl__field">
            <Search size={17} />
            <input
              id={`${id}-zip`}
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              value={value}
              onChange={onChange}
              placeholder="ZIP code"
              maxLength={5}
            />
          </div>
          <button type="submit" className="btn btn-ink zipl__go">Find</button>
        </div>
      </form>

      {result && (
        <div className="zipl__out" aria-live="polite">
          {result.status === 'invalid' && (
            <p className="zipl__msg">That is not a five-digit ZIP.</p>
          )}
          {result.status === 'empty' && (
            <p className="zipl__msg">Enter a ZIP code to see what is near you.</p>
          )}
          {result.status === 'none' && (
            <p className="zipl__msg">
              No shop near {result.zip} yet.{' '}
              <Link className="tlink" to="/locations">See every location</Link>
            </p>
          )}
          {(result.status === 'exact' || result.status === 'near') && (
            <>
              <p className="zipl__msg">
                {result.status === 'exact'
                  ? `We are in ${result.zip}.`
                  : `Closest to ${result.zip}:`}
              </p>
              <ul className="zipl__list">
                {result.shops.map((s) => {
                  const phone = formatPhone(s.phone)
                  return (
                    <li className="zipl__shop" key={s.id}>
                      <div>
                        <h3 className="zipl__name">{s.name}</h3>
                        <p className="zipl__addr">{s.street}, {s.city}, {s.state} {s.zip}</p>
                        {phone && (
                          <a className="zipl__phone" href={`tel:${String(s.phone).replace(/\D/g, '')}`}>
                            {phone}
                          </a>
                        )}
                      </div>
                      <div className="zipl__acts">
                        <a
                          className="btn btn-orange btn-sm"
                          href={ORDER_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {ORDER_LABEL}
                        </a>
                        <a
                          className="zipl__dir"
                          href={mapsUrl(s)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MapPin size={14} /> Directions <ArrowUpRight size={12} />
                        </a>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
