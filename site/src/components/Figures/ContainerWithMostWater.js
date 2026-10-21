import React from 'react';

/**
 * Line-art figures for "11. Container With Most Water".
 * One ink colour, no fills, no accents - same rules as the other figures.
 */

function Figure({ viewBox, children, caption }) {
  return (
    <figure className="csf-fig">
      <svg viewBox={viewBox} className="csf-fig__svg" role="img" aria-label={caption}>
        {children}
      </svg>
      {caption && <figcaption className="csf-fig__caption">{caption}</figcaption>}
    </figure>
  );
}

/* The example input, with the winning pair picked out ---------------------- */

// height = [1, 8, 6, 2, 5, 4, 8, 3, 7] drawn to scale: 18px per unit, floor at
// y=190. The two walls that win are at index 1 and index 8.
const BARS = [1, 8, 6, 2, 5, 4, 8, 3, 7].map((h, i) => ({
  h,
  x: 40 + i * 52,
  top: 190 - h * 18,
  chosen: i === 1 || i === 8,
}));

export function BestContainerFigure() {
  const left = BARS[1];
  const right = BARS[8];
  const level = right.top; // water stops at the shorter of the two walls

  return (
    <Figure
      viewBox="0 0 640 240"
      caption="The best container here is the wall of height 8 and the wall of height 7, seven apart. Water stops at the shorter of the two, so it holds 7 x 7 = 49. The walls in between are irrelevant; only the two you pick matter."
    >
      {/* Floor */}
      <path d="M20 190 H 476" className="fig-line fig-faint" />

      {/* Water, bounded by the two chosen walls and the shorter wall's height */}
      <rect
        x={left.x}
        y={level}
        width={right.x - left.x}
        height={190 - level}
        className="fig-line fig-dashed"
      />

      {/* Walls, with their heights above them */}
      {BARS.map((bar) => (
        <g key={bar.x}>
          <rect
            x={bar.x - 5}
            y={bar.top}
            width="10"
            height={190 - bar.top}
            className={`fig-line ${bar.chosen ? '' : 'fig-faint'}`}
          />
          <text
            x={bar.x}
            y={bar.top - 8}
            textAnchor="middle"
            className={`fig-mono ${bar.chosen ? 'fig-strong' : 'fig-faint'}`}
          >
            {bar.h}
          </text>
        </g>
      ))}

      {/* Where the water level comes from */}
      <path d={`M${right.x} ${level} H 498`} className="fig-line fig-dashed" />
      <text x="504" y={level - 2} className="fig-strong">level = 7</text>
      <text x="504" y={level + 15} className="fig-faint">the shorter wall</text>

      {/* Width, measured between the two chosen walls */}
      <path
        d={`M${left.x} 206 V 218 M${left.x} 212 H ${right.x} M${right.x} 206 V 218`}
        className="fig-line"
      />
      <text x={(left.x + right.x) / 2} y="234" textAnchor="middle" className="fig-strong">
        width = 7
      </text>
    </Figure>
  );
}

/* Why only one of the two moves is worth making -------------------------- */

// Both panels start from the same pair: a wall of 3 on the left, a wall of 8 on
// the right, water held at 3. The only difference is which wall steps inward.
function Panel({ xLeft, xRight, title, verdict, arrowFrom, arrowTo }) {
  const floor = 160;
  const shortTop = floor - 3 * 15;
  const tallTop = floor - 8 * 15;
  const mid = (xLeft + xRight) / 2;
  const headDir = arrowTo > arrowFrom ? -1 : 1;

  return (
    <g>
      <text x={mid} y="26" textAnchor="middle" className="fig-cap">{title}</text>

      <path d={`M${xLeft - 40} ${floor} H ${xRight + 30}`} className="fig-line fig-faint" />

      <rect
        x={xLeft}
        y={shortTop}
        width={xRight - xLeft}
        height={floor - shortTop}
        className="fig-line fig-dashed"
      />

      <rect x={xLeft - 5} y={shortTop} width="10" height={floor - shortTop} className="fig-line" />
      <text x={xLeft} y={shortTop - 8} textAnchor="middle" className="fig-mono">3</text>

      <rect x={xRight - 5} y={tallTop} width="10" height={floor - tallTop} className="fig-line" />
      <text x={xRight} y={tallTop - 8} textAnchor="middle" className="fig-mono">8</text>

      {/* The move */}
      <path d={`M${arrowFrom} 88 H ${arrowTo}`} className="fig-line" />
      <path
        d={`M${arrowTo + headDir * 8} 83 L${arrowTo} 88 L${arrowTo + headDir * 8} 93`}
        className="fig-head"
      />
      <text x={(arrowFrom + arrowTo) / 2} y="78" textAnchor="middle" className="fig-cap">
        STEPS IN
      </text>

      <text x={mid} y="184" textAnchor="middle" className="fig-strong">{verdict}</text>
    </g>
  );
}

export function WhichWallFigure() {
  return (
    <Figure
      viewBox="0 0 640 200"
      caption="Either move costs you width. Only moving the shorter wall lets the water level rise, so only that move can ever beat what you already have."
    >
      <Panel
        xLeft={80}
        xRight={270}
        title="MOVE THE TALLER WALL"
        verdict="always worse"
        arrowFrom={262}
        arrowTo={200}
      />

      <path d="M320 24 V 170" className="fig-line fig-faint" />

      <Panel
        xLeft={390}
        xRight={580}
        title="MOVE THE SHORTER WALL"
        verdict="can get better"
        arrowFrom={398}
        arrowTo={460}
      />
    </Figure>
  );
}
