import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MENU_CATEGORIES, MENU_ITEMS } from '../data/menu'
import { ORDER_URL } from '../data/site'
import { asset } from '../lib/asset'
import { Seo } from '../components/Seo'
import { ArrowRight, Search } from '../components/Icons'
import './Menu.css'

const CATS = MENU_CATEGORIES.filter((c) => c.id !== 'all')

/**
 * Every listing in the official pack ships with its own photograph, so the menu
 * is one consistent grid of cards rather than the old split of a few photo
 * features above a list of text-only rows.
 *
 * Name, description, photo, category. No price — intentionally, everywhere.
 */
function Card({ item }) {
  return (
    <li className="mcard">
      <div className="mcard__img">
        <img
          src={asset(item.image)}
          alt={item.name}
          width={item.w}
          height={item.h}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="mcard__body">
        <h3 className="mcard__name">{item.name}</h3>
        <p className="mcard__desc">{item.desc}</p>
        <a className="mcard__order" href={ORDER_URL} target="_blank" rel="noopener noreferrer">
          Order <ArrowRight />
        </a>
      </div>
    </li>
  )
}

function Grid({ items }) {
  return (
    <ul className="mcat__grid">
      {items.map((i) => <Card key={i.id} item={i} />)}
    </ul>
  )
}

function Section({ cat, items }) {
  if (!items.length) return null
  return (
    <section className="mcat" id={`cat-${cat.id}`}>
      <h2 className="dsp mcat__h">{cat.label}</h2>
      <Grid items={items} />
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
        description="The full ATL Wing Spot menu — bone-in wings, boneless, saucy tenders, chicken n' waffles, quesadillas, loaded fries, shakes and more."
      />

      <header className="mast wrap menu__mast">
        <h1 className="dsp dsp-lg">Menu</h1>
        <p className="menu__sub">Everything is fried once you order it, then tossed in whichever sauce or rub you pick.</p>
        <p className="fineprint menu__fine">Availability varies by location.</p>
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
                <Grid items={found} />
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
