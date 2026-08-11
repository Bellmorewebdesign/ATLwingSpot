import { Seo } from '../components/Seo'
import { Hero } from '../components/Hero'
import { BrandTicker } from '../components/BrandTicker'
import { MenuShowcase } from '../components/MenuShowcase'
import { ViralSection } from '../components/ViralSection'
import { FlavorFinder } from '../components/FlavorFinder'
import { WingCalculator } from '../components/WingCalculator'
import { FoodInterlude } from '../components/FoodInterlude'
import { StoryTimeline } from '../components/StoryTimeline'
import { LocationsPreview } from '../components/LocationsPreview'
import { CateringTeaser } from '../components/CateringTeaser'
import { FranchiseTeaser } from '../components/FranchiseTeaser'
import { SocialSection } from '../components/SocialSection'
import { FinalCTA } from '../components/FinalCTA'

export default function Home() {
  return (
    <>
      <Seo
        title="Stay Saucy"
        suffix={false}
        description="ATL Wing Spot — fresh, never frozen wings in 25+ flavors. 100% Halal. Voted Best Wings on Long Island. Pickup + delivery across NY, NJ & CA."
      />
      <Hero />
      <BrandTicker />
      <MenuShowcase />
      <ViralSection />
      <FlavorFinder index="03" />
      <WingCalculator index="04" />
      <FoodInterlude />
      <StoryTimeline index="06" />
      <LocationsPreview index="07" />
      <CateringTeaser index="08" />
      <FranchiseTeaser index="09" />
      <SocialSection index="10" />
      <FinalCTA />
    </>
  )
}
