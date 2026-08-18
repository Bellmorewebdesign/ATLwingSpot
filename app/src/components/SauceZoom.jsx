import { asset } from '../lib/asset'
import { useScrollProgress } from '../hooks/useScrollProgress'
import { useReducedMotion } from '../hooks/useReducedMotion'
import './SauceZoom.css'

const IMG = 'assets/food/wings-macro.webp'

/**
 * The signature scroll moment.
 *
 * "SAUCE IT UP" (ATL's own printed slogan) is a WINDOW onto a macro shot of
 * the sauce: the type layer is viewport-sized with the same cover-positioned
 * background as the photo behind it, so the letters line up pixel-for-pixel
 * with the image. Scrolling grows the type and dissolves the cream ground —
 * so the letters melt seamlessly into a full-bleed wall of sauce.
 *
 * Growth is driven by font-size rather than transform: a transform would scale
 * the letter's slice of the image too, magnifying it into a soft blur and
 * breaking the illusion.
 */
export function SauceZoom() {
  const [ref, p] = useScrollProgress()
  const reduced = useReducedMotion()
  const url = asset(IMG)

  if (reduced) {
    return (
      <section className="zoom zoom--static" aria-label="Sauce it up">
        <img className="zoom__bg" src={url} alt="Wings coated in ATL sauce" loading="lazy" />
        <p className="zoom__still dsp">Sauce<br />it up.</p>
      </section>
    )
  }

  const ease = (t) => 1 - Math.pow(1 - t, 3)
  const clamp01 = (t) => Math.min(Math.max(t, 0), 1)

  const k = 1 + ease(clamp01(p / 0.85)) * 7        // type grows
  const veil = 1 - clamp01((p - 0.42) / 0.34)      // cream ground dissolves
  const fade = 1 - clamp01((p - 0.82) / 0.14)      // type retires once matched

  return (
    <section className="zoom" ref={ref} aria-label="Sauce it up">
      <div className="zoom__sticky">
        <img
          className="zoom__bg"
          src={url}
          alt="Wings coated in ATL sauce"
          loading="lazy"
          decoding="async"
        />

        <div className="zoom__veil" style={{ opacity: veil }} aria-hidden="true" />

        <p
          className="zoom__word dsp"
          style={{ '--k': k, opacity: fade, backgroundImage: `url(${url})` }}
          aria-hidden="true"
        >
          Sauce<br />it up.
        </p>

        <span className="zoom__cue" style={{ opacity: veil }} aria-hidden="true">Keep scrolling</span>
      </div>
    </section>
  )
}
