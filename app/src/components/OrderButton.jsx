import { ORDER_URL } from '../data/site'
import { ArrowRight } from './Icons'

// The single ordering entry point. Every real "order" action routes here,
// opening ATL's platform in a new tab.
export function OrderButton({ children = 'Order Now', className = '', variant = 'orange', size = '', showArrow = true, ...rest }) {
  const sizeClass = size === 'lg' ? 'btn--lg' : size === 'sm' ? 'btn--sm' : ''
  return (
    <a
      href={ORDER_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`btn btn--${variant} ${sizeClass} ${className}`}
      {...rest}
    >
      {children}
      {showArrow && <ArrowRight />}
    </a>
  )
}
