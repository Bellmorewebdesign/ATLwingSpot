import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { NAV_LINKS } from '../data/navigation'
import { SOCIAL } from '../data/site'
import { OrderButton } from './OrderButton'
import { Instagram, TikTok, ArrowUpRight } from './Icons'
import { useScrollLock } from '../hooks/useScrollLock'
import './MobileMenu.css'

export function MobileMenu({ open, onClose }) {
  const location = useLocation()
  useScrollLock(open)

  // Close on route change
  useEffect(() => { onClose() }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div className={`mobile-menu ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <nav className="mobile-menu__nav" aria-label="Mobile">
        {NAV_LINKS.map((link, i) => (
          <Link
            key={link.to}
            to={link.to}
            className="mobile-menu__link font-display"
            style={{ '--i': i }}
            onClick={onClose}
          >
            <span className="mobile-menu__num">0{i + 1}</span>
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="mobile-menu__foot">
        <OrderButton className="mobile-menu__order btn--block btn--lg">Order Now</OrderButton>
        <div className="mobile-menu__social">
          <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <Instagram /> <span>Instagram</span> <ArrowUpRight />
          </a>
          <a href={SOCIAL.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok">
            <TikTok /> <span>TikTok</span> <ArrowUpRight />
          </a>
        </div>
        <p className="mobile-menu__tag">100% Halal · Fresh, Never Frozen · 25+ Flavors</p>
      </div>
    </div>
  )
}
