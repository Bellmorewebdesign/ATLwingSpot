import { forwardRef, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { findByZip, formatPhone, approxMiles, mapsUrl } from '../data/locations'
import { ORDER_URL, ORDER_LABEL } from '../data/site'
import { Search, MapPin, ArrowUpRight } from './Icons'
import './ZipLookup.css'

/**
 * Type a ZIP, get the shops closest to it.
 *
 * Deliberately small: one field, at most three results. It runs entirely on the
 * bundled location data, so it works on a static Pages build with no geocoder
 * and no network call. See findByZip in data/locations.js for how the ranking
 * is put together.
 *
 * Nobody has to know a ZIP we are actually in — any US ZIP resolves to the
 * nearest shops, and anything past about 25 miles says how far rather than
 * pretending it is local. The answer appears as soon as the fifth digit lands,
 * so the button is really there for the people who go looking for one.
 *
 * Forwards a ref to the input so a page can send someone straight to it.
 */
export const ZipLookup = forwardRef(function ZipLookup({ heading = 'Find your closest shop' }, ref) {
  const id = useId()
  const [value, setValue] = useState('')
  const [result, setResult] = useState(null)

  const submit = (e) => {
    e.preventDefault()
    setResult(findByZip(value))
  }

  const onChange = (e) => {
    const next = e.target.value.replace(/[^\d]/g, '').slice(0, 5)
    setValue(next)
    setResult(next.length === 5 ? findByZip(next) : null)
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
              ref={ref}
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

      <div className="zipl__out" aria-live="polite">
        {result && (
          <>
            {result.status === 'invalid' && (
              <p className="zipl__msg">That is not a five-digit ZIP.</p>
            )}
            {result.status === 'empty' && (
              <p className="zipl__msg">Enter a ZIP code to see what is near you.</p>
            )}
            {result.status === 'none' && (
              <p className="zipl__msg">
                We do not know that ZIP.{' '}
                <Link className="tlink" to="/locations">See every location</Link>
              </p>
            )}
            {(result.status === 'exact' || result.status === 'near' || result.status === 'far') && (
              <>
                <p className="zipl__msg">
                  {result.status === 'exact' && `We are in ${result.zip}.`}
                  {result.status === 'near' && `Closest to ${result.zip}:`}
                  {/* miles is 0 when the area is too spread out for one number
                      to be true of all of it, so the distance is left off */}
                  {result.status === 'far' &&
                    (result.miles
                      ? `Nearest to ${result.zip}, about ${approxMiles(result.miles)} miles out:`
                      : `Nearest to ${result.zip}:`)}
                </p>
                <ul className="zipl__list">
                  {result.shops.map((s) => {
                    const phone = formatPhone(s.phone)
                    return (
                      <li className="zipl__shop" key={s.id}>
                        <div className="zipl__info">
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
                {result.status === 'far' && (
                  <p className="zipl__msg zipl__more">
                    <Link className="tlink" to="/locations">See every location</Link>
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
})
