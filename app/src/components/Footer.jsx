import { Link } from 'react-router-dom'
import { FOOTER_LINKS } from '../data/navigation'
import { SOCIAL, BOX_WORDS } from '../data/site'
import { asset } from '../lib/asset'
import { WordStripe } from './WordStripe'
import { Instagram, TikTok } from './Icons'
import './Footer.css'

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="foot ch-dark">
      <WordStripe words={BOX_WORDS} tone="cyan" size="sm" speed={40} />

      <div className="wrap foot__in">
        <div className="foot__top">
          <img
            className="foot__logo"
            src={asset('assets/brand/atl-wing-spot-logo.png')}
            alt="ATL Wing Spot"
            width="200" height="88"
            loading="lazy"
          />
          <p className="foot__facts">100% Halal · Fresh, never frozen · 25+ sauces</p>
        </div>

        <div className="foot__cols">
          <nav className="foot__col" aria-label="Footer">
            <h2 className="foot__h">Menu &amp; more</h2>
            {FOOTER_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="foot__link">{l.label}</Link>
            ))}
          </nav>

          <div className="foot__col">
            <h2 className="foot__h">Find us</h2>
            <a className="foot__link" href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer">
              <Instagram size={16} /> Instagram
            </a>
            <a className="foot__link" href={SOCIAL.tiktok} target="_blank" rel="noopener noreferrer">
              <TikTok size={16} /> TikTok
            </a>
            <Link className="foot__link" to="/locations">All locations</Link>
            <Link className="foot__link" to="/contact">Contact</Link>
          </div>

          <p className="dsp foot__mark">Stay<br /><span className="t-orange">Saucy.</span></p>
        </div>

        <div className="foot__legal">
          <p>© {year} ATL Wing Spot</p>
          <p className="foot__disc">
            Website concept. Prices and availability vary by location. Ordering is handled on ATL&rsquo;s
            own ordering page.
          </p>
        </div>
      </div>
    </footer>
  )
}
