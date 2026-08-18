import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { NAV_LINKS } from '../data/navigation'
import { ORDER_URL } from '../data/site'
import { Logo } from './Logo'
import { MobileMenu } from './MobileMenu'
import { ArrowRight } from './Icons'
import './Header.css'

export function Header() {
  const [stuck, setStuck] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <header className={`head ${stuck ? 'is-stuck' : ''}`}>
        <div className="head__in">
          <Logo className="head__logo" />

          <nav className="head__nav" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `head__link ${isActive ? 'on' : ''}`}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="head__right">
            <a className="btn btn-orange btn-sm head__order" href={ORDER_URL} target="_blank" rel="noopener noreferrer">
              Order <ArrowRight />
            </a>
            <button
              className={`burger ${open ? 'on' : ''}`}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>
      <MobileMenu open={open} onClose={() => setOpen(false)} />
    </>
  )
}
