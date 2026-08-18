import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { ConceptProvider } from './components/ConceptModal'
import { ScrollToTop } from './components/ScrollToTop'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { StickyMobileBar } from './components/StickyMobileBar'
import { Seo } from './components/Seo'
import { ORDER_URL } from './data/site'
import { ArrowRight } from './components/Icons'

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
    <div className="page nf">
      <Seo title="Not found" description="That page doesn’t exist. Head back to the wings." />
      <div className="wrap-tight">
        <p className="kicker t-orange">404</p>
        <h1 className="dsp dsp-md nf__t">Nothing<br />here.</h1>
        <p className="measure-sm" style={{ marginInline: 'auto', color: 'var(--ink-mute)' }}>
          That link is broken. The wings are fine.
        </p>
        <div className="nf__actions">
          <Link to="/" className="btn btn-ink btn-lg">Back home</Link>
          <a className="btn btn-orange btn-lg" href={ORDER_URL} target="_blank" rel="noopener noreferrer">
            Order now <ArrowRight />
          </a>
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
      <a href="#main" className="skip" onClick={focusMain}>Skip to content</a>
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
