import React from 'react';

/**
 * Line-art figures for "The Four Pillars of OOP".
 *
 * Refined architectural line art: one ink colour, no color fills, no accents.
 * Ultra-spacious layout with stretched connectors, isolated text channels,
 * and zero line collisions or text overlaps.
 */

function Figure({ id = 'fp', viewBox, children, caption }) {
  const markerId = `${id}-head`;
  return (
    <figure className="csf-fig">
      <svg viewBox={viewBox} className="csf-fig__svg" role="img" aria-label={caption}>
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M1 1.5 L8 5 L1 8.5" className="fig-head" />
          </marker>
        </defs>
        {children}
      </svg>
      {caption && <figcaption className="csf-fig__caption">{caption}</figcaption>}
    </figure>
  );
}

function Lock({ x, y }) {
  return (
    <g className="fig-line">
      <path d={`M${x + 3} ${y} v-4 a4 4 0 0 1 8 0 v4`} />
      <rect x={x} y={y} width="14" height="11" rx="2" />
    </g>
  );
}

/* 1. Abstraction ------------------------------------------------------- */

export function AbstractionFigure() {
  const steps = [
    '1. verify available funds',
    '2. evaluate fraud heuristics',
    '3. post ledger adjustment',
    '4. trigger physical dispense',
  ];

  return (
    <Figure
      id="fp-abs"
      viewBox="0 0 660 220"
      caption="You press one button. Everything behind the interface boundary stays completely encapsulated."
    >
      <defs>
        <marker
          id="fp-head-abs"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M1 1.5 L8 5 L1 8.5" className="fig-head" />
        </marker>
      </defs>

      {/* Column Titles */}
      <text x="115" y="20" className="fig-cap" textAnchor="middle">WHAT YOU SEE (INTERFACE)</text>
      <text x="485" y="20" className="fig-cap" textAnchor="middle">WHAT YOU DO NOT SEE (IMPLEMENTATION)</text>

      {/* The Client ATM Panel (x: 20 to 210, width: 190) */}
      <rect x="20" y="32" width="190" height="166" rx="6" className="fig-line" />
      <text x="115" y="52" className="fig-cap" textAnchor="middle">ATM PANEL</text>
      <path d="M20 60 H 210" className="fig-line fig-faint" />

      {/* Button 1: Withdraw (Active selection) */}
      <rect x="35" y="70" width="160" height="34" rx="5" className="fig-line fig-strong" />
      <circle cx="50" cy="87" r="3" className="fig-line fig-strong" />
      <text x="118" y="92" className="fig-mono fig-strong" textAnchor="middle">Withdraw</text>

      {/* Button 2: Deposit (Inactive) */}
      <rect x="35" y="112" width="160" height="34" rx="5" className="fig-line fig-faint" />
      <text x="115" y="134" className="fig-mono fig-faint" textAnchor="middle">Deposit</text>

      {/* Button 3: Balance (Inactive) */}
      <rect x="35" y="154" width="160" height="34" rx="5" className="fig-line fig-faint" />
      <text x="115" y="176" className="fig-mono fig-faint" textAnchor="middle">Balance</text>

      {/* Connector line: starts precisely on panel outer wall at x=210, reaches x=298 */}
      <path d="M210 87 H 298" className="fig-line" markerEnd="url(#fp-head-abs)" />
      {/* Centered CALL label with 30px+ clearance on both sides */}
      <text x="254" y="77" className="fig-cap" textAnchor="middle">CALL</text>

      {/* Abstraction Boundary: dashed divider line at x=310 */}
      <path d="M310 28 V 198" className="fig-line fig-dashed" />

      {/* Hidden Execution Pipeline on the right */}
      <path d="M345 62 V 176" className="fig-line fig-faint" />
      {steps.map((label, i) => {
        const y = 62 + i * 38;
        return (
          <g key={label}>
            <circle cx="345" cy={y} r="4" className="fig-line" />
            <path d={`M349 ${y} H 365`} className="fig-line fig-faint" />
            <rect x="365" y={y - 14} width="265" height="28" rx="4" className="fig-line fig-faint" />
            <text x="380" y={y + 4} className="fig-mono fig-faint">
              {label}
            </text>
          </g>
        );
      })}
    </Figure>
  );
}

/* 2. Encapsulation ----------------------------------------------------- */

export function EncapsulationFigure() {
  return (
    <Figure
      id="fp-enc"
      viewBox="0 0 660 220"
      caption="The object guards its own data. Internal state can only be accessed or mutated through verified public methods."
    >
      <defs>
        <marker
          id="fp-head-enc"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M1 1.5 L8 5 L1 8.5" className="fig-head" />
        </marker>
      </defs>

      {/* Title */}
      <text x="357" y="18" className="fig-cap" textAnchor="middle">SAVINGSACCOUNT CAPSULE</text>

      {/* External Caller 1: deposit(100) (x: 18 to 134, width: 116) */}
      <rect x="18" y="52" width="116" height="38" rx="6" className="fig-line" />
      <text x="76" y="76" className="fig-mono" textAnchor="middle">deposit(100)</text>

      {/* Stretched 121px channel (x: 134 to 255) with CALL label centered with 45px+ clearance */}
      <path d="M134 71 H 255" className="fig-line" markerEnd="url(#fp-head-enc)" />
      <text x="194" y="62" className="fig-cap" textAnchor="middle">CALL</text>

      {/* Main Class Capsule (x: 255 to 460, width: 205) */}
      <rect x="255" y="26" width="205" height="174" rx="8" className="fig-line" />
      <text x="357" y="46" className="fig-t fig-strong" textAnchor="middle">SavingsAccount</text>
      <path d="M255 54 H 460" className="fig-line fig-faint" />

      {/* Public Entry Method Inside Capsule */}
      <rect x="267" y="64" width="180" height="34" rx="5" className="fig-line" />
      <text x="357" y="86" className="fig-mono" textAnchor="middle">public deposit(amount)</text>

      {/* Internal flow from public method down into private vault */}
      <path d="M357 98 V 118" className="fig-line fig-faint" markerEnd="url(#fp-head-enc)" />

      {/* Private State Vault */}
      <rect x="267" y="118" width="180" height="66" rx="6" className="fig-line" />
      <Lock x={278} y={130} />
      <text x="300" y="141" className="fig-cap">PRIVATE STATE</text>
      <text x="357" y="166" className="fig-mono fig-strong" textAnchor="middle">balance = 500</text>

      {/* External Caller 2: Illegal Direct Field Access (x: 18 to 134, width: 116) */}
      <rect x="18" y="132" width="116" height="38" rx="6" className="fig-line" />
      <text x="76" y="156" className="fig-mono" textAnchor="middle">balance = -999</text>
      <text x="76" y="186" className="fig-t fig-faint" textAnchor="middle">Direct access denied</text>

      {/* Direct tampering arrow (x: 134 to 208, length: 74px) */}
      <path d="M134 151 H 208" className="fig-line" />
      {/* BLOCKED label centered at x=171 with 16px+ clear air gap from caller box edge at x=134 */}
      <text x="171" y="142" className="fig-cap" textAnchor="middle" style={{ fontSize: '8.5px', letterSpacing: '0.08em' }}>BLOCKED</text>

      {/* Barrier 'X' badge situated safely at x=218 to 230 (25px clear gap before capsule wall at x=255) */}
      <g className="fig-line fig-x">
        <path d="M218 145 l12 12 M230 145 l-12 12" />
      </g>

      {/* Stretched 85px channel (x: 460 to 545) with READ label centered above line */}
      <path d="M460 151 H 545" className="fig-line" markerEnd="url(#fp-head-enc)" />
      <text x="502" y="142" className="fig-cap" textAnchor="middle">READ</text>

      {/* Right: Public getter call getBalance() (x: 545 to 650, width: 105) */}
      <rect x="545" y="132" width="105" height="38" rx="6" className="fig-line" />
      <text x="597" y="156" className="fig-mono" textAnchor="middle">getBalance()</text>
    </Figure>
  );
}

/* 3. Inheritance ------------------------------------------------------- */

export function InheritanceFigure() {
  const kids = [
    {
      x: 25,
      name: 'SavingsAccount',
      rule: 'min: 0',
      pillX: 195,
      rulePillX: 150,
      center: 150,
    },
    {
      x: 385,
      name: 'CurrentAccount',
      rule: 'min: -500',
      pillX: 555,
      rulePillX: 510,
      center: 510,
    },
  ];

  return (
    <Figure
      id="fp-inh"
      viewBox="0 0 660 292"
      caption="The child classes automatically inherit balance and getBalance(). Only withdraw() is overridden to enforce specialized rules."
    >
      {/* Base Parent Class (x: 220 to 440, width: 220) */}
      <rect x="220" y="20" width="220" height="86" rx="6" className="fig-line" />
      <text x="300" y="44" className="fig-t fig-strong" textAnchor="middle">Account</text>
      {/* Dedicated BASE micro-pill with 35px clearance from title */}
      <rect x="365" y="31" width="55" height="18" rx="3" className="fig-line fig-faint" />
      <text x="392" y="43" className="fig-cap" textAnchor="middle">BASE</text>

      <path d="M220 54 H 440" className="fig-line" />
      <text x="240" y="74" className="fig-mono">balance</text>
      <text x="240" y="94" className="fig-mono">getBalance()</text>

      {/* UML Generalization: Tip touches base of Account directly at (330, 106) */}
      <path d="M330 106 l-8 14 h16 z" className="fig-line fig-tri" />
      <path d="M330 120 V 140" className="fig-line" />
      <path d="M150 140 H 510" className="fig-line" />
      <path d="M150 140 V 162" className="fig-line" />
      <path d="M510 140 V 162" className="fig-line" />

      {/* Subclasses (Width: 250px each, wide 110px central gap) */}
      {kids.map((k) => (
        <g key={k.name}>
          <rect x={k.x} y="162" width="250" height="116" rx="6" className="fig-line" />

          {/* Left-aligned title with 50px+ clearance to SUBCLASS micro-pill */}
          <text x={k.x + 18} y="185" className="fig-t fig-strong">
            {k.name}
          </text>
          <rect x={k.pillX} y="172" width="68" height="18" rx="3" className="fig-line fig-faint" />
          <text x={k.pillX + 34} y="184" className="fig-cap" textAnchor="middle">SUBCLASS</text>

          <path d={`M${k.x} 196 H ${k.x + 250}`} className="fig-line" />

          {/* Inherited rows */}
          <text x={k.x + 18} y="218" className="fig-mono fig-faint">balance</text>
          <text x={k.x + 18} y="238" className="fig-mono fig-faint">getBalance()</text>

          {/* Overridden row with 33px clearance before rule pill */}
          <text x={k.x + 18} y="260" className="fig-mono fig-strong">withdraw()</text>
          <rect x={k.rulePillX} y="246" width="112" height="22" rx="4" className="fig-line fig-faint" />
          <text x={k.rulePillX + 56} y="261" className="fig-mono fig-faint" textAnchor="middle">
            {k.rule}
          </text>
        </g>
      ))}
    </Figure>
  );
}

/* 4. Polymorphism ------------------------------------------------------ */

export function PolymorphismFigure() {
  return (
    <Figure
      id="fp-poly"
      viewBox="0 0 660 220"
      caption="The caller writes one uniform line. The runtime dispatches dynamically to whichever method body belongs to the actual instance."
    >
      <defs>
        <marker
          id="fp-head-poly"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M1 1.5 L8 5 L1 8.5" className="fig-head" />
        </marker>
      </defs>

      {/* Top Title */}
      <text x="330" y="18" className="fig-cap" textAnchor="middle">DYNAMIC METHOD DISPATCH</text>

      {/* Polymorphic Call Site (x: 20 to 200, width: 180) */}
      <rect x="20" y="68" width="180" height="76" rx="6" className="fig-line" />
      <text x="110" y="88" className="fig-cap" textAnchor="middle">POLYMORPHIC CALL</text>
      <path d="M20 96 H 200" className="fig-line fig-faint" />
      <text x="110" y="117" className="fig-mono fig-strong" textAnchor="middle">
        acc.withdraw(100)
      </text>
      <text x="110" y="133" className="fig-mono fig-faint" textAnchor="middle">
        declared as Account
      </text>

      {/* Stretched 175px channel from x=200 to x=375 */}
      {/* 1. Straight horizontal trunk (x: 200 to 265) with DISPATCH centered safely above it */}
      <path d="M200 106 H 265" className="fig-line" />
      <text x="232" y="96" className="fig-cap" textAnchor="middle">DISPATCH</text>

      {/* 2. Curved dispatch fork branching into target cards at x=375 */}
      <path d="M265 106 C 315 106, 325 56, 365 56" className="fig-line" markerEnd="url(#fp-head-poly)" />
      <path d="M265 106 C 315 106, 325 156, 365 156" className="fig-line" markerEnd="url(#fp-head-poly)" />

      {/* Target 1: SavingsAccount (x: 375 to 640, width: 265) */}
      <rect x="375" y="26" width="265" height="60" rx="6" className="fig-line" />
      <text x="393" y="50" className="fig-mono fig-strong">SavingsAccount</text>
      <text x="393" y="70" className="fig-mono fig-faint">balance = 50</text>

      {/* Refused outcome badge (10px clean gap between X icon and text) */}
      <rect x="515" y="40" width="112" height="32" rx="4" className="fig-line fig-faint" />
      <g className="fig-line fig-x">
        <path d="M526 50 l12 12 M538 50 l-12 12" />
      </g>
      <text x="548" y="61" className="fig-mono fig-faint">Refused</text>

      {/* Target 2: CurrentAccount (x: 375 to 640, width: 265) */}
      <rect x="375" y="126" width="265" height="60" rx="6" className="fig-line" />
      <text x="393" y="150" className="fig-mono fig-strong">CurrentAccount</text>
      <text x="393" y="170" className="fig-mono fig-faint">balance = 50</text>

      {/* Approved outcome badge (10px clean gap between checkmark and text) */}
      <rect x="515" y="140" width="112" height="32" rx="4" className="fig-line fig-faint" />
      <path d="M526 156 l4 5 l8 -10" className="fig-line fig-check" />
      <text x="548" y="161" className="fig-mono fig-strong">Approved</text>
    </Figure>
  );
}
