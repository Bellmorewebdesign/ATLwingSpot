import { Seo } from '../components/Seo'
import { PAGES } from '../data/routes'
import { FlavorStage } from '../components/FlavorStage'
import { SauceMeter } from '../components/SauceMeter'
import './Flavors.css'

export default function Flavors() {
  return (
    <div className="page flav">
      <Seo page={PAGES.flavors} />

      {/* the page's main heading */}
      <FlavorStage heading="Pick your flavor." as="h1" />

      {/* The client's full heat chart, hottest to mildest */}
      <SauceMeter />

      <section className="sec-sm ch-cream">
        <div className="wrap">
          <p className="fineprint flav__fine">
            Sauces rotate and vary by shop. Ask what&rsquo;s on the board today.
          </p>
        </div>
      </section>
    </div>
  )
}
