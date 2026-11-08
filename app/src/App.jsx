import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { FormNoticeProvider } from './components/FormNotice'
import { ScrollToTop } from './components/ScrollToTop'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { StickyMobileBar } from './components/StickyMobileBar'
import { Seo } from './components/Seo'
import { ORDER_URL, ORDER_LABEL } from './data/site'
import { ArrowRight } from './components/Icons'
import { PAGES } from './data/routes'

import Home from './pages/Home'
import Menu from './pages/Menu'
import Flavors from './pages/Flavors'
import Locations from './pages/Locations'
import Catering from './pages/Catering'
import BookCatering from './pages/BookCatering'
import Story from './pages/Story'
import Franchise from './pages/Franchise'
import Contact from './pages/Contact'

function NotFound() {
  return (
    <div className="page nf">
      <Seo title="Page not found" description="That page doesn’t exist. Head back to the wings." />
      <div className="wrap-tight">
        <p className="kicker nf__kick">404</p>
        <h1 className="dsp dsp-md nf__t">Nothing<br />here.</h1>
        <p className="measure-sm" style={{ marginInline: 'auto', color: 'var(--ink-mute)' }}>
          That link is broken. The wings are fine.
        </p>
        <div className="nf__actions">
          <Link to={PAGES.home.path} className="btn btn-ink btn-lg">Back home</Link>
          <a className="btn btn-orange btn-lg" href={ORDER_URL} target="_blank" rel="noopener noreferrer">
            {ORDER_LABEL} <ArrowRight />
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
    <FormNoticeProvider>
      <a href="#main" className="skip" onClick={focusMain}>Skip to content</a>
      <ScrollToTop />
      <Header />
      <main id="main" tabIndex={-1} key={pathname}>
        <Routes>
          <Route path={PAGES.home.path} element={<Home />} />
          <Route path={PAGES.menu.path} element={<Menu />} />
          <Route path={PAGES.flavors.path} element={<Flavors />} />
          <Route path={PAGES.locations.path} element={<Locations />} />
          <Route path={PAGES.catering.path} element={<Catering />} />
          <Route path={PAGES.bookCatering.path} element={<BookCatering />} />
          <Route path={PAGES.story.path} element={<Story />} />
          <Route path={PAGES.franchise.path} element={<Franchise />} />
          <Route path={PAGES.contact.path} element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <StickyMobileBar />
    </FormNoticeProvider>
  )
}
