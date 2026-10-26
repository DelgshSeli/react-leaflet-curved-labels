import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { applyStoredLabels, kashida, normalizeLabel, sameLabels, serializeLabels, type CurvedLabel } from '../src/labels';
import { isAppleTouchDevice } from '../src/platform';

const latin: CurvedLabel = {
  id: 'latin',
  text: 'KURDISTAN',
  curve: { x1: 14, y1: 169, cx: 843, cy: -188, x2: 861, y2: 833 },
  fontSize: 69,
  letterSpacing: 0.5,
  startOffset: 46,
  fill: 'rgba(0,0,0,.45)',
};
const kurdish: CurvedLabel = {
  id: 'kurdish',
  text: 'کوردستان',
  curve: { x1: -381, y1: 316, cx: 1130, cy: -325, x2: 616, y2: 1216 },
  fontSize: 50,
  direction: 'rtl',
  lang: 'ckb',
  hideOnAppleTouch: true,
};

describe('stored labels', () => {
  test('serialized labels apply back unchanged', () => {
    const stored = JSON.parse(JSON.stringify(serializeLabels([latin, kurdish])));
    const restored = applyStoredLabels([latin, kurdish], stored);
    assert.ok(sameLabels(restored, [latin, kurdish]));
    assert.equal(restored[1].direction, 'rtl');
  });

  test('arrays and id-keyed objects both work; unknown ids are ignored', () => {
    const fromArray = applyStoredLabels([latin], [{ id: 'latin', fontSize: 80 }, { id: 'evil', text: 'x' }]);
    assert.equal(fromArray.length, 1);
    assert.equal(fromArray[0].fontSize, 80);
    const fromObject = applyStoredLabels([latin], { latin: { startOffset: 30 } });
    assert.equal(fromObject[0].startOffset, 30);
  });

  test('stored data can only change editable fields', () => {
    const [label] = applyStoredLabels([latin], { latin: { fill: 'red', style: { display: 'none' }, id: 'other' } });
    assert.equal(label.fill, latin.fill);
    assert.equal(label.style, undefined);
    assert.equal(label.id, 'latin');
  });

  test('broken and out-of-range values fall back or clamp', () => {
    const label = normalizeLabel(
      { text: '   ', curve: 'not a path', fontSize: 1e9, letterSpacing: 'wide', startOffset: -5 },
      latin,
    );
    assert.equal(label.text, 'KURDISTAN');
    assert.deepEqual(label.curve, latin.curve);
    assert.equal(label.fontSize, 400);
    assert.equal(label.letterSpacing, 0.5);
    assert.equal(label.startOffset, 0);
    assert.deepEqual(normalizeLabel(null, latin), latin);
    assert.equal(normalizeLabel({ text: 'x'.repeat(500) }, latin).text.length, 200);
  });

  test('curves can be stored as path strings', () => {
    assert.deepEqual(normalizeLabel({ curve: 'M 1,2 Q 3,4 5,6' }, latin).curve, { x1: 1, y1: 2, cx: 3, cy: 4, x2: 5, y2: 6 });
  });

  test('kashida stretches between parts only', () => {
    const word = kashida(['ک', 'وردس', 'ت', 'ان'], [2, 1, 3]);
    assert.equal(word, 'کــوردسـتـــان');
    assert.equal(word.replace(/ـ/g, ''), 'کوردستان');
  });
});

describe('platform', () => {
  test('iPhone and iPad (also iPadOS posing as a Mac) are detected; desktops are not', () => {
    assert.equal(isAppleTouchDevice({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' }), true);
    assert.equal(isAppleTouchDevice({ userAgent: 'Mozilla/5.0 (Macintosh)', platform: 'MacIntel', maxTouchPoints: 5 }), true);
    assert.equal(isAppleTouchDevice({ userAgent: 'Mozilla/5.0 (Macintosh)', platform: 'MacIntel', maxTouchPoints: 0 }), false);
    assert.equal(isAppleTouchDevice({ userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/130' }), false);
    assert.equal(isAppleTouchDevice(undefined), false);
  });
});
