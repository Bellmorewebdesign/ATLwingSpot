import { Link } from 'react-router-dom'
import { asset } from '../lib/asset'

export function Logo({ className = '', onClick }) {
  return (
    <Link to="/" className={`logo ${className}`} aria-label="ATL Wing Spot — home" onClick={onClick}>
      <img
        src={asset('assets/brand/atl-wing-spot-logo.png')}
        alt="ATL Wing Spot"
        width="150"
        height="66"
        decoding="async"
      />
    </Link>
  )
}
