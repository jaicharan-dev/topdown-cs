import React from 'react';

/**
 * Line-art figure for "HashMap Internals: Buckets and Treeification".
 * One ink colour, no fills, no accents - same rules as the other figures.
 */

function Figure({ viewBox, children, caption }) {
  return (
    <figure className="csf-fig">
      <svg viewBox={viewBox} className="csf-fig__svg" role="img" aria-label={caption}>
        <defs>
          <marker
            id="hm-head"
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

export function HashMapStructureFigure() {
  return (
    <Figure
      viewBox="0 0 640 260"
      caption="Buckets store linked lists for small collision chains. If a bucket reaches 8 entries, Java 8 converts it to a Red-Black Tree for O(log n) search."
    >
      <text x="75" y="22" className="fig-cap" textAnchor="middle">BUCKET TABLE</text>
      <text x="370" y="22" className="fig-cap" textAnchor="middle">INTERNAL STORAGE (LINKED LIST OR RED-BLACK TREE)</text>

      {/* Bucket Array */}
      {/* Slot 0 */}
      <rect x="30" y="36" width="90" height="42" rx="3" className="fig-line" />
      <text x="75" y="62" className="fig-mono" textAnchor="middle">table[0]</text>
      <path d="M120 57 H 170" className="fig-line fig-faint" markerEnd="url(#hm-head)" />
      <text x="180" y="62" className="fig-mono fig-faint">null (empty)</text>

      {/* Slot 1: Chained Linked List */}
      <rect x="30" y="90" width="90" height="42" rx="3" className="fig-line" />
      <text x="75" y="116" className="fig-mono" textAnchor="middle">table[1]</text>
      <path d="M120 111 H 168" className="fig-line" markerEnd="url(#hm-head)" />

      {/* Node 1 */}
      <rect x="176" y="92" width="100" height="38" rx="3" className="fig-line" />
      <text x="226" y="116" className="fig-mono" textAnchor="middle">"Aa" : 1</text>
      <path d="M276 111 H 316" className="fig-line" markerEnd="url(#hm-head)" />

      {/* Node 2 */}
      <rect x="324" y="92" width="100" height="38" rx="3" className="fig-line" />
      <text x="374" y="116" className="fig-mono" textAnchor="middle">"BB" : 2</text>
      <path d="M424 111 H 460" className="fig-line fig-faint" markerEnd="url(#hm-head)" />
      <text x="470" y="116" className="fig-mono fig-faint">null</text>
      <text x="500" y="116" className="fig-t fig-faint">linked list (O(n))</text>

      {/* Slot 2 */}
      <rect x="30" y="144" width="90" height="42" rx="3" className="fig-line" />
      <text x="75" y="170" className="fig-mono" textAnchor="middle">table[2]</text>
      <path d="M120 165 H 168" className="fig-line" markerEnd="url(#hm-head)" />
      <rect x="176" y="146" width="100" height="38" rx="3" className="fig-line" />
      <text x="226" y="170" className="fig-mono" textAnchor="middle">"id" : 42</text>
      <path d="M276 165 H 316" className="fig-line fig-faint" markerEnd="url(#hm-head)" />
      <text x="326" y="170" className="fig-mono fig-faint">null</text>

      {/* Slot 3: Treeified */}
      <rect x="30" y="198" width="90" height="42" rx="3" className="fig-line" />
      <text x="75" y="224" className="fig-mono" textAnchor="middle">table[3]</text>
      <path d="M120 219 H 188" className="fig-line" markerEnd="url(#hm-head)" />

      {/* Tree representation */}
      <circle cx="210" cy="219" r="16" className="fig-line" />
      <text x="210" y="224" className="fig-mono" textAnchor="middle">K3</text>

      <path d="M222 228 L 246 242" className="fig-line" />
      <circle cx="258" cy="246" r="12" className="fig-line" />
      <text x="258" y="250" className="fig-mono" textAnchor="middle">K4</text>

      <path d="M198 228 L 174 242" className="fig-line" />
      <circle cx="162" cy="246" r="12" className="fig-line" />
      <text x="162" y="250" className="fig-mono" textAnchor="middle">K1</text>

      <text x="300" y="218" className="fig-t fig-strong">Treeified Bucket</text>
      <text x="300" y="236" className="fig-mono fig-faint">threshold &gt;= 8 entries</text>
      <text x="300" y="252" className="fig-mono fig-faint">converts to Red-Black Tree (O(log n))</text>
    </Figure>
  );
}
