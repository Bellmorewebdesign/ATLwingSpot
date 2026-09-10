import { ORDER_URL, ORDER_LABEL } from '../data/site'
import { asset } from '../lib/asset'
import { ArrowRight } from './Icons'
import './FinalCTA.css'

// Cyan takeover, asymmetric: type sits low-left, the basket bleeds off the
// right edge at full size. The shot is a whole box keyed off its studio ground,
// so the only edge that cuts is the one running off the page: the previous
// asset was a crop, and its straight top edge read as a mistake against the
// flat cyan. Orange packaging on purpose too — a cyan ATL box would vanish
// into this section, and a white paper liner keys transparent and lets the
// cyan through.
export function FinalCTA() {
  return (
    <section className="fcta ch-cyan" id="order">
      <img
        className="fcta__food"
        src={asset('assets/food/client-refresh/onion-rings-orange-box.webp')}
        alt=""
        width="1100"
        height="922"
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
              {ORDER_LABEL} <ArrowRight />
            </a>
            <p className="fcta__note">Pickup or delivery. The button opens ATL&rsquo;s Snackpass ordering page.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
