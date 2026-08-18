import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MENU_CATEGORIES, MENU_ITEMS } from '../data/menu'
import { ORDER_URL } from '../data/site'
import { asset } from '../lib/asset'
import { Seo } from '../components/Seo'
import { ArrowRight, Search } from '../components/Icons'
import './Menu.css'

const CATS = MENU_CATEGORIES.filter((c) => c.id !== 'all')

function OrderLink({ label = 'Order' }) {
  return (
    <a className="mi__order" href={ORDER_URL} target="_blank" rel="noopener noreferrer">
      {label} <ArrowRight />
    </a>
  )
}

/* Items with photography get scale; everything else reads as a real menu
   list rather than another rounded card. */
function Feature({ item }) {
  return (
    <article className="feat">
      <div className="feat__img">
        <img src={asset(item.image)} alt={item.name} loading="lazy" decoding="async" />
        {item.badge && <span className="feat__badge">{item.badge}</span>}
      </div>
      <div className="feat__body">
        <h3 className="dsp feat__name">{item.name}</h3>
        <p className="feat__desc">{item.desc}</p>
        <div className="feat__foot">
          <span className="feat__price">{item.price}</span>
          <OrderLink />
        </div>
      </div>
    </article>
  )
}

function Row({ item }) {
  return (
    <li className="mi">
      <div className="mi__l">
        <h3 className="mi__name">
          {item.name}
          {item.badge && <span className="mi__tag">{item.badge}</span>}
        </h3>
        <p className="mi__desc">{item.desc}</p>
      </div>
      <div className="mi__r">
        <span className="mi__price">{item.price}</span>
        <OrderLink />
      </div>
    </li>
  )
}

function Section({ cat, items }) {
  const feats = items.filter((i) => i.image && i.feature)
  const rows = items.filter((i) => !(i.image && i.feature))
  return (
    <section className="mcat" id={`cat-${cat.id}`}>
      <h2 className="dsp mcat__h">{cat.label}</h2>
      {feats.length > 0 && (
        <div className="mcat__feats">
          {feats.map((i) => <Feature key={i.id} item={i} />)}
        </div>
      )}
      {rows.length > 0 && <ul className="mcat__rows">{rows.map((i) => <Row key={i.id} item={i} />)}</ul>}
    </section>
  )
}

export default function Menu() {
  const [params, setParams] = useSearchParams()
  const initial = params.get('cat')
  const [active, setActive] = useState(
    initial && CATS.some((c) => c.id === initial) ? initial : 'all'
  )
  const [q, setQ] = useState('')

  useEffect(() => {
    const next = new URLSearchParams(params)
    if (active === 'all') next.delete('cat')
    else next.set('cat', active)
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const term = q.trim().toLowerCase()
  const searching = term.length > 0

  const found = useMemo(
    () =>
      searching
        ? MENU_ITEMS.filter(
            (i) => i.name.toLowerCase().includes(term) || i.desc.toLowerCase().includes(term)
          )
        : [],
    [term, searching]
  )

  const shown = active === 'all' ? CATS : CATS.filter((c) => c.id === active)

  return (
    <div className="page menu ch-cream">
      <Seo
        title="Menu"
        description="The full ATL Wing Spot menu — bone-in wings, boneless, saucy tenders, chicken n' waffles, loaded fries, shakes and more, in 25+ sauces."
      />

      <header className="mast wrap menu__mast">
        <h1 className="dsp dsp-lg">Menu</h1>
        <p className="menu__sub">Fried to order. Sauced to order. 25+ sauces and rubs to pick from.</p>
        <p className="fineprint menu__fine">Prices and availability vary by location.</p>
      </header>

      <div className="menu__body wrap">
        {/* Desktop: sticky rail. Mobile: horizontal tab strip. */}
        <aside className="mrail">
          <div className="mrail__search">
            <Search size={17} />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search the menu"
              aria-label="Search the menu"
            />
          </div>
          <nav className="mrail__cats" aria-label="Menu categories">
            <button
              className={`mrail__cat ${active === 'all' && !searching ? 'on' : ''}`}
              onClick={() => { setActive('all'); setQ('') }}
            >
              Everything
            </button>
            {CATS.map((c) => (
              <button
                key={c.id}
                className={`mrail__cat ${active === c.id && !searching ? 'on' : ''}`}
                onClick={() => { setActive(c.id); setQ('') }}
              >
                {c.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="menu__content">
          {searching ? (
            <section className="mcat">
              <h2 className="dsp mcat__h">
                {found.length} {found.length === 1 ? 'match' : 'matches'}
              </h2>
              {found.length > 0 ? (
                <ul className="mcat__rows">{found.map((i) => <Row key={i.id} item={i} />)}</ul>
              ) : (
                <p className="menu__empty">Nothing by that name. Try “wings”, “waffles” or “shake”.</p>
              )}
            </section>
          ) : (
            shown.map((c) => (
              <Section key={c.id} cat={c} items={MENU_ITEMS.filter((i) => i.cat === c.id)} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
