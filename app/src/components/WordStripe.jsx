import { useLayoutEffect, useRef, useState } from 'react'
import './WordStripe.css'

/**
 * Our own packaging motif: the cyan takeout box is printed with big white words
 * repeating edge to edge — WINGS TENDERS MUNCHIES WAFFLES SHAKES. We reuse it
 * as the brand's structural divider instead of a generic marquee.
 *
 * THE STRIPE HAS TO STAY FULL. The usual two-copy marquee only looks full while
 * a single copy is at least as wide as the stripe: translate it by half its own
 * width and, at the end of the cycle, the trailing copy starts at the left edge
 * and runs out before the right one. On a wide screen, or with a short word
 * list, that leaves a bare patch of colour chasing the last word.
 *
 * So the run of words is measured and repeated as many times as it takes to
 * cover the stripe plus one spare (N >= viewport / copy + 1), and the animation
 * shifts by exactly ONE copy's width rather than by a percentage of the whole
 * row. Pixels, not percentages, because the number of copies changes with the
 * viewport while the seam must stay exact. A ResizeObserver re-measures on
 * resize and when the display font finishes loading and the words reflow.
 */
export function WordStripe({ words, tone = 'cyan', speed = 34, size = 'md', separator = '' }) {
  const stripeRef = useRef(null)
  const trackRef = useRef(null)
  const [copies, setCopies] = useState(2)
  const [shift, setShift] = useState(0)

  useLayoutEffect(() => {
    const stripe = stripeRef.current
    const track = trackRef.current
    if (!stripe || !track) return

    const measure = () => {
      const run = track.getBoundingClientRect().width
      if (!run) return
      setShift(run)
      // worst case is mid-cycle, when the first copy has slid a full width off
      // the left: the remaining N-1 copies still have to reach the right edge
      setCopies(Math.max(2, Math.ceil(stripe.clientWidth / run) + 1))
    }

    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(stripe)
    ro.observe(track)
    return () => ro.disconnect()
  }, [words, size, separator])

  const style = { '--ws-speed': `${speed}s` }
  // until the first measurement, two copies and -50% are the same thing
  if (shift) style['--ws-shift'] = `${shift}px`

  return (
    <div
      ref={stripeRef}
      className={`ws ws--${tone} ws--${size}`}
      style={style}
      role="presentation"
    >
      <div className="ws__viewport">
        {Array.from({ length: copies }, (_, copy) => (
          <div
            className="ws__track"
            key={copy}
            ref={copy === 0 ? trackRef : undefined}
            /* the words are decorative and identical; only the first run is
               left in the accessibility tree */
            aria-hidden={copy > 0 || undefined}
          >
            {words.map((w, i) => (
              <span className="ws__item" key={`${w}-${i}`}>
                {w}
                {separator && <b className="ws__sep">{separator}</b>}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
