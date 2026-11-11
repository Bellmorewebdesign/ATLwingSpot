// Structured data for search engines, written into the page as JSON-LD.
// "<" is escaped so nothing in the data can close the script tag early.
export function JsonLd({ data }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}
