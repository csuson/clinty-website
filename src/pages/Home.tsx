import Hero from '../components/Hero'
import AdCampaigns from '../components/AdCampaigns'
import Features from '../components/Features'
import Integrations from '../components/Integrations'
import ROICalculator from '../components/ROICalculator'
import HowItWorks from '../components/HowItWorks'
import Stats from '../components/Stats'
import Pricing from '../components/Pricing'
import CTA from '../components/CTA'

export default function Home() {
  return (
    <>
      <Hero />
      <AdCampaigns />
      <Features />
      <Integrations />
      <ROICalculator />
      <HowItWorks />
      <Stats />
      <Pricing />
      <CTA />
    </>
  )
}
