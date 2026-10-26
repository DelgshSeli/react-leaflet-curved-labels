import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  curveAngle,
  curveAround,
  curveBend,
  curveLength,
  curveMidpoint,
  curvePath,
  moveCurve,
  normalizeCurve,
  parseCurvePath,
  pointAlongCurve,
  withCurveAngle,
  withCurveBend,
  withCurveLength,
  type LabelCurve,
} from '../src/geometry';

const base: LabelCurve = { x1: 14, y1: 169, cx: 843, cy: -188, x2: 861, y2: 833 };
const near = (a: number, b: number, tolerance: number) => Math.abs(a - b) <= tolerance;

describe('curves', () => {
  test('path data round-trips', () => {
    assert.deepEqual(parseCurvePath(curvePath(base)), base);
    assert.deepEqual(parseCurvePath('M -1.5,2 Q 3,4 5,6'), { x1: -1.5, y1: 2, cx: 3, cy: 4, x2: 5, y2: 6 });
    assert.equal(parseCurvePath('M 1,2 L 3,4'), null);
    assert.equal(parseCurvePath(42), null);
  });

  test('angle, bend and length can be set and read back', () => {
    for (const angle of [-90, -20, 0, 35, 170]) assert.ok(near(curveAngle(withCurveAngle(base, angle)), angle, 1), `angle ${angle}`);
    for (const bend of [-60, 0, 25, 80]) assert.ok(near(curveBend(withCurveBend(base, bend)), bend, 1), `bend ${bend}`);
    for (const length of [300, 900, 2400]) assert.ok(near(curveLength(withCurveLength(base, length)), length, 2), `length ${length}`);
  });

  test('turning and resizing keep the text where it is', () => {
    const mid = curveMidpoint(base);
    for (const next of [withCurveAngle(base, -20), withCurveLength(base, 1500)]) {
      const after = curveMidpoint(next);
      assert.ok(Math.hypot(after.x - mid.x, after.y - mid.y) < 2);
    }
  });

  test('changing one value leaves the others alone', () => {
    const bent = withCurveBend(base, 10);
    assert.ok(near(curveAngle(bent), curveAngle(base), 1));
    assert.equal(curveLength(bent), curveLength(base));
    assert.ok(near(curveBend(withCurveAngle(base, 0)), curveBend(base), 1));
    assert.ok(near(curveBend(withCurveLength(base, 2000)), curveBend(base), 1));
  });

  test('moving shifts every point by the same amount', () => {
    assert.deepEqual(moveCurve(base, 25, -10), { x1: 39, y1: 159, cx: 868, cy: -198, x2: 886, y2: 823 });
  });

  test('points are rounded and kept in range', () => {
    assert.deepEqual(normalizeCurve({ x1: 1.4, y1: 1.6, cx: 99999, cy: -99999, x2: 0, y2: 0 }), { x1: 1, y1: 2, cx: 5000, cy: -5000, x2: 0, y2: 0 });
  });

  test('the point along the curve runs from start to end by length', () => {
    assert.deepEqual(pointAlongCurve(base, 0), { x: base.x1, y: base.y1 });
    const end = pointAlongCurve(base, 100);
    assert.ok(near(end.x, base.x2, 0.01) && near(end.y, base.y2, 0.01));
    const straight: LabelCurve = { x1: 0, y1: 0, cx: 50, cy: 0, x2: 100, y2: 0 };
    assert.ok(near(pointAlongCurve(straight, 30).x, 30, 0.01));
  });

  test('a starting curve can be built around a point', () => {
    const c = curveAround({ x: 500, y: 250 }, 600, 15, 20);
    assert.ok(near(curveAngle(c), 15, 1));
    assert.ok(near(curveBend(c), 20, 1));
    assert.ok(near(curveLength(c), 600, 2));
  });
});
