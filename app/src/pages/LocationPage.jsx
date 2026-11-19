import { Link, useParams } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { ArrowRight, ArrowUpRight } from '../components/Icons'
import { PAGES } from '../data/routes'
import { ORDER_LABEL, BRAND } from '../data/site'
import {
  LOCATIONS, findLocationBySlug, locationPage, locationPath, mapsUrl, mapEmbedUrl, formatPhone, stateName, shopOrderUrl,
} from '../data/locations'
import { lateNight } from '../data/hours'
import { locationData } from '../data/structuredData'
import './LocationPage.css'

/*
 * One shop: /locations/<shop>-<state>/ (see locationPage() in data/locations.js).
 *
 * Built so the page can rank for "wings in East Meadow" and "halal wings near
 * me" on its own: the town in the title and the heading, the full address,
 * hours and phone as text, a map, the shop's Restaurant structured data, and
 * links to the menu, the flavors and the other shops in the same state.
 * Everything on it comes from data/locations.js, so it can't drift from the
 * locations page.
 */
export default function LocationPage({ fallback = null }) {
  const { slug } = useParams()
  const loc = findLocationBySlug(slug)
  if (!loc) return fallback

  const phone = formatPhone(loc.phone)
  const tel = loc.phone ? `tel:${String(loc.phone).replace(/\D/g, '')}` : null
  const hours = loc.hours ? loc.hours.split(' · ') : []
  const state = stateName(loc.state)
  const late = !loc.tempClosed && lateNight(loc.hours)
  const nearby = LOCATIONS.filter((l) => l.state === loc.state && l.id !== loc.id)
  const reviews = (loc.reviews || []).filter((r) => r && r.quote)

  return (
    <div className="page shop ch-cream">
      <Seo page={locationPage(loc)} data={locationData(loc)} />

      <header className="mast wrap shop__mast">
        <nav className="shop__crumbs" aria-label="Breadcrumb">
          <Link to={PAGES.locations.path}>Locations</Link>
          <span aria-hidden="true"> / </span>
          <span>{state}</span>
        </nav>
        <h1 className="dsp dsp-lg">Halal wings in<br /><span className="t-cyan">{loc.name}.</span></h1>
        {late && <p className="shop__late">{late}</p>}
        <p className="mast__sub">
          ATL Wing Spot {loc.name}: fresh, never frozen wings, fried to order and tossed in {BRAND.flavorCount} sauces
          and dry rubs. 100% halal, for pickup or delivery.
        </p>
        {loc.about && <p className="shop__about">{loc.about}</p>}
      </header>

      <div className="wrap shop__body">
        <div className="shop__grid">
          <section className="shop__card" aria-labelledby="shop-visit">
            <h2 className="dsp shop__h" id="shop-visit">Visit us</h2>
            {loc.tempClosed && <p className="shop__closed">Temporarily closed</p>}
            <dl className="shop__facts">
              <div>
                <dt>Address</dt>
                <dd><address>{loc.street}<br />{loc.city}, {loc.state} {loc.zip}</address></dd>
              </div>
              {hours.length > 0 && (
                <div>
                  <dt>Hours</dt>
                  <dd>{hours.map((h) => <span key={h} className="shop__line">{h}</span>)}</dd>
                </div>
              )}
              {phone && (
                <div>
                  <dt>Phone</dt>
                  <dd><a href={tel}>{phone}</a></dd>
                </div>
              )}
              {loc.parking && (
                <div>
                  <dt>Parking</dt>
                  <dd>{loc.parking}</dd>
                </div>
              )}
            </dl>
            <div className="shop__acts">
              {!loc.tempClosed && (
                <a className="btn btn-orange" href={shopOrderUrl(loc)} target="_blank" rel="noopener noreferrer">
                  {ORDER_LABEL} <ArrowRight />
                </a>
              )}
              <a className="btn btn-ink" href={mapsUrl(loc)} target="_blank" rel="noopener noreferrer">
                Directions <ArrowUpRight size={14} />
              </a>
              {tel && <a className="btn btn-line" href={tel}>Call</a>}
            </div>
            <a className="shop__google" href={mapsUrl(loc)} target="_blank" rel="noopener noreferrer">
              Reviews and photos on Google <ArrowUpRight size={13} />
            </a>
          </section>

          <div className="shop__map">
            <iframe
              title={`Map of ATL Wing Spot ${loc.name}, ${loc.street}, ${loc.city}`}
              src={mapEmbedUrl(loc)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        {reviews.length > 0 && (
          <section className="shop__said" aria-labelledby="shop-said">
            <h2 className="dsp shop__h" id="shop-said">What people say</h2>
            <ul className="shop__quotes">
              {reviews.map((r) => (
                <li key={r.quote}>
                  <blockquote className="shop__quote">&ldquo;{r.quote}&rdquo;</blockquote>
                  <p className="shop__by">{r.name}{r.source ? `, on ${r.source}` : ''}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="shop__more" aria-labelledby="shop-menu">
          <h2 className="dsp shop__h" id="shop-menu">On the menu</h2>
          <p>
            Bone-in and boneless wings, saucy tenders, chicken n&rsquo; waffles, quesadillas, loaded waffle fries,
            shakes and more.
          </p>
          <div className="shop__links">
            <Link to={PAGES.menu.path} className="btn btn-ink btn-sm">Full menu <ArrowRight /></Link>
            <Link to={PAGES.flavors.path} className="btn btn-line btn-sm">All {BRAND.flavorCount} flavors</Link>
            <Link to={PAGES.catering.path} className="btn btn-line btn-sm">Catering</Link>
          </div>
        </section>

        {nearby.length > 0 && (
          <section className="shop__near" aria-labelledby="shop-near">
            <h2 className="dsp shop__h" id="shop-near">More ATL Wing Spot in {state}</h2>
            <ul className="shop__list">
              {nearby.map((l) => (
                <li key={l.id}>
                  <Link to={locationPath(l)} className="shop__other">
                    <span className="shop__other-name">{l.name}</span>
                    <span className="shop__other-addr">{l.street}, {l.city}</span>
                    <ArrowRight />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="shop__all">
          <Link to={PAGES.locations.path}>All {LOCATIONS.length} ATL Wing Spot locations <ArrowRight /></Link>
        </p>
      </div>
    </div>
  )
}
