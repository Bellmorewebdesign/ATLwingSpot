import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ORDER_URL } from '../data/site'
import { asset } from '../lib/asset'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { ArrowRight } from './Icons'
import './Hero.css'

/**
 * The food is wedged INSIDE the wordmark: the headline is rendered twice at
 * identical position — once behind the basket, once in front but clipped to
 * its lower half. The basket therefore sits between the upper and lower
 * halves of the letterforms and genuinely breaks through the type.
 */
export function Hero() {
  const foodRef = useRef(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const food = foodRef.current
    if (!food) return
    if (!window.matchMedia('(min-width: 861px)').matches) return

    let px = 0, py = 0, sy = 0, raf = 0
    const draw = () => {
      raf = 0
      food.style.transform = `translate3d(${px}px, ${sy + py}px, 0) scale(${1 + sy * 0.0004})`
    }
    const tick = () => { if (!raf) raf = requestAnimationFrame(draw) }

    const onMove = (e) => {
      px = (e.clientX / window.innerWidth - 0.5) * 22
      py = (e.clientY / window.innerHeight - 0.5) * 14
      tick()
    }
    const onScroll = () => {
      if (window.scrollY > window.innerHeight) return
      sy = window.scrollY * 0.09
      tick()
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  const Word = ({ front = false }) => (
    <div className={`hero__type ${front ? 'hero__type--front' : ''}`} aria-hidden="true">
      <span className="hero__l1 dsp">Stay</span>
      <span className="hero__l2 dsp">Saucy.</span>
    </div>
  )

  return (
    <section className="hero">
      <div className="hero__inner wrap-full">
        <p className="hero__facts">
          <span>100% Halal</span><i /><span>Fresh, never frozen</span><i /><span>30+ sauces</span>
        </p>

        <div className="hero__stage">
          <h1 className="hero__h1">
            <span className="sr-only">ATL Wing Spot — stay saucy</span>
            <Word />
          </h1>

          <img
            ref={foodRef}
            className="hero__food"
            src={asset('assets/food/wings-basket-cutout.png')}
            alt="A basket of ATL Wing Spot wings with ranch"
            width="1200" height="910"
            fetchpriority="high" decoding="async"
          />

          <Word front />
        </div>

        <div className="hero__actions">
          <a className="btn btn-orange btn-lg hero__order" href={ORDER_URL} target="_blank" rel="noopener noreferrer">
            Order now <ArrowRight />
          </a>
          <Link className="btn btn-line hero__find" to="/locations">Find a location</Link>
          <Link className="tlink hero__menu" to="/menu">See the menu <ArrowRight /></Link>
        </div>
      </div>
    </section>
  )
}
