// Inline SVG icons — no icon-font dependency, theme via currentColor.

export function ArrowRight({ className = 'ar', ...p }) {
  return (
    <svg className={className} width="1em" height="1em" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function ArrowLeft({ className = 'ar', ...p }) {
  return (
    <svg className={className} width="1em" height="1em" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" {...p}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  )
}

export function ArrowUpRight({ className = 'ar', ...p }) {
  return (
    <svg className={className} width="1em" height="1em" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" {...p}>
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  )
}

export function Instagram({ size = 22, ...p }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function TikTok({ size = 22, ...p }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
      <path d="M16.5 3c.3 2.2 1.6 3.8 3.9 4.1v2.6c-1.4.1-2.7-.3-3.9-1v5.9c0 3.4-2.6 6-6 6a5.7 5.7 0 0 1-5.7-5.7c0-3.4 3-6.1 6.5-5.6v2.8c-.4-.1-.8-.2-1.2-.2-1.6 0-2.9 1.3-2.9 3 0 1.6 1.3 3 2.9 3 1.7 0 3.1-1.3 3.1-3V3h3.3Z" />
    </svg>
  )
}

export function MapPin({ size = 20, ...p }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M12 21s7-6.3 7-11a7 7 0 0 0-14 0c0 4.7 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  )
}

export function Search({ size = 20, ...p }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  )
}

export function Check({ size = 20, ...p }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="m4 12 5 5L20 6" />
    </svg>
  )
}

export function Flame({ size = 20, ...p }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
      <path d="M12 2c.5 3-1.8 4.2-2.8 5.8C8 9.5 8 11 8 11S6.5 10.4 6 9c-1 1.4-2 3-2 5.2C4 18.5 7.6 22 12 22s8-3.3 8-7.6c0-4.6-3.4-6.7-4.6-9.2C14.4 3.4 13 2.5 12 2Z" />
    </svg>
  )
}

export function Close({ size = 24, ...p }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}
