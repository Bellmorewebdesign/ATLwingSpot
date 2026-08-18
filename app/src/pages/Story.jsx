import { Link } from 'react-router-dom'
import { STORY_CHAPTERS, PROOF } from '../data/story'
import { ORDER_URL } from '../data/site'
import { asset } from '../lib/asset'
import { Seo } from '../components/Seo'
import { Reveal } from '../components/Reveal'
import { ArrowRight } from '../components/Icons'
import './Story.css'

export default function Story() {
  return (
    <div className="page story-p">
      <Seo
        title="Our Story"
        description="ATL Wing Spot opened in May 2023 in a shop of about 800 square feet. A month later a TikTok crossed a million views. Here is what happened next."
      />

      {/* Dark, centred opening */}
      <header className="story-p__mast ch-dark">
        <div className="wrap">
          <p className="story-p__kick">May 2023</p>
          <h1 className="dsp dsp-lg story-p__h1">
            One shop.<br /><span className="t-orange">800 square feet.</span>
          </h1>
          <p className="story-p__lede">
            Two friends put their savings into a room barely bigger than the kitchen inside it,
            and started frying wings to order.
          </p>
        </div>
      </header>

      <section className="story-p__proof ch-cyan">
        <div className="wrap story-p__proof-in">
          {PROOF.map((p) => (
            <div className="pf" key={p.value}>
              <span className="pf__l">{p.label}</span>
              <span className="dsp pf__v">{p.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="sec ch-cream">
        <div className="wrap story-p__chapters">
          {STORY_CHAPTERS.map((c, i) => (
            <Reveal as="article" className="chap" key={c.id} delay={40}>
              <span className="chap__n">{String(i + 1).padStart(2, '0')}</span>
              <div className="chap__body">
                <span className="chap__when">{c.when}</span>
                <h2 className="dsp chap__title">{c.title}</h2>
                <p className="chap__text">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="story-p__feast" aria-hidden="true">
        <img src={asset('assets/food/fruity-pebbles-chicken-waffles.jpg')} alt="" loading="lazy" />
        <img src={asset('assets/food/hero-wings.jpg')} alt="" loading="lazy" />
        <img src={asset('assets/food/saucy-tenders.jpg')} alt="" loading="lazy" />
      </section>

      <section className="sec ch-dark story-p__end">
        <div className="wrap story-p__end-in">
          <h2 className="dsp dsp-md">Same wings.<br /><span className="t-cyan">More counters.</span></h2>
          <div className="story-p__acts">
            <a className="btn btn-orange btn-lg" href={ORDER_URL} target="_blank" rel="noopener noreferrer">
              Order now <ArrowRight />
            </a>
            <Link className="btn btn-line btn-lg" to="/locations">Find a shop</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
