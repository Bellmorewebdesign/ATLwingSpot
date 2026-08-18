import { useInView } from '../hooks/useInView'

// Single entrance primitive. `clip` switches to the mask reveal used on
// headline lines. Used sparingly — not on every element.
export function Reveal({ as: Tag = 'div', delay = 0, clip = false, className = '', style, children, ...rest }) {
  const [ref, inView] = useInView()
  return (
    <Tag
      ref={ref}
      className={`${clip ? 'rv-clip' : 'rv'} ${inView ? 'in' : ''} ${className}`}
      style={{ '--d': `${delay}ms`, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
