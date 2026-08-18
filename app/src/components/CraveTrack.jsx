import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ORDER_URL } from '../data/site'
import { asset } from '../lib/asset'
import { ArrowRight, ArrowLeft } from './Icons'
import './CraveTrack.css'

const PANELS = [
  { cat: 'wings',      name: 'Bone-In\nWings',    line: 'Fresh, never frozen. Fried to order, sauced to order.', img: 'assets/food/hero-wings.jpg' },
  { cat: 'boneless',   name: 'Boneless',          line: 'All white meat, hand breaded, same 25+ sauces.',        img: 'assets/food/boneless-combo.jpg', focus: '22% 72%' },
  { cat: 'tenders',    name: 'Saucy\nTenders',    line: 'Jumbo tenders. Sauced, or sauce on the side.',          img: 'assets/food/saucy-tenders.jpg' },
  { cat: 'waffles',    name: "Chicken\nN' Waffles", line: 'Fruity Pebbles, Oreo or Cinnamon Toast Crunch.',      img: 'assets/food/fruity-pebbles-chicken-waffles.jpg' },
  { cat: 'fries',      name: 'Sides +\nMunchies', line: 'Cajun corn, loaded waffle fries, mozzarella sticks.',   img: 'assets/food/cajun-corn-cutout.png', contain: true },
  { cat: 'desserts',   name: 'Shakes +\nSweets',  line: 'Seven shakes, fried Oreos, funnel cake fries.',         img: 'assets/food/shakes-lineup.webp', contain: true },
]

export function CraveTrack() {
  const railRef = useRef(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const sync = useCallback(() => {
    const el = railRef.current
    if (!el) return
    setAtStart(el.scrollLeft < 12)
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 12)
  }, [])

  useEffect(() => {
    const el = railRef.current
    if (!el) return
    sync()
    el.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => { el.removeEventListener('scroll', sync); window.removeEventListener('resize', sync) }
  }, [sync])

  const nudge = (dir) => {
    const el = railRef.current
    if (!el) return
    const panel = el.querySelector('.crave__panel')
    const step = panel ? panel.getBoundingClientRect().width + 16 : el.clientWidth * 0.8
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  return (
    <section className="crave ch-dark" id="crave">
      <div className="crave__head wrap">
        <h2 className="dsp dsp-sm crave__title">What are we eating?</h2>
        <div className="crave__nav">
          <button className="crave__arrow" onClick={() => nudge(-1)} disabled={atStart} aria-label="Previous">
            <ArrowLeft />
          </button>
          <button className="crave__arrow" onClick={() => nudge(1)} disabled={atEnd} aria-label="Next">
            <ArrowRight />
          </button>
        </div>
      </div>

      <ul className="crave__rail" ref={railRef} tabIndex={0} aria-label="Menu categories, scroll horizontally">
        {PANELS.map((p) => (
          <li className="crave__panel" key={p.cat}>
            <div className={`crave__media ${p.contain ? 'is-contain' : ''}`}>
              <img src={asset(p.img)} alt={p.name.replace('\n', ' ')} loading="lazy" decoding="async"
                style={p.focus ? { objectPosition: p.focus } : undefined} />
            </div>
            <div className="crave__body">
              <h3 className="dsp crave__name">{p.name.split('\n').map((l, i) => <span key={i}>{l}</span>)}</h3>
              <p className="crave__line">{p.line}</p>
              <div className="crave__links">
                <Link className="btn btn-cream btn-sm" to={`/menu?cat=${p.cat}`}>See it</Link>
                <a className="btn btn-line btn-sm" href={ORDER_URL} target="_blank" rel="noopener noreferrer">Order</a>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="crave__hint wrap">Swipe or drag to see everything →</p>
    </section>
  )
}
