import { Link } from 'react-router-dom'
import { ORDER_URL, ORDER_LABEL } from '../data/site'
import { ArrowRight } from './Icons'
import './Hero.css'

/**
 * Type only. The wordmark used to have a basket wedged inside it, painted twice
 * so the food broke through the letterforms; the client asked for the food out,
 * so the whole two-copy clip trick and its parallax went with it. What is left
 * is a single pass of STAY SAUCY. at poster scale on cream, which is why the
 * lockup is now allowed to run bigger than it could when it had to leave room
 * for a photograph.
 */
export function Hero() {
  return (
    <section className="hero">
      <div className="hero__inner wrap-full">
        <p className="hero__facts">
          <span>100% Halal</span><i /><span>Fresh, never frozen</span><i /><span>25+ sauces</span>
        </p>

        <h1 className="hero__h1">
          <span className="sr-only">ATL Wing Spot. Stay saucy.</span>
          <span className="hero__type" aria-hidden="true">
            <span className="hero__l1 dsp">Stay</span>
            <span className="hero__l2 dsp">Saucy.</span>
          </span>
        </h1>

        <div className="hero__actions">
          <a className="btn btn-orange btn-lg hero__order" href={ORDER_URL} target="_blank" rel="noopener noreferrer">
            {ORDER_LABEL} <ArrowRight />
          </a>
          <Link className="btn btn-line hero__find" to="/locations">Find a location</Link>
          <Link className="tlink hero__menu" to="/menu">See the menu <ArrowRight /></Link>
        </div>
      </div>
    </section>
  )
}
