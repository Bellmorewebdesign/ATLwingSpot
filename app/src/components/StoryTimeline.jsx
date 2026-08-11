import { MILESTONES } from '../data/story'
import { useScrollProgress } from '../hooks/useScrollProgress'
import { Reveal } from './Reveal'
import { Link } from 'react-router-dom'
import { ArrowRight } from './Icons'
import './StoryTimeline.css'

export function StoryTimeline({ index = '07' }) {
  const [ref, progress] = useScrollProgress()

  return (
    <section className="section story-tl" id="story">
      <div className="container-wide story-tl__grid">
        <aside className="story-tl__aside">
          <Reveal><p className="eyebrow"><span className="dot" /> {index} — Our Story</p></Reveal>
          <Reveal delay={80}>
            <h2 className="story-tl__title font-display">
              From<br /><span className="accent-o">800 sq ft</span><br />to something bigger.
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="story-tl__closing">Now we’re just getting started.</p>
            <Link to="/story" className="btn btn--ghost story-tl__more">
              Read the full story <ArrowRight />
            </Link>
          </Reveal>
        </aside>

        <div className="story-tl__track" ref={ref}>
          <span className="story-tl__spine" aria-hidden="true">
            <span className="story-tl__spine-fill" style={{ transform: `scaleY(${progress})` }} />
          </span>
          <ol className="story-tl__list">
            {MILESTONES.map((m, i) => (
              <Reveal as="li" key={m.id} className="story-tl__item" delay={i * 60}>
                <span className="story-tl__node" aria-hidden="true" />
                <div className="story-tl__marker">{m.marker}</div>
                <h3 className="story-tl__item-title font-display">{m.title}</h3>
                <p className="story-tl__body">{m.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
