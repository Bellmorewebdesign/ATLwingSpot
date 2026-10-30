import { Seo } from '../components/Seo'
import { Hero } from '../components/Hero'
import { GroupBand } from '../components/GroupBand'
import { WordStripe } from '../components/WordStripe'
import { CraveTrack } from '../components/CraveTrack'
import { SpreadBand } from '../components/SpreadBand'
import { SauceZoom } from '../components/SauceZoom'
import { FlavorStage } from '../components/FlavorStage'
import { CrewCalc } from '../components/CrewCalc'
import { StoryScale } from '../components/StoryScale'
import { LocationsBand } from '../components/LocationsBand'
import { CateringBand } from '../components/CateringBand'
import { FranchiseStrip } from '../components/FranchiseStrip'
import { SocialBand } from '../components/SocialBand'
import { FinalCTA } from '../components/FinalCTA'
import { BOX_WORDS, BOX_STRIPE_TONE, TICKER } from '../data/site'

export default function Home() {
  return (
    <>
      <Seo
        description="Fresh, never frozen wings fried to order in 25+ sauces. 100% halal. Voted best wings on Long Island. Order pickup or delivery across NY, NJ and CA."
      />

      {/* cream */}
      <Hero />

      {/* The client's order, top to bottom: two menu sections, find a location,
          the wing calculator, franchising, then the menu spread. */}

      {/* menu 1 — warm cream, the step down out of the hero, on the group shot */}
      <GroupBand />
      {/* our own packaging pattern; colour set by BOX_STRIPE_TONE */}
      <WordStripe words={BOX_WORDS} tone={BOX_STRIPE_TONE} size="md" />
      {/* menu 2 — dark, horizontal category track */}
      <CraveTrack />
      {/* white, split */}
      <LocationsBand />
      {/* orange: the wing calculator */}
      <CrewCalc />
      {/* cyan slim */}
      <FranchiseStrip />
      {/* menu — white, official studio photography, backgrounds blend in */}
      <SpreadBand />

      {/* Not in the client's list, so kept after it in their original order. */}

      {/* signature scroll moment: fall through the slogan into the sauce */}
      <SauceZoom />
      {/* reactive colour */}
      <FlavorStage />
      {/* dark, right-led */}
      <StoryScale />
      {/* full-bleed photography, right-aligned */}
      <CateringBand />
      {/* cream, overlapping */}
      <SocialBand />
      <WordStripe words={TICKER} tone="ink" size="sm" separator="·" speed={44} />
      {/* cyan takeover */}
      <FinalCTA />
    </>
  )
}
