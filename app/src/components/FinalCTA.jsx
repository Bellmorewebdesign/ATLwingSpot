import { ORDER_URL } from '../data/site'
import { asset } from '../lib/asset'
import { ArrowRight } from './Icons'
import './FinalCTA.css'

// Cyan takeover, asymmetric: type sits low-left, the basket bleeds off the
// right edge at full size.
export function FinalCTA() {
  return (
    <section className="fcta ch-cyan" id="order">
      <img
        className="fcta__food"
        src={asset('assets/food/chicken-waffles-cutout.webp')}
        alt=""
        loading="lazy"
        decoding="async"
        aria-hidden="true"
      />
      <div className="wrap fcta__in">
        <div className="fcta__col">
          <p className="fcta__kick">Pick a sauce and we&rsquo;ll start frying</p>
          <h2 className="dsp fcta__h">Let&rsquo;s eat.</h2>
          <div className="fcta__acts">
            <a className="btn btn-ink btn-lg" href={ORDER_URL} target="_blank" rel="noopener noreferrer">
              Order now <ArrowRight />
            </a>
            <p className="fcta__note">Pickup or delivery. The button opens ATL&rsquo;s own ordering page.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
