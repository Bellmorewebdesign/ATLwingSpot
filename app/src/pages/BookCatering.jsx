import { useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { ZipLookup } from '../components/ZipLookup'
import { ArrowRight, ArrowLeft } from '../components/Icons'
import './BookCatering.css'

/**
 * Booking, on its own page.
 *
 * This used to be one block near the bottom of the catering page, which made
 * the thing people actually came to do the smallest item on the page. It gets
 * a page now: a heading, the lookup at full size, and nothing else competing
 * with it until you have an answer.
 *
 * The field takes focus on arrival. Someone who pressed "Set up catering" has
 * already said what they want, so landing with the caret in the ZIP box saves
 * them a tap. It is not an autofocus grab on a page people land on cold.
 */
export default function BookCatering() {
  const zipRef = useRef(null)

  useEffect(() => {
    // preventScroll so the page still opens at the top, heading first.
    zipRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div className="page book">
      <Seo
        title="Book catering"
        description="Find the ATL Wing Spot nearest your event and call them to book catering. Enter a ZIP code for the closest shops and their phone numbers."
      />

      {/* Heading and lookup are one block on purpose. Split across two
          sections the masthead ate the whole first screen and pushed the field,
          which is the only reason anyone opens this page, below the fold. */}
      <header className="book__mast ch-cream">
        <div className="wrap book__mast-in">
          <div className="book__intro">
            <Link className="tlink book__back" to="/catering">
              <ArrowLeft size={14} /> Catering trays
            </Link>
            <h1 className="dsp dsp-md book__h1">Book<br />catering.</h1>
            <p className="book__sub">
              Catering goes through the shop that will be cooking it. Put in the ZIP you
              are feeding and call the closest one. Tell them the headcount, the date and
              which sauces.
            </p>
          </div>

          <div className="book__find">
            <ZipLookup ref={zipRef} size="lg" heading="Where is the event?" />
          </div>
        </div>
      </header>

      <section className="sec ch-cream book__soon">
        <div className="wrap wrap-tight book__soon-in">
          <div>
            <h2 className="dsp dsp-sm book__soon-h">Ordering<br />trays online.</h2>
            <p className="book__soon-d">
              Catering trays for pickup or delivery through DoorDash. Not live yet.
            </p>
          </div>
          <button type="button" className="btn btn-soon btn-lg" disabled>
            Coming soon
          </button>
        </div>
      </section>

      <section className="sec ch-paper book__trays">
        <div className="wrap wrap-tight book__trays-in">
          <h2 className="dsp dsp-sm">Not sure<br />what to order?</h2>
          <p className="book__trays-d">
            The tray list is on the catering page, grouped by wings, boneless, tenders,
            starters and sides.
          </p>
          <Link className="btn btn-ink btn-lg" to="/catering">See the trays <ArrowRight /></Link>
        </div>
      </section>
    </div>
  )
}
