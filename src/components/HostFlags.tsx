// Simplified SVG flag components for the 2026 World Cup host nations.
// viewBox: 0 0 120 90 (4:3). Simplified for clean rendering at tile scale.

interface FlagProps {
  width?: number;
}

// ── Canada ─────────────────────────────────────────────────────────────────────
// Red–white–red vertical bands (1:2:1) + 11-point maple leaf.

export function CanadaFlag({ width = 120 }: FlagProps) {
  const h = (width * 3) / 4;
  return (
    <svg
      width={width}
      height={h}
      viewBox="0 0 120 90"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ display: "block" }}
    >
      {/* Left red band — 25% */}
      <rect x="0" y="0" width="30" height="90" fill="#D80621" />
      {/* White field — 50% */}
      <rect x="30" y="0" width="60" height="90" fill="#FFFFFF" />
      {/* Right red band — 25% */}
      <rect x="90" y="0" width="30" height="90" fill="#D80621" />

      {/*
        Simplified 11-point maple leaf.
        Path is centred at origin; translate(60,48) places the visual
        centre in the white field. scale(1.1) fills ~40% of the band width.
      */}
      <path
        transform="translate(60,48) scale(1.1)"
        d="M 0,-15
           L 3,-9   L 8,-11  L 5.5,-6
           L 11,-2  L 7.5,2  L 9,5
           L 5,3.5  L 1,9    L -1,9
           L -5,3.5 L -9,5   L -7.5,2
           L -11,-2 L -5.5,-6
           L -8,-11 L -3,-9
           Z"
        fill="#D80621"
      />
    </svg>
  );
}

// ── United States ─────────────────────────────────────────────────────────────
// 13 alternating red/white horizontal stripes + blue canton with star field.
// Stars: 6 rows alternating 5 and 4 = 27 total (simplified from 50).

function star5(cx: number, cy: number, r: number): string {
  const inner = r * 0.42;
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : inner;
    pts.push(
      `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`
    );
  }
  return pts.join(" ");
}

const STAR_ROWS: Array<{ y: number; xs: number[] }> = [
  { y: 6,  xs: [5, 14, 23, 32, 41] },
  { y: 13, xs: [9, 18, 27, 36]     },
  { y: 20, xs: [5, 14, 23, 32, 41] },
  { y: 27, xs: [9, 18, 27, 36]     },
  { y: 34, xs: [5, 14, 23, 32, 41] },
  { y: 41, xs: [9, 18, 27, 36]     },
];

export function USAFlag({ width = 120 }: FlagProps) {
  const h = (width * 3) / 4;
  const stripeH = 90 / 13;
  // Canton covers the top 7 stripes; width is ~40% of 120
  const cantonH = 7 * stripeH; // ≈ 48.46
  const cantonW = 46;

  return (
    <svg
      width={width}
      height={h}
      viewBox="0 0 120 90"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ display: "block" }}
    >
      {/* 13 horizontal stripes — odd indices red, even white */}
      {Array.from({ length: 13 }, (_, i) => (
        <rect
          key={i}
          x="0"
          y={i * stripeH}
          width="120"
          height={stripeH + 0.3}
          fill={i % 2 === 0 ? "#BF0A30" : "#FFFFFF"}
        />
      ))}

      {/* Blue canton */}
      <rect x="0" y="0" width={cantonW} height={cantonH} fill="#002868" />

      {/* Simplified star field */}
      {STAR_ROWS.map((row, ri) =>
        row.xs.map((cx, ci) => (
          <polygon
            key={`${ri}-${ci}`}
            points={star5(cx, row.y, 2.3)}
            fill="#FFFFFF"
          />
        ))
      )}
    </svg>
  );
}

// ── Mexico ─────────────────────────────────────────────────────────────────────
// Green–white–red vertical thirds + simplified eagle emblem.
// At tile size (~78px wide) the emblem reads as the coat of arms silhouette.

export function MexicoFlag({ width = 120 }: FlagProps) {
  const h = (width * 3) / 4;
  return (
    <svg
      width={width}
      height={h}
      viewBox="0 0 120 90"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ display: "block" }}
    >
      {/* Green band */}
      <rect x="0"  y="0" width="40" height="90" fill="#006847" />
      {/* White field */}
      <rect x="40" y="0" width="40" height="90" fill="#FFFFFF" />
      {/* Red band */}
      <rect x="80" y="0" width="40" height="90" fill="#CE1126" />

      {/* Simplified coat of arms — centred at (60, 45) */}
      <g transform="translate(60,45)">
        {/* Laurel wreath suggestion — two mirrored arcs */}
        <path
          d="M -6,8 C -12,4 -13,-3 -9,-8"
          fill="none"
          stroke="#4a7c3f"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M 6,8 C 12,4 13,-3 9,-8"
          fill="none"
          stroke="#4a7c3f"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Eagle body */}
        <ellipse cx="0" cy="-1" rx="3.5" ry="5" fill="#5c3d1a" />

        {/* Eagle head */}
        <circle cx="0" cy="-7" r="2.2" fill="#5c3d1a" />

        {/* Left wing */}
        <path
          d="M -3,-0.5 C -7,1 -8.5,4.5 -6,7"
          fill="none"
          stroke="#5c3d1a"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Right wing */}
        <path
          d="M 3,-0.5 C 7,1 8.5,4.5 6,7"
          fill="none"
          stroke="#5c3d1a"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Snake in beak */}
        <path
          d="M 1.5,-5.5 C 3.5,-3.5 3.5,-1 2,1"
          fill="none"
          stroke="#2d6a1f"
          strokeWidth="1.3"
          strokeLinecap="round"
        />

        {/* Nopal cactus stem + side pads */}
        <line x1="0" y1="4"   x2="0"  y2="9"   stroke="#2d6a1f" strokeWidth="2"   strokeLinecap="round" />
        <line x1="-3" y1="6.5" x2="0" y2="5.5"  stroke="#2d6a1f" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="3"  y1="6.5" x2="0" y2="5.5"  stroke="#2d6a1f" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
