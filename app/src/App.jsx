import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { ConceptProvider } from './components/ConceptModal'
import { ScrollToTop } from './components/ScrollToTop'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { StickyMobileBar } from './components/StickyMobileBar'
import { Seo } from './components/Seo'
import { OrderButton } from './components/OrderButton'

import Home from './pages/Home'
import Menu from './pages/Menu'
import Flavors from './pages/Flavors'
import Locations from './pages/Locations'
import Catering from './pages/Catering'
import Story from './pages/Story'
import Franchise from './pages/Franchise'
import Contact from './pages/Contact'

function NotFound() {
  return (
    <div className="page notfound">
      <Seo title="Not Found" description="This page took a wrong turn. Head back to the wings." />
      <div className="container notfound__inner">
        <p className="eyebrow"><span className="dot" /> 404</p>
        <h1 className="notfound__title font-display">This page<br />flew the <span className="accent-o">coop.</span></h1>
        <p className="notfound__sub">The link’s broken, but the wings aren’t. Let’s get you back.</p>
        <div className="notfound__actions">
          <Link to="/" className="btn btn--cream btn--lg">Back home</Link>
          <OrderButton size="lg" variant="orange">Order now</OrderButton>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const { pathname } = useLocation()

  const focusMain = (e) => {
    e.preventDefault()
    const main = document.getElementById('main')
    if (main) { main.focus(); main.scrollIntoView() }
  }

  return (
    <ConceptProvider>
      <a href="#main" className="skip-link" onClick={focusMain}>Skip to content</a>
      <ScrollToTop />
      <Header />
      <main id="main" tabIndex={-1} key={pathname}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/flavors" element={<Flavors />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="/catering" element={<Catering />} />
          <Route path="/story" element={<Story />} />
          <Route path="/franchise" element={<Franchise />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <StickyMobileBar />
    </ConceptProvider>
  )
}
