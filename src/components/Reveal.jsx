import { useInView } from '../hooks/useInView'

// Declarative entrance wrapper. `delay` staggers siblings; `clip` switches
// to the mask-reveal used for headline lines.
export function Reveal({ as: Tag = 'div', delay = 0, clip = false, className = '', children, ...rest }) {
  const [ref, inView] = useInView()
  const base = clip ? 'reveal-clip' : 'reveal'
  return (
    <Tag
      ref={ref}
      className={`${base} ${inView ? 'is-in' : ''} ${className}`}
      style={{ '--reveal-delay': `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
