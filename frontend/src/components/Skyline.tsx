// A campus-style skyline (Gothic towers, battlements, gables, a spire and
// trees) drawn in code as decoration. Not a picture of any real building.

type Hall = { x: number; w: number; h: number; roof: 'battlement' | 'gable' | 'flat' }

const GROUND = 205

const HALLS: Hall[] = [
  { x: 0, w: 120, h: 70, roof: 'gable' },
  { x: 120, w: 150, h: 95, roof: 'battlement' },
  { x: 330, w: 140, h: 80, roof: 'gable' },
  { x: 470, w: 80, h: 110, roof: 'battlement' },
  { x: 650, w: 170, h: 90, roof: 'battlement' },
  { x: 820, w: 110, h: 75, roof: 'gable' },
  { x: 990, w: 120, h: 100, roof: 'battlement' },
  { x: 1110, w: 90, h: 70, roof: 'gable' },
]

function hallPath({ x, w, h, roof }: Hall): string {
  const top = GROUND - h
  if (roof === 'gable') {
    return `M${x} ${GROUND}V${top}L${x + w / 2} ${top - 34}L${x + w} ${top}V${GROUND}Z`
  }
  if (roof === 'flat') return `M${x} ${GROUND}V${top}H${x + w}V${GROUND}Z`
  // Battlements: alternating merlons along the top.
  const merlon = 12
  let d = `M${x} ${GROUND}V${top - merlon}`
  for (let mx = x; mx < x + w; mx += merlon * 2) {
    const end = Math.min(mx + merlon, x + w)
    d += `H${end}V${top}H${Math.min(end + merlon, x + w)}V${top - merlon}`
  }
  return `${d}V${GROUND}Z`
}

// Tall tower with tiers, corner pinnacles and a spire.
function towerPath(cx: number, width: number, height: number): string {
  const half = width / 2
  const top = GROUND - height
  const tier = top - 26
  const crown = tier - 22
  return [
    `M${cx - half} ${GROUND}V${top}H${cx + half}V${GROUND}Z`,
    `M${cx - half + 6} ${top}V${tier}H${cx + half - 6}V${top}Z`,
    `M${cx - half + 14} ${tier}V${crown}H${cx + half - 14}V${tier}Z`,
    `M${cx - 8} ${crown}L${cx} ${crown - 34}L${cx + 8} ${crown}Z`,
    // corner pinnacles
    `M${cx - half} ${top}L${cx - half + 4} ${top - 18}L${cx - half + 8} ${top}Z`,
    `M${cx + half - 8} ${top}L${cx + half - 4} ${top - 18}L${cx + half} ${top}Z`,
    `M${cx - half + 6} ${tier}L${cx - half + 10} ${tier - 14}L${cx - half + 14} ${tier}Z`,
    `M${cx + half - 14} ${tier}L${cx + half - 10} ${tier - 14}L${cx + half - 6} ${tier}Z`,
  ].join('')
}

// Chapel with a slender spire.
function chapelPath(x: number): string {
  return `M${x} ${GROUND}V${GROUND - 70}L${x + 30} ${GROUND - 100}L${x + 60} ${GROUND - 70}V${GROUND}Z` +
    `M${x + 22} ${GROUND - 92}L${x + 30} ${GROUND - 175}L${x + 38} ${GROUND - 92}Z`
}

const TREES = [
  { cx: 290, r: 26 },
  { cx: 312, r: 20 },
  { cx: 955, r: 24 },
  { cx: 975, r: 18 },
]

// Arched (Gothic) windows, lit in ivory.
const WINDOWS = [
  [150, 135], [178, 135], [206, 135], [234, 135],
  [360, 150], [395, 150], [430, 150],
  [575, 120], [600, 120], [575, 160], [600, 160],
  [680, 140], [715, 140], [750, 140], [785, 140],
  [1020, 135], [1050, 135], [1080, 135],
]

export default function Skyline({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`skyline ${className}`}
      viewBox="0 -40 2400 260"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <Scene />
      {/* A mirrored copy widens the skyline so it spans wide screens. */}
      <g transform="translate(2400 0) scale(-1 1)">
        <Scene />
      </g>
    </svg>
  )
}

function Scene() {
  return (
    <>
      <g fill="currentColor">
        {HALLS.map((hall) => (
          <path key={hall.x} d={hallPath(hall)} />
        ))}
        <path d={towerPath(590, 70, 150)} />
        <path d={towerPath(500, 46, 120)} />
        <path d={chapelPath(870)} />
        {TREES.map((tree) => (
          <g key={tree.cx}>
            <circle cx={tree.cx} cy={GROUND - tree.r - 18} r={tree.r} />
            <rect x={tree.cx - 3} y={GROUND - 22} width="6" height="22" />
          </g>
        ))}
        <rect x="-1" y={GROUND} width="1202" height={220 - GROUND} />
      </g>
      <g fill="var(--ivory)" opacity="0.5">
        {WINDOWS.map(([x, y]) => (
          <path key={`${x}-${y}`} d={`M${x} ${y + 18}V${y + 5}a4 4 0 0 1 8 0V${y + 18}Z`} />
        ))}
        <circle cx="590" cy="88" r="8" />
      </g>
    </>
  )
}
