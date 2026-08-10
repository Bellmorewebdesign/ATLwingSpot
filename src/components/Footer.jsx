import { Link } from 'react-router-dom'
import { FOOTER_LINKS } from '../data/navigation'
import { SOCIAL } from '../data/site'
import { asset } from '../lib/asset'
import { OrderButton } from './OrderButton'
import { Instagram, TikTok, ArrowUpRight } from './Icons'
import './Footer.css'

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="foot grain">
      <div className="foot__hero container-wide">
        <div className="foot__word font-display" aria-hidden="true">
          <span>Stay</span>
          <span className="foot__word-out">Saucy.</span>
        </div>
        <div className="foot__cta">
          <p className="foot__cta-label">Still reading? The wings aren’t getting any closer.</p>
          <OrderButton size="lg" className="foot__order">Order ATL</OrderButton>
        </div>
      </div>

      <div className="foot__grid container-wide">
        <div className="foot__brand">
          <img src={asset('assets/brand/atl-wing-spot-logo.png')} alt="ATL Wing Spot" width="160" height="70" loading="lazy" />
          <p className="foot__halal">100% Halal · Fresh, Never Frozen · 25+ Flavors</p>
          <div className="foot__social">
            <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer" aria-label="ATL Wing Spot on Instagram">
              <Instagram size={20} />
            </a>
            <a href={SOCIAL.tiktok} target="_blank" rel="noopener noreferrer" aria-label="ATL Wing Spot on TikTok">
              <TikTok size={20} />
            </a>
          </div>
        </div>

        <nav className="foot__nav" aria-label="Footer">
          <h3 className="foot__nav-title">Explore</h3>
          {FOOTER_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="foot__nav-link">{l.label}</Link>
          ))}
        </nav>

        <div className="foot__col">
          <h3 className="foot__nav-title">Get ATL</h3>
          <a className="foot__nav-link" href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer">
            Instagram <ArrowUpRight size={13} />
          </a>
          <a className="foot__nav-link" href={SOCIAL.tiktok} target="_blank" rel="noopener noreferrer">
            TikTok <ArrowUpRight size={13} />
          </a>
          <Link className="foot__nav-link" to="/locations">Find a location</Link>
          <Link className="foot__nav-link" to="/catering">Catering</Link>
          <Link className="foot__nav-link" to="/franchise">Own a franchise</Link>
        </div>
      </div>

      <div className="foot__legal container-wide">
        <p>© {year} ATL Wing Spot. All rights reserved.</p>
        <p className="foot__disclaimer">
          Website redesign concept. Menu pricing &amp; availability vary by location. Ordering is fulfilled on ATL’s
          third-party platform.
        </p>
      </div>
    </footer>
  )
}
