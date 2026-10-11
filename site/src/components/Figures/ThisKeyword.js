import React from 'react';

/**
 * Line-art figure for "The this Keyword".
 * Architectural monochrome line art: one ink colour, no color fills, zero collisions.
 */

function Figure({ id = 'tk', viewBox, children, caption }) {
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

export function FluentChainFigure() {
  return (
    <Figure
      id="tk-chain"
      viewBox="0 0 660 236"
      caption="Each method returns this (the current instance), so every call in the chain executes within and mutates the exact same object in heap memory."
    >
      <defs>
        <marker
          id="tk-chain-head"
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

      {/* 1. Method Chaining Call Pipeline Header */}
      <text x="330" y="18" className="fig-cap" textAnchor="middle">FLUENT METHOD CHAIN (CALL PIPELINE)</text>

      {/* Step 1: Initial Builder (x: 20 to 140, width: 120) */}
      <rect x="20" y="28" width="120" height="42" rx="6" className="fig-line" />
      <text x="80" y="54" className="fig-mono fig-strong" textAnchor="middle">builder</text>

      {/* Chain 1 (x: 140 to 220, length: 80px) */}
      <path d="M140 49 H 220" className="fig-line" markerEnd="url(#tk-chain-head)" />
      <text x="180" y="40" className="fig-cap" textAnchor="middle">CALL</text>

      {/* Step 2: setName (x: 220 to 390, width: 170) */}
      <rect x="220" y="28" width="170" height="42" rx="6" className="fig-line" />
      <text x="305" y="54" className="fig-mono fig-strong" textAnchor="middle">.setName("Alice")</text>

      {/* Chain 2 (x: 390 to 490, length: 100px - wide channel preventing any text-box overlap) */}
      <path d="M390 49 H 490" className="fig-line" markerEnd="url(#tk-chain-head)" />
      <text x="440" y="40" className="fig-cap" textAnchor="middle" style={{ fontSize: '8.5px', letterSpacing: '0.08em' }}>RETURNS this</text>

      {/* Step 3: setAge (x: 490 to 640, width: 150) */}
      <rect x="490" y="28" width="150" height="42" rx="6" className="fig-line" />
      <text x="565" y="54" className="fig-mono fig-strong" textAnchor="middle">.setAge(28)</text>

      {/* 2. Downward connecting paths into heap memory */}
      <path d="M80 70 V 102" className="fig-line fig-dashed" markerEnd="url(#tk-chain-head)" />
      <path d="M305 70 V 102" className="fig-line fig-dashed" markerEnd="url(#tk-chain-head)" />
      <path d="M565 70 V 102" className="fig-line fig-dashed" markerEnd="url(#tk-chain-head)" />

      {/* 3. Shared Heap Object Container (x: 20 to 640, width: 620) */}
      <rect x="20" y="104" width="620" height="88" rx="6" className="fig-line" />
      <text x="330" y="122" className="fig-cap" textAnchor="middle">
        HEAP MEMORY: Single UserBuilder Instance @ 0x4A10
      </text>
      <path d="M20 132 H 640" className="fig-line fig-faint" />

      {/* Compartment dividers */}
      <path d="M210 132 V 192" className="fig-line fig-faint fig-dashed" />
      <path d="M430 132 V 192" className="fig-line fig-faint fig-dashed" />

      {/* Compartment 1 State */}
      <text x="115" y="152" className="fig-cap" textAnchor="middle">INITIAL STATE</text>
      <text x="115" y="174" className="fig-mono" textAnchor="middle">name=null, age=0</text>

      {/* Compartment 2 State */}
      <text x="320" y="152" className="fig-cap" textAnchor="middle">MUTATION 1</text>
      <text x="320" y="174" className="fig-mono fig-strong" textAnchor="middle">name="Alice", age=0</text>

      {/* Compartment 3 State */}
      <text x="535" y="152" className="fig-cap" textAnchor="middle">MUTATION 2</text>
      <text x="535" y="174" className="fig-mono fig-strong" textAnchor="middle">name="Alice", age=28</text>

      {/* 4. Bottom Summary Note */}
      <text x="330" y="222" className="fig-cap" textAnchor="middle">
        ONE SINGLE OBJECT IN MEMORY: EVERY CALL OPERATES ON THE EXACT SAME INSTANCE VIA "this"
      </text>
    </Figure>
  );
}
