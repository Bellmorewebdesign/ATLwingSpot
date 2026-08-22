import { asset } from '../lib/asset'
import { useScrollProgress } from '../hooks/useScrollProgress'
import { useReducedMotion } from '../hooks/useReducedMotion'
import './SauceZoom.css'

const IMG = 'assets/food/sauce-wall.webp'

/**
 * The signature scroll moment.
 *
 * "SAUCE IT UP" (ATL's own printed slogan) is a WINDOW onto the sauce wall:
 * the type layer is viewport-sized with the same cover-positioned background
 * as the photo behind it, so the letters line up pixel-for-pixel with the
 * image. Scrolling grows the type and dissolves the cream ground, so the
 * letters melt seamlessly into a full-bleed wall of sauce.
 *
 * The artwork is the 1894px source at NATIVE scale, with its white studio
 * background soft-blended into a sauce-coloured field (no hard key, so no
 * cut-out edges). An earlier macro crop was upscaled ~1.75x before `cover`
 * upscaled it again, which is what made the letters look mushy.
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
        <img className="zoom__bg" src={url} alt="A basket of ATL Wing Spot wings" loading="lazy" />
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
          alt="A basket of ATL Wing Spot wings"
          loading="lazy"
          decoding="async"
        />

        <div className="zoom__veil" style={{ opacity: veil }} aria-hidden="true" />

        <p
          className="zoom__word dsp"
          style={{ '--k': k, opacity: fade, backgroundImage: `url(${url})` }}
          aria-hidden="true"
        >
          <span className="zoom__lines">
            <span className="zoom__line">Sauce</span>
            <span className="zoom__line">it up.</span>
          </span>
        </p>

        <span className="zoom__cue" style={{ opacity: veil }} aria-hidden="true">Keep scrolling</span>
      </div>
    </section>
  )
}
