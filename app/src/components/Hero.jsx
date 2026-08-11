import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { OrderButton } from './OrderButton'
import { ArrowRight } from './Icons'
import { asset } from '../lib/asset'
import { useReducedMotion } from '../hooks/useReducedMotion'
import './Hero.css'

export function Hero() {
  const foodRef = useRef(null)
  const stageRef = useRef(null)
  const reduced = useReducedMotion()

  // Subtle scroll + pointer parallax on the wings basket. Transform/opacity
  // only; disabled entirely for reduced-motion and coarse pointers.
  useEffect(() => {
    if (reduced) return
    const food = foodRef.current
    const stage = stageRef.current
    if (!food || !stage) return
    // Parallax only where the basket is absolutely positioned (desktop).
    // On phones it sits in normal flow, so moving it would collide with copy.
    if (!window.matchMedia('(min-width: 821px)').matches) return

    let sy = 0
    let px = 0
    let py = 0
    let raf = 0

    const render = () => {
      raf = 0
      food.style.transform =
        `translate3d(${px}px, ${sy + py}px, 0) rotate(${-6 + px * 0.02}deg)`
    }
    // Establish the resting transform so the first pointer/scroll event
    // doesn't snap the basket from 0deg to its -6deg resting tilt.
    render()
    const schedule = () => { if (!raf) raf = requestAnimationFrame(render) }

    const onScroll = () => {
      const y = window.scrollY
      if (y > window.innerHeight) return
      sy = y * 0.12
      schedule()
    }
    const fine = window.matchMedia('(pointer:fine)').matches
    const onMove = (e) => {
      const r = stage.getBoundingClientRect()
      px = ((e.clientX - r.left) / r.width - 0.5) * 26
      py = ((e.clientY - r.top) / r.height - 0.5) * 18
      schedule()
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    if (fine) stage.addEventListener('pointermove', onMove)
    return () => {
      window.removeEventListener('scroll', onScroll)
      stage.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  return (
    <section className={`hero ${reduced ? 'no-anim' : ''}`} ref={stageRef}>
      <div className="hero__glow" aria-hidden="true" />
      <div className="hero__inner container-wide">
        <p className="hero__eyebrow">
          <span className="hero__eyebrow-item">100% Halal</span>
          <span className="hero__eyebrow-dot" />
          <span className="hero__eyebrow-item">Fresh, Never Frozen</span>
          <span className="hero__eyebrow-dot" />
          <span className="hero__eyebrow-item">25+ Flavors</span>
        </p>

        <h1 className="hero__headline font-display">
          <span className="hero__line"><span className="hero__word">Stay</span></span>
          <span className="hero__line hero__line--2"><span className="hero__word hero__word--saucy">Saucy.</span></span>
        </h1>

        <div className="hero__food-wrap" ref={foodRef}>
          <img
            className="hero__food"
            src={asset('assets/food/wings-basket-cutout.png')}
            alt="A basket of ATL Wing Spot buffalo wings with ranch"
            width="620"
            height="470"
            fetchpriority="high"
            decoding="async"
          />
        </div>

        <div className="hero__bottom">
          <p className="hero__sub">
            Fresh, never frozen wings tossed in <strong>25+ flavors</strong>.
            Voted <span className="text-cyan">Best Wings on Long Island</span>.
          </p>

          <div className="hero__actions">
            <OrderButton size="lg" className="hero__order">Order Now</OrderButton>
            <Link to="/locations" className="btn btn--ghost btn--lg">Find a Location</Link>
            <Link to="/menu" className="hero__menu-link link-arrow">
              View Menu <ArrowRight />
            </Link>
          </div>

          <p className="hero__note">
            <span className="hero__note-dot" /> Pickup + Delivery
            <span className="hero__note-sep">·</span> Powered by DoorDash
          </p>
        </div>
      </div>

      <div className="hero__scroll" aria-hidden="true">
        <span>Scroll</span>
        <span className="hero__scroll-line" />
      </div>
    </section>
  )
}
