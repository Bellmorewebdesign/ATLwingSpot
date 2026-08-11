import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MENU_CATEGORIES, MENU_ITEMS } from '../data/menu'
import { ORDER_URL } from '../data/site'
import { asset } from '../lib/asset'
import { Seo } from '../components/Seo'
import { Reveal } from '../components/Reveal'
import { ArrowRight, Search as SearchIcon } from '../components/Icons'
import './Menu.css'

function OrderLink({ children = 'Order' }) {
  return (
    <a className="menu-order" href={ORDER_URL} target="_blank" rel="noopener noreferrer">
      {children} <ArrowRight />
    </a>
  )
}

function FeatureCard({ item }) {
  return (
    <article className="menu-card menu-card--feature">
      <div className="menu-card__media">
        <img src={asset(item.image)} alt={item.name} loading="lazy" decoding="async" />
        {item.badge && <span className="menu-card__badge">{item.badge}</span>}
      </div>
      <div className="menu-card__body">
        <div className="menu-card__head">
          <h3 className="menu-card__name">{item.name}</h3>
          <span className="menu-card__price">{item.price}</span>
        </div>
        <p className="menu-card__desc">{item.desc}</p>
        <OrderLink />
      </div>
    </article>
  )
}

function TextCard({ item }) {
  return (
    <article className="menu-card menu-card--text">
      <div className="menu-card__head">
        <h3 className="menu-card__name">{item.name}{item.badge && <span className="menu-card__tag">{item.badge}</span>}</h3>
        <span className="menu-card__price">{item.price}</span>
      </div>
      <p className="menu-card__desc">{item.desc}</p>
      <OrderLink />
    </article>
  )
}

function CategoryBlock({ cat, items }) {
  const features = items.filter((i) => i.image && i.feature)
  const rest = items.filter((i) => !(i.image && i.feature))
  return (
    <section className="menu-block" id={`cat-${cat.id}`}>
      <div className="divider-label">{cat.label} <span className="menu-block__count">{items.length}</span></div>
      {features.length > 0 && (
        <div className="menu-grid menu-grid--feature">
          {features.map((i) => <FeatureCard key={i.id} item={i} />)}
        </div>
      )}
      {rest.length > 0 && (
        <div className="menu-grid menu-grid--text">
          {rest.map((i) => <TextCard key={i.id} item={i} />)}
        </div>
      )}
    </section>
  )
}

export default function Menu() {
  const [params, setParams] = useSearchParams()
  const initialCat = params.get('cat') && MENU_CATEGORIES.some((c) => c.id === params.get('cat'))
    ? params.get('cat') : 'all'
  const [active, setActive] = useState(initialCat)
  const [query, setQuery] = useState('')
  const barRef = useRef(null)

  useEffect(() => {
    const next = new URLSearchParams(params)
    if (active === 'all') next.delete('cat'); else next.set('cat', active)
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const q = query.trim().toLowerCase()
  const searching = q.length > 0

  const searchResults = useMemo(() => {
    if (!searching) return []
    return MENU_ITEMS.filter(
      (i) => i.name.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q)
    )
  }, [q, searching])

  const visibleCats = active === 'all'
    ? MENU_CATEGORIES.filter((c) => c.id !== 'all')
    : MENU_CATEGORIES.filter((c) => c.id === active)

  return (
    <div className="page menu-page">
      <Seo title="Menu" description="Explore the full ATL Wing Spot menu — bone-in wings, boneless, saucy tenders, chicken n' waffles, loaded fries, shakes and more. 25+ flavors." />

      <header className="page-hero page-hero--glow container-wide">
        <Reveal><p className="eyebrow page-hero__eyebrow"><span className="dot" /> The Menu</p></Reveal>
        <Reveal delay={80}><h1 className="page-hero__title">Menu</h1></Reveal>
        <Reveal delay={140}><p className="page-hero__sub">25+ flavors. One serious appetite.</p></Reveal>
        <Reveal delay={180}><p className="page-hero__note">Menu pricing and availability may vary by location.</p></Reveal>
      </header>

      <div className="menu-controls" ref={barRef}>
        <div className="container-wide menu-controls__inner">
          <div className="menu-search">
            <SearchIcon size={18} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the menu…"
              aria-label="Search the menu"
            />
          </div>
          <div className="menu-tabs" role="tablist" aria-label="Menu categories">
            {MENU_CATEGORIES.map((c) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={active === c.id && !searching}
                className={`menu-tab ${active === c.id && !searching ? 'is-active' : ''}`}
                onClick={() => { setActive(c.id); setQuery('') }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container-wide menu-body">
        {searching ? (
          <section className="menu-block">
            <div className="divider-label">
              {searchResults.length} result{searchResults.length === 1 ? '' : 's'} for “{query}”
            </div>
            {searchResults.length > 0 ? (
              <div className="menu-grid menu-grid--text">
                {searchResults.map((i) => <TextCard key={i.id} item={i} />)}
              </div>
            ) : (
              <p className="menu-empty">No matches — try “wings”, “waffles”, or “shake”.</p>
            )}
          </section>
        ) : (
          visibleCats.map((c) => (
            <CategoryBlock key={c.id} cat={c} items={MENU_ITEMS.filter((i) => i.cat === c.id)} />
          ))
        )}
      </div>
    </div>
  )
}
