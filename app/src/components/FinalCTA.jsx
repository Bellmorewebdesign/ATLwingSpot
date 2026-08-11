import { useEffect, useRef } from 'react'
import { ORDER_URL } from '../data/site'
import { asset } from '../lib/asset'
import { ArrowRight } from './Icons'
import { useReducedMotion } from '../hooks/useReducedMotion'
import './FinalCTA.css'

export function FinalCTA() {
  const btnRef = useRef(null)
  const reduced = useReducedMotion()

  // Magnetic pull on fine pointers only.
  useEffect(() => {
    if (reduced) return
    const btn = btnRef.current
    if (!btn || !window.matchMedia('(pointer:fine)').matches) return
    const strength = 0.3
    const onMove = (e) => {
      const r = btn.getBoundingClientRect()
      const x = e.clientX - (r.left + r.width / 2)
      const y = e.clientY - (r.top + r.height / 2)
      btn.style.transform = `translate(${x * strength}px, ${y * strength}px)`
    }
    const reset = () => { btn.style.transform = '' }
    const zone = btn.parentElement
    zone.addEventListener('pointermove', onMove)
    zone.addEventListener('pointerleave', reset)
    return () => { zone.removeEventListener('pointermove', onMove); zone.removeEventListener('pointerleave', reset) }
  }, [reduced])

  return (
    <section className="final-cta grain" id="order">
      <img className="final-cta__food" src={asset('assets/food/wings-basket-cutout.png')} alt="" loading="lazy" decoding="async" />
      <div className="container-wide final-cta__inner">
        <p className="final-cta__kicker">100% Halal · Fresh, Never Frozen · 25+ Flavors</p>
        <h2 className="final-cta__headline font-display">
          Enough<br />scrolling.
        </h2>
        <p className="final-cta__sub">You know you want the wings.</p>
        <div className="final-cta__btn-zone">
          <a
            ref={btnRef}
            href={ORDER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--orange btn--lg final-cta__btn"
          >
            Order ATL <ArrowRight />
          </a>
        </div>
        <p className="final-cta__note">Pickup + Delivery · Powered by DoorDash</p>
      </div>
    </section>
  )
}
