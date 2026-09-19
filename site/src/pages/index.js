import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import React from 'react';

// --- Custom 2D Line-Art SVGs ---

const IconOOP = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Minimalist Isometric Cube representing an "Object" */}
    <polygon points="12 3 4 7.5 12 12 20 7.5 12 3" />
    <polyline points="4 7.5 4 16.5 12 21 12 12" />
    <polyline points="20 7.5 20 16.5 12 21" />
  </svg>
);

const IconDBMS = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
  </svg>
);

const IconOS = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
    <rect x="9" y="9" width="6" height="6" />
    <line x1="9" y1="1" x2="9" y2="4" />
    <line x1="15" y1="1" x2="15" y2="4" />
    <line x1="9" y1="20" x2="9" y2="23" />
    <line x1="15" y1="20" x2="15" y2="23" />
    <line x1="20" y1="9" x2="23" y2="9" />
    <line x1="20" y1="14" x2="23" y2="14" />
    <line x1="1" y1="9" x2="4" y2="9" />
    <line x1="1" y1="14" x2="4" y2="14" />
  </svg>
);

const IconCN = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="3" />
    <circle cx="5" cy="18" r="3" />
    <circle cx="19" cy="18" r="3" />
    <line x1="10.5" y1="7.5" x2="6.5" y2="15.5" />
    <line x1="13.5" y1="7.5" x2="17.5" y2="15.5" />
    <line x1="8" y1="18" x2="16" y2="18" />
  </svg>
);

const IconCodeTracing = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
    <circle cx="12" cy="12" r="2.5" />
    <line x1="13.5" y1="13.5" x2="15.5" y2="15.5" />
  </svg>
);

const IconDesignPatterns = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Architectural Layers */}
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 12 12 17 22 12" />
    <polyline points="2 17 12 22 22 17" />
  </svg>
);

const IconDBDesign = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Table 1 */}
    <rect x="3" y="4" width="6" height="16" rx="1" />
    <line x1="3" y1="9" x2="9" y2="9" />
    <line x1="3" y1="14" x2="9" y2="14" />
    {/* Table 2 */}
    <rect x="15" y="4" width="6" height="16" rx="1" />
    <line x1="15" y1="9" x2="21" y2="9" />
    <line x1="15" y1="14" x2="21" y2="14" />
    {/* Crow's foot relationship (One-to-Many) */}
    <path d="M9 14h6" />
    <polyline points="12 11 15 14 12 17" />
  </svg>
);

const IconSystemDesign = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9" />
    <path d="M12 18v-5" />
    <path d="M12 15h6v3" />
    <path d="M12 15H6v3" />
    <rect x="3" y="18" width="6" height="4" rx="1" />
    <rect x="15" y="18" width="6" height="4" rx="1" />
  </svg>
);


const theorySubjects = [
  { title: 'OOP', href: '/docs/oop/1-four-pillars-of-oop', Icon: IconOOP, accentColor: '#60a5fa', comingSoon: false },
  { title: 'DBMS', href: '#', Icon: IconDBMS, accentColor: '#a78bfa', comingSoon: true },
  { title: 'OS', href: '#', Icon: IconOS, accentColor: '#f59e0b', comingSoon: true },
  { title: 'CN', href: '#', Icon: IconCN, accentColor: '#34d399', comingSoon: true },
];

const practicalSubjects = [
  { title: 'Code Tracing', href: '/docs/code-tracing/1-code-trace-static-instance-constructor', Icon: IconCodeTracing, accentColor: '#fb7185', comingSoon: false },
  { title: 'Design Patterns', href: '/docs/design-patterns/1-singleton-pattern', Icon: IconDesignPatterns, accentColor: '#38bdf8', comingSoon: false },
  { title: 'DB Design', href: '#', Icon: IconDBDesign, accentColor: '#c084fc', comingSoon: true },
  { title: 'System Design', href: '#', Icon: IconSystemDesign, accentColor: '#4ade80', comingSoon: true },
];

function CompactCard({title, href, Icon, accentColor, comingSoon}) {
  return (
    <Link 
      to={href} 
      className={`csf-compact-card ${comingSoon ? 'csf-compact-card--soon' : ''}`}
      style={{ '--card-accent': accentColor }}
      title={comingSoon ? "Coming Soon" : title}
      onClick={(e) => comingSoon && e.preventDefault()}
    >
      <div className="csf-compact-card__glow" aria-hidden="true" />
      <div className="csf-compact-card__icon">
        <Icon />
      </div>
      <div className="csf-compact-card__title">{title}</div>
      {comingSoon && <span className="csf-compact-card__badge">Soon</span>}
    </Link>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Interview-Ready CS Fundamentals"
      description="Interview-ready CS fundamentals. Not a textbook. Just the answers any interviewer would want to hear."
      wrapperClassName="homepage">

      {/* Hero */}
      <section className="csf-hero">
        <div className="csf-hero__glow" aria-hidden="true" />
        <h1 className="csf-hero__title">
          Top<span className="csf-hero__accent">Down</span> CS
        </h1>
        <p className="csf-hero__subtitle">
          Not a textbook. Not a course.<br />
          Just the answers any interviewer would want to hear.
        </p>
      </section>

      {/* Subject Grid */}
      <main className="csf-grid-wrapper">
        <p className="csf-section-label">Theory</p>
        <div className="csf-compact-grid">
          {theorySubjects.map((subject) => (
            <CompactCard key={subject.title} {...subject} />
          ))}
        </div>

        <div className="csf-section-divider" />

        <p className="csf-section-label">Practical</p>
        <div className="csf-compact-grid">
          {practicalSubjects.map((subject) => (
            <CompactCard key={subject.title} {...subject} />
          ))}
        </div>
      </main>
    </Layout>
  );
}
