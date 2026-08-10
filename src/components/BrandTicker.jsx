import { TICKER_ITEMS } from '../data/site'
import './BrandTicker.css'

// Seamless marquee. Two identical tracks scroll as one loop; the second is
// aria-hidden so screen readers hear the list once. Pauses under reduced motion.
export function BrandTicker({ variant = 'default' }) {
  const Track = ({ hidden }) => (
    <div className="ticker__track" aria-hidden={hidden || undefined}>
      {TICKER_ITEMS.map((item, i) => (
        <span className="ticker__item" key={`${item}-${i}`}>
          <span className={`ticker__text ticker__text--${i % 3}`}>{item}</span>
          <span className="ticker__star" aria-hidden="true">✦</span>
        </span>
      ))}
    </div>
  )
  return (
    <div className={`ticker ticker--${variant}`} role="marquee" aria-label="ATL Wing Spot highlights">
      <div className="ticker__viewport">
        <Track />
        <Track hidden />
      </div>
    </div>
  )
}
