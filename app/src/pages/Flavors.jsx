import { Seo } from '../components/Seo'
import { FlavorStage } from '../components/FlavorStage'
import { SauceMeter } from '../components/SauceMeter'
import './Flavors.css'

export default function Flavors() {
  return (
    <div className="page flav">
      <Seo
        title="Flavors"
        description="25+ sauces and rubs at ATL Wing Spot, from Buttery Garlic Parmesan and Lemon Pepper to Mango Habanero and 911 Sauce. Pick your heat, wet or dry."
      />

      <FlavorStage heading="Pick your flavor." />

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
