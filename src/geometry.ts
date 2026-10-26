/**
 * Quadratic curves in the label overlay's viewBox units.
 *
 * A curve runs from (x1, y1) through the control point (cx, cy) to (x2, y2). The studio edits
 * curves through three derived values (angle, bend, length) instead of raw points, because the
 * end and control points of a long, gentle arc usually lie far outside the visible map.
 */

export interface LabelCurve {
  x1: number;
  y1: number;
  cx: number;
  cy: number;
  x2: number;
  y2: number;
}

export interface Point {
  x: number;
  y: number;
}

export const GEOMETRY_LIMITS = {
  coord: [-5000, 5000],
  angle: [-180, 180],
  bend: [-150, 150],
  length: [50, 5000],
} as const;

export function clamp(value: number, [lo, hi]: readonly [number, number]): number {
  return Math.min(hi, Math.max(lo, value));
}

/** Rounds every point to a whole unit and keeps it inside GEOMETRY_LIMITS.coord. */
export function normalizeCurve(c: LabelCurve): LabelCurve {
  const p = (v: number) => clamp(Math.round(v), GEOMETRY_LIMITS.coord);
  return { x1: p(c.x1), y1: p(c.y1), cx: p(c.cx), cy: p(c.cy), x2: p(c.x2), y2: p(c.y2) };
}

/** The SVG path data for a curve: `M x1,y1 Q cx,cy x2,y2`. */
export function curvePath(c: LabelCurve): string {
  return `M ${c.x1},${c.y1} Q ${c.cx},${c.cy} ${c.x2},${c.y2}`;
}

/** Parses `M x,y Q x,y x,y` back into a curve, or returns null. */
export function parseCurvePath(d: unknown): LabelCurve | null {
  if (typeof d !== 'string') return null;
  const n = '(-?\\d+(?:\\.\\d+)?)';
  const m = d.trim().match(new RegExp(`^M\\s*${n}\\s*,\\s*${n}\\s+Q\\s*${n}\\s*,\\s*${n}\\s+${n}\\s*,\\s*${n}$`));
  if (!m) return null;
  const [x1, y1, cx, cy, x2, y2] = m.slice(1).map(Number);
  return { x1, y1, cx, cy, x2, y2 };
}

/** A straight-ish starting curve centred on a point. */
export function curveAround(centre: Point, length = 600, angle = 0, bend = 0): LabelCurve {
  const flat: LabelCurve = {
    x1: centre.x - length / 2,
    y1: centre.y,
    cx: centre.x,
    cy: centre.y,
    x2: centre.x + length / 2,
    y2: centre.y,
  };
  return withCurveBend(withCurveAngle(normalizeCurve(flat), angle), bend);
}

function chord(c: LabelCurve) {
  const dx = c.x2 - c.x1;
  const dy = c.y2 - c.y1;
  const length = Math.hypot(dx, dy) || 1;
  return { dx, dy, length, mx: (c.x1 + c.x2) / 2, my: (c.y1 + c.y2) / 2, nx: -dy / length, ny: dx / length };
}

/** The point halfway along the curve parameter (t = 0.5). Rotating and resizing keep it fixed. */
export function curveMidpoint(c: LabelCurve): Point {
  return { x: (c.x1 + 2 * c.cx + c.x2) / 4, y: (c.y1 + 2 * c.cy + c.y2) / 4 };
}

export function moveCurve(c: LabelCurve, dx: number, dy: number): LabelCurve {
  return normalizeCurve({ x1: c.x1 + dx, y1: c.y1 + dy, cx: c.cx + dx, cy: c.cy + dy, x2: c.x2 + dx, y2: c.y2 + dy });
}

/** Direction of the line from start to end, in degrees (0 = left to right, positive = downhill). */
export function curveAngle(c: LabelCurve): number {
  const { dx, dy } = chord(c);
  return Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
}

/** How far the curve bows away from its straight line, in % of that line's length. */
export function curveBend(c: LabelCurve): number {
  const { length, mx, my, nx, ny } = chord(c);
  return Math.round((((c.cx - mx) * nx + (c.cy - my) * ny) / length) * 100);
}

/** Straight-line distance from start to end. */
export function curveLength(c: LabelCurve): number {
  return Math.round(chord(c).length);
}

function transformPoints(c: LabelCurve, f: (x: number, y: number) => [number, number]): LabelCurve {
  const [x1, y1] = f(c.x1, c.y1);
  const [cx, cy] = f(c.cx, c.cy);
  const [x2, y2] = f(c.x2, c.y2);
  return normalizeCurve({ x1, y1, cx, cy, x2, y2 });
}

/** Rotates the whole curve about its midpoint, so the text turns in place. */
export function withCurveAngle(c: LabelCurve, degrees: number): LabelCurve {
  const target = clamp(degrees, GEOMETRY_LIMITS.angle);
  const delta = ((target - (Math.atan2(c.y2 - c.y1, c.x2 - c.x1) * 180) / Math.PI) * Math.PI) / 180;
  const { x, y } = curveMidpoint(c);
  const cos = Math.cos(delta);
  const sin = Math.sin(delta);
  return transformPoints(c, (px, py) => [x + (px - x) * cos - (py - y) * sin, y + (px - x) * sin + (py - y) * cos]);
}

/** Moves the control point across the line only, keeping any lean along it. */
export function withCurveBend(c: LabelCurve, percent: number): LabelCurve {
  const target = clamp(percent, GEOMETRY_LIMITS.bend);
  const { length, mx, my, nx, ny } = chord(c);
  const current = ((c.cx - mx) * nx + (c.cy - my) * ny) / length;
  const shift = (target / 100 - current) * length;
  return normalizeCurve({ ...c, cx: c.cx + nx * shift, cy: c.cy + ny * shift });
}

/** Stretches or shrinks the curve about its midpoint; a longer curve flattens the text's arc. */
export function withCurveLength(c: LabelCurve, length: number): LabelCurve {
  const target = clamp(length, GEOMETRY_LIMITS.length);
  const scale = target / chord(c).length;
  const { x, y } = curveMidpoint(c);
  return transformPoints(c, (px, py) => [x + (px - x) * scale, y + (py - y) * scale]);
}

function pointAt(c: LabelCurve, t: number): Point {
  const u = 1 - t;
  return { x: u * u * c.x1 + 2 * u * t * c.cx + t * t * c.x2, y: u * u * c.y1 + 2 * u * t * c.cy + t * t * c.y2 };
}

/**
 * The point a given share (0-100) of the way along the curve, measured by length. This is where
 * an SVG textPath with that `startOffset` and `text-anchor="middle"` centres its text.
 */
export function pointAlongCurve(c: LabelCurve, percent: number): Point {
  const steps = 96;
  const points = Array.from({ length: steps + 1 }, (_, i) => pointAt(c, i / steps));
  const lengths = [0];
  for (let i = 1; i <= steps; i += 1) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  const wanted = (clamp(percent, [0, 100]) / 100) * lengths[steps];
  const i = Math.max(1, lengths.findIndex((l) => l >= wanted));
  const span = lengths[i] - lengths[i - 1] || 1;
  const f = (wanted - lengths[i - 1]) / span;
  return {
    x: points[i - 1].x + (points[i].x - points[i - 1].x) * f,
    y: points[i - 1].y + (points[i].y - points[i - 1].y) * f,
  };
}
