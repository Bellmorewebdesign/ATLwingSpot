import { Link } from 'react-router-dom'
import { SOCIAL, BRAND } from '../data/site'
import { LOCATIONS } from '../data/locations'
import { Seo } from '../components/Seo'
import { MockupForm } from '../components/MockupForm'
import { Instagram, TikTok, ArrowUpRight } from '../components/Icons'
import './Contact.css'

const FIELDS = [
  {
    name: 'topic', label: 'What’s it about', type: 'segmented', full: true, required: true,
    options: ['General', 'Catering', 'Franchise', 'A location'], default: 'General',
  },
  { name: 'name', label: 'Name', type: 'text', required: true, autoComplete: 'name' },
  { name: 'email', label: 'Email', type: 'email', required: true, autoComplete: 'email' },
  { name: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
  {
    name: 'location', label: 'Which shop', type: 'select',
    options: LOCATIONS.map((l) => `${l.name} — ${l.city}, ${l.state}`),
    placeholder: 'Pick a location',
  },
  { name: 'message', label: 'Message', type: 'textarea', full: true, required: true },
]

export default function Contact() {
  return (
    <div className="page contact ch-cream">
      <Seo
        title="Contact"
        description="Get in touch with ATL Wing Spot about an order, catering, franchising or one of our shops."
      />

      <div className="wrap contact__grid">
        <div className="contact__side">
          <h1 className="dsp dsp-md contact__h1">Say<br />something.</h1>
          <p className="contact__sub">
            Orders, catering, franchising, or the wings were good and you want us to know.
          </p>

          <div className="contact__links">
            <a className="contact__link" href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer">
              <Instagram size={19} /> <span>Instagram</span> <ArrowUpRight size={13} />
            </a>
            <a className="contact__link" href={SOCIAL.tiktok} target="_blank" rel="noopener noreferrer">
              <TikTok size={19} /> <span>TikTok</span> <ArrowUpRight size={13} />
            </a>
          </div>
          <p className="contact__handle">{BRAND.handle}</p>
          <p className="contact__alt">
            Looking for a shop? <Link to="/locations" className="tlink">All locations</Link>
          </p>
        </div>

        <div className="contact__card">
          <MockupForm
            fields={FIELDS}
            submitLabel="Send"
            concept={{
              title: 'Message sent',
              summary: 'That would have reached the team',
              message:
                'This is a preview of the proposed contact form. Submission is switched off in this website concept.',
            }}
          />
        </div>
      </div>
    </div>
  )
}
