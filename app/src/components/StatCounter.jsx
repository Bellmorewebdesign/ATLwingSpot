import { useInView } from '../hooks/useInView'
import { useCountUp } from '../hooks/useCountUp'
import './StatCounter.css'

// Animated numeric stat. `value` is the number to count to; `decimals`,
// `prefix`, `suffix` format it. Non-numeric stats can pass `text` instead.
export function StatCounter({ value, decimals = 0, prefix = '', suffix = '', text, label, sub, className = '', accent = 'orange' }) {
  const [ref, inView] = useInView({ threshold: 0.4 })
  const n = useCountUp(value ?? 0, inView && value != null)
  const display = value != null
    ? `${prefix}${n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`
    : text

  return (
    <div ref={ref} className={`stat stat--${accent} ${className}`}>
      <div className="stat__value font-display">{display}</div>
      {label && <div className="stat__label">{label}</div>}
      {sub && <div className="stat__sub">{sub}</div>}
    </div>
  )
}
