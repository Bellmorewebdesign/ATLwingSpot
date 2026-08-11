import { SOCIAL, BRAND } from '../data/site'
import { LOCATIONS } from '../data/locations'
import { Seo } from '../components/Seo'
import { Reveal } from '../components/Reveal'
import { MockupForm } from '../components/MockupForm'
import { Instagram, TikTok, ArrowUpRight } from '../components/Icons'
import { Link } from 'react-router-dom'
import './Contact.css'

const FIELDS = [
  { name: 'topic', label: 'What’s this about?', type: 'segmented', options: ['General', 'Catering', 'Franchise', 'Location question'], default: 'General', full: true, required: true },
  { name: 'name', label: 'Name', type: 'text', required: true, autoComplete: 'name' },
  { name: 'email', label: 'Email', type: 'email', required: true, autoComplete: 'email' },
  { name: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
  { name: 'location', label: 'Preferred Location', type: 'select', options: LOCATIONS.map((l) => `${l.name} — ${l.city}, ${l.state}`), placeholder: 'Choose a location' },
  { name: 'message', label: 'Message', type: 'textarea', full: true, required: true, placeholder: 'How can ATL help?' },
]

export default function Contact() {
  return (
    <div className="page contact-page">
      <Seo title="Contact" description="Talk to ATL Wing Spot — general questions, catering, franchising or a location question. Reach the team and follow @atlwingspot." />

      <div className="container contact-wrap">
        <div className="contact-intro">
          <Reveal><p className="eyebrow page-hero__eyebrow"><span className="dot" /> Contact</p></Reveal>
          <h1 className="contact-title font-display">Talk<br />to <span className="accent-o">ATL.</span></h1>
          <Reveal delay={140}>
            <p className="contact-sub">Questions, catering, franchising, or just want to say the wings changed your life — send it over.</p>
          </Reveal>

          <Reveal delay={200} className="contact-social">
            <span className="contact-social__label">Find us on</span>
            <div className="contact-social__links">
              <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer" className="contact-social__link">
                <Instagram size={20} /> <span>{BRAND.handle}</span> <ArrowUpRight size={14} />
              </a>
              <a href={SOCIAL.tiktok} target="_blank" rel="noopener noreferrer" className="contact-social__link">
                <TikTok size={20} /> <span>{BRAND.handle}</span> <ArrowUpRight size={14} />
              </a>
            </div>
            <p className="contact-quick">
              Looking for a store? <Link to="/locations" className="link-arrow">Find a location</Link>
            </p>
          </Reveal>
        </div>

        <Reveal delay={100} className="contact-card">
          <MockupForm
            fields={FIELDS}
            submitLabel="Send message"
            concept={{
              title: 'Message Sent',
              summary: 'Got it — that would’ve reached the ATL team',
              message: 'This is a preview of the proposed contact experience. Submission is disabled in this website concept.',
            }}
          />
        </Reveal>
      </div>
    </div>
  )
}
