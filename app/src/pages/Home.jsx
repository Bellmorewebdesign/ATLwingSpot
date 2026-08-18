import { Seo } from '../components/Seo'
import { Hero } from '../components/Hero'
import { WordStripe } from '../components/WordStripe'
import { CraveTrack } from '../components/CraveTrack'
import { FlavorStage } from '../components/FlavorStage'
import { CrewCalc } from '../components/CrewCalc'
import { StoryScale } from '../components/StoryScale'
import { LocationsBand } from '../components/LocationsBand'
import { CateringBand } from '../components/CateringBand'
import { FranchiseStrip } from '../components/FranchiseStrip'
import { SocialBand } from '../components/SocialBand'
import { FinalCTA } from '../components/FinalCTA'
import { BOX_WORDS, TICKER } from '../data/site'

export default function Home() {
  return (
    <>
      <Seo
        title="Stay Saucy"
        suffix={false}
        description="Fresh, never frozen wings fried to order in 25+ sauces. 100% halal. Voted best wings on Long Island. Order pickup or delivery across NY, NJ and CA."
      />

      {/* cream */}
      <Hero />
      {/* cyan — ATL's own packaging pattern */}
      <WordStripe words={BOX_WORDS} tone="cyan" size="md" />
      {/* dark, horizontal */}
      <CraveTrack />
      {/* reactive colour */}
      <FlavorStage />
      {/* orange */}
      <CrewCalc />
      {/* white, split — location step sits early in the ordering path */}
      <LocationsBand />
      {/* dark, right-led */}
      <StoryScale />
      {/* full-bleed photography, right-aligned */}
      <CateringBand />
      {/* cyan slim */}
      <FranchiseStrip />
      {/* cream, overlapping */}
      <SocialBand />
      <WordStripe words={TICKER} tone="ink" size="sm" separator="·" speed={44} />
      {/* cyan takeover */}
      <FinalCTA />
    </>
  )
}
