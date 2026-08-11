import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { NAV_LINKS } from '../data/navigation'
import { Logo } from './Logo'
import { OrderButton } from './OrderButton'
import { MobileMenu } from './MobileMenu'
import './Header.css'

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <header className={`site-head ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="site-head__inner container-wide">
          <Logo className="site-head__logo" />

          <nav className="site-head__nav" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `site-head__link ${isActive ? 'is-active' : ''}`}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="site-head__actions">
            <OrderButton className="site-head__order" size="sm">Order Now</OrderButton>
            <button
              className={`hamburger ${menuOpen ? 'is-open' : ''}`}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}
