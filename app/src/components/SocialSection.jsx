import { useEffect, useRef } from 'react'
import { SOCIAL, BRAND } from '../data/site'
import { asset } from '../lib/asset'
import { Reveal } from './Reveal'
import { Instagram, TikTok, ArrowUpRight } from './Icons'
import { useReducedMotion } from '../hooks/useReducedMotion'
import './SocialSection.css'

const COLS = [
  [
    { type: 'img', src: 'assets/food/fruity-pebbles-chicken-waffles.jpg' },
    { type: 'img', src: 'assets/food/hero-wings.jpg' },
  ],
  [
    { type: 'callout', kicker: 'TikTok breakout', big: '1M+', sub: 'views, one month in' },
    { type: 'img', src: 'assets/food/saucy-tenders.jpg' },
    { type: 'img', src: 'assets/food/boneless-combo.jpg' },
  ],
  [
    { type: 'img', src: 'assets/food/chipotle-chicken-sandwich.jpg' },
    { type: 'callout', kicker: 'Follow', big: BRAND.handle, sub: 'See what the hype is about', accent: true },
  ],
]

export function SocialSection({ index = '12' }) {
  const wallRef = useRef(null)
  const reduced = useReducedMotion()

  // Opposing vertical drift per column — feed-like motion, transform only.
  useEffect(() => {
    if (reduced) return
    const wall = wallRef.current
    if (!wall) return
    if (!window.matchMedia('(min-width: 861px)').matches) return
    const cols = Array.from(wall.querySelectorAll('.social__col'))
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const rect = wall.getBoundingClientRect()
        const center = rect.top + rect.height / 2 - window.innerHeight / 2
        cols.forEach((c, i) => {
          const dir = i % 2 === 0 ? -1 : 1
          c.style.transform = `translate3d(0, ${center * 0.04 * dir}px, 0)`
        })
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [reduced])

  return (
    <section className="section social" id="social">
      <div className="container-wide social__grid">
        <div className="social__intro">
          <Reveal><p className="eyebrow"><span className="dot" /> {index} — The Hype</p></Reveal>
          <h2 className="social__title font-display">
            Don’t just<br />take our<br /><span className="accent-c">word for it.</span>
          </h2>
          <Reveal delay={120}>
            <p className="lead social__lead">A month after opening, ATL broke out on TikTok. The feed’s been eating ever since.</p>
          </Reveal>
          <Reveal delay={180} className="social__actions">
            <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer" className="btn btn--cyan">
              <Instagram size={18} /> Instagram <ArrowUpRight />
            </a>
            <a href={SOCIAL.tiktok} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
              <TikTok size={18} /> TikTok <ArrowUpRight />
            </a>
          </Reveal>
        </div>

        <div className="social__wall" ref={wallRef} aria-hidden="true">
          {COLS.map((col, ci) => (
            <div className="social__col" key={ci}>
              {col.map((cell, i) =>
                cell.type === 'img' ? (
                  <div className="social__frame" key={i}>
                    <img src={asset(cell.src)} alt="" loading="lazy" decoding="async" />
                  </div>
                ) : (
                  <div className={`social__callout ${cell.accent ? 'is-accent' : ''}`} key={i}>
                    <span className="social__callout-kicker">{cell.kicker}</span>
                    <span className="social__callout-big font-display">{cell.big}</span>
                    <span className="social__callout-sub">{cell.sub}</span>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
