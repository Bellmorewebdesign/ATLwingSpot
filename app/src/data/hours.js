// Turns the short hours strings in data/locations.js into the day-by-day form
// search engines read (schema.org OpeningHoursSpecification).
//
//   'Daily 11am–1am'
//   'Sun–Thu 10:30am–midnight · Fri–Sat 10:30am–1am'
//
// It understands exactly those shapes and throws on anything else, so a typo
// in a shop's hours fails the build instead of publishing wrong hours to
// Google. A closing time earlier than the opening time means "after
// midnight", which is how the spec expects late hours to be written.

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SHORT = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }

function time(text) {
  const t = text.trim().toLowerCase()
  if (t === 'midnight') return '00:00'
  if (t === 'noon') return '12:00'
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/)
  if (!m) throw new Error(`hours: cannot read the time "${text}"`)
  let h = Number(m[1])
  const min = m[2] || '00'
  if (h < 1 || h > 12 || Number(min) > 59) throw new Error(`hours: impossible time "${text}"`)
  if (m[3] === 'am') h = h === 12 ? 0 : h
  else h = h === 12 ? 12 : h + 12
  return `${String(h).padStart(2, '0')}:${min}`
}

function days(text) {
  const t = text.trim().toLowerCase()
  if (t === 'daily') return [...DAYS]
  const parts = t.split('–')
  if (parts.length === 1 && parts[0] in SHORT) return [DAYS[SHORT[parts[0]]]]
  if (parts.length === 2 && parts[0] in SHORT && parts[1] in SHORT) {
    const out = []
    for (let d = SHORT[parts[0]]; ; d = (d + 1) % 7) {
      out.push(DAYS[d])
      if (d === SHORT[parts[1]]) break
    }
    return out
  }
  throw new Error(`hours: cannot read the days "${text}"`)
}

/**
 * @returns {{days: string[], opens: string, closes: string}[]} one entry per
 *   group in the string; [] for a shop with no hours.
 */
export function parseHours(hours) {
  if (!hours) return []
  const groups = hours.split('·').map((g) => {
    const m = g.trim().match(/^(\S+)\s+(\S+)–(\S+)$/)
    if (!m) throw new Error(`hours: cannot read "${g.trim()}" in "${hours}"`)
    return { days: days(m[1]), opens: time(m[2]), closes: time(m[3]) }
  })
  const seen = groups.flatMap((g) => g.days)
  if (new Set(seen).size !== seen.length) throw new Error(`hours: a day appears twice in "${hours}"`)
  return groups
}
