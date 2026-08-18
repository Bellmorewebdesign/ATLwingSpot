import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { NAV_LINKS } from '../data/navigation'
import { SOCIAL, ORDER_URL } from '../data/site'
import { useScrollLock } from '../hooks/useScrollLock'
import { Instagram, TikTok, ArrowRight, ArrowUpRight } from './Icons'
import './MobileMenu.css'

export function MobileMenu({ open, onClose }) {
  const location = useLocation()
  useScrollLock(open)

  useEffect(() => { onClose() }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div className={`mm ${open ? 'on' : ''}`} aria-hidden={!open}>
      <nav className="mm__nav" aria-label="Mobile">
        {NAV_LINKS.map((l, i) => (
          <Link key={l.to} to={l.to} className="dsp mm__link" style={{ '--i': i }} onClick={onClose}>
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="mm__foot">
        <a className="btn btn-ink btn-lg btn-block" href={ORDER_URL} target="_blank" rel="noopener noreferrer">
          Order now <ArrowRight />
        </a>
        <div className="mm__social">
          <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer">
            <Instagram size={18} /> <span>Instagram</span> <ArrowUpRight size={13} />
          </a>
          <a href={SOCIAL.tiktok} target="_blank" rel="noopener noreferrer">
            <TikTok size={18} /> <span>TikTok</span> <ArrowUpRight size={13} />
          </a>
        </div>
        <p className="mm__facts">100% Halal · Fresh, never frozen · 30+ sauces</p>
      </div>
    </div>
  )
}
