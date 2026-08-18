import { Link } from 'react-router-dom'
import { STORY_BEATS } from '../data/story'
import { Reveal } from './Reveal'
import { ArrowRight } from './Icons'
import './StoryScale.css'

/**
 * The story is carried by the figures themselves, which grow as you scroll.
 * Right-led composition, deliberately unlike the left-anchored sections.
 */
export function StoryScale() {
  return (
    <section className="story ch-dark" id="story">
      <div className="wrap">
        <Reveal className="story__intro">
          <h2 className="story__kick">It started in a room the size of a kitchen.</h2>
        </Reveal>

        <ol className="story__beats">
          {STORY_BEATS.map((b, i) => (
            <Reveal as="li" className={`beat beat--${i}`} key={b.id} delay={60}>
              <div className="beat__txt">
                <span className="beat__when">{b.when}</span>
                <p className="beat__line">{b.line}</p>
              </div>
              <p className="dsp beat__fig" aria-hidden="true">
                {b.figure}<span className="beat__unit">{b.unit}</span>
              </p>
              <span className="sr-only">{b.figure} {b.unit}</span>
            </Reveal>
          ))}
        </ol>

        <Reveal className="story__out">
          <Link to="/story" className="tlink t-cyan">Read the whole story <ArrowRight /></Link>
        </Reveal>
      </div>
    </section>
  )
}
