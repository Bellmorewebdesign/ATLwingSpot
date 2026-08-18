import './WordStripe.css'

/**
 * ATL's own packaging motif: their cyan takeout box is printed with big white
 * words repeating edge to edge — WINGS TENDERS MUNCHIES. We reuse it as the
 * brand's structural divider instead of a generic marquee.
 */
export function WordStripe({ words, tone = 'cyan', speed = 34, size = 'md', separator = '' }) {
  const Track = ({ hidden }) => (
    <div className="ws__track" aria-hidden={hidden || undefined}>
      {words.map((w, i) => (
        <span className="ws__item" key={`${w}-${i}`}>
          {w}
          {separator && <b className="ws__sep">{separator}</b>}
        </span>
      ))}
    </div>
  )
  return (
    <div
      className={`ws ws--${tone} ws--${size}`}
      style={{ '--ws-speed': `${speed}s` }}
      role="presentation"
    >
      <div className="ws__viewport">
        <Track />
        <Track hidden />
      </div>
    </div>
  )
}
