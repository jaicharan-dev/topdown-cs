import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

const subjects = [
  {
    title: 'Object-Oriented Programming',
    tag: 'OOP',
    description: '53 questions — Pillars, design patterns, code tracing, and SOLID principles.',
    href: '/docs/oop/1-four-pillars-of-oop',
    emoji: '🧱',
    accentColor: '#60a5fa',
    comingSoon: false,
  },
  {
    title: 'Database Management Systems',
    tag: 'DBMS',
    description: 'SQL queries, normalization, transactions, indexing, and schema design.',
    href: '#',
    emoji: '🗄️',
    accentColor: '#a78bfa',
    comingSoon: true,
  },
  {
    title: 'Operating Systems',
    tag: 'OS',
    description: 'Processes, threads, scheduling, memory management, and deadlocks.',
    href: '#',
    emoji: '⚙️',
    accentColor: '#f59e0b',
    comingSoon: true,
  },
  {
    title: 'Computer Networks',
    tag: 'CN',
    description: 'OSI model, TCP/UDP, HTTP, DNS, subnetting, and the TLS handshake.',
    href: '#',
    emoji: '🌐',
    accentColor: '#34d399',
    comingSoon: true,
  },
];

function SubjectCard({title, tag, description, href, emoji, accentColor, comingSoon}) {
  return (
    <Link 
      to={href} 
      className="csf-card" 
      style={{
        '--card-accent': accentColor, 
        ...(comingSoon ? { opacity: 0.85 } : {})
      }}
      title={comingSoon ? "Coming Soon" : undefined}
      onClick={(e) => comingSoon && e.preventDefault()}
    >
      <div className="csf-card__icon" style={comingSoon ? { filter: 'grayscale(0.8)' } : {}}>{emoji}</div>
      <div className="csf-card__body">
        <span className="csf-card__tag">
          {tag} {comingSoon && <span style={{ opacity: 0.7, fontWeight: 'normal', textTransform: 'none' }}>— Coming Soon</span>}
        </span>
        <h3 className="csf-card__title">{title}</h3>
        <p className="csf-card__desc">{description}</p>
      </div>
      <div className="csf-card__cta">
        <span className="csf-card__cta-text">{comingSoon ? "Coming Soon" : "Start Learning"}</span>
        {!comingSoon && <span className="csf-card__cta-arrow">→</span>}
      </div>
    </Link>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Home"
      description="A structured, roadmap-driven platform for CS Fundamentals and Interview Prep.">

      {/* Hero */}
      <section className="csf-hero">
        <div className="csf-hero__glow" aria-hidden="true" />
        <h1 className="csf-hero__title">
          Master <span className="csf-hero__accent">CS Fundamentals</span>
        </h1>
        <p className="csf-hero__subtitle">
          Select a core subject below to begin preparing for your engineering interviews.
        </p>
      </section>

      {/* Subject Grid */}
      <main className="csf-grid-wrapper">
        <div className="csf-grid">
          {subjects.map((subject) => (
            <SubjectCard key={subject.tag} {...subject} />
          ))}
        </div>
      </main>
    </Layout>
  );
}
