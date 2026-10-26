import type { CSSProperties } from 'react';
import { clamp, normalizeCurve, parseCurvePath, type LabelCurve } from './geometry';

export interface CurvedLabel {
  /** Stable, unique id. Also used to build the SVG path id, so keep it simple. */
  id: string;
  text: string;
  curve: LabelCurve;
  /** In viewBox units. */
  fontSize: number;
  /** In em. Default 0. */
  letterSpacing?: number;
  /** Where the middle of the text sits along the curve, 0-100. Default 50. */
  startOffset?: number;
  fontFamily?: string;
  fontWeight?: number | string;
  /** Text colour. Default a translucent dark grey. */
  fill?: string;
  /** Extra styles for the SVG text element (text-shadow, transitions, ...). */
  style?: CSSProperties;
  className?: string;
  /** For right-to-left scripts. Sets the text element's `direction`. */
  direction?: 'ltr' | 'rtl';
  /** BCP 47 language tag, for correct shaping (for example "ckb" or "ar"). */
  lang?: string;
  /** SVG 2 textPath `side`. Only Firefox supports it today. */
  side?: 'left' | 'right';
  /**
   * Do not draw this label on iPhone and iPad. WebKit lays out some right-to-left text in the
   * wrong order along a curved path, so hiding it can be better than showing it mirrored.
   */
  hideOnAppleTouch?: boolean;
}

/** The part of a label the studio edits. */
export type EditableField = 'text' | 'fontSize' | 'letterSpacing' | 'startOffset' | 'curve';

export const LABEL_LIMITS = {
  fontSize: [4, 400],
  letterSpacing: [-0.2, 2],
  startOffset: [0, 100],
  textLength: 200,
} as const;

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readNumber(raw: unknown, fallback: number, limits: readonly [number, number], step: number): number {
  const value = num(raw);
  return value === null ? fallback : clamp(Math.round(value / step) * step, limits);
}

function readCurve(raw: unknown, fallback: LabelCurve): LabelCurve {
  if (typeof raw === 'string') return normalizeCurve(parseCurvePath(raw) ?? fallback);
  if (!raw || typeof raw !== 'object') return fallback;
  const r = raw as Record<string, unknown>;
  const pick = (key: keyof LabelCurve) => num(r[key]) ?? fallback[key];
  return normalizeCurve({ x1: pick('x1'), y1: pick('y1'), cx: pick('cx'), cy: pick('cy'), x2: pick('x2'), y2: pick('y2') });
}

/**
 * Reads the editable fields of a stored label (from a database, a file, a request body) on top of
 * a fallback label. Missing, broken or out-of-range values fall back or are clamped, so the result
 * is always safe to draw. Fields the studio does not edit always come from the fallback.
 */
export function normalizeLabel(raw: unknown, fallback: CurvedLabel): CurvedLabel {
  if (!raw || typeof raw !== 'object') return { ...fallback, curve: { ...fallback.curve } };
  const r = raw as Record<string, unknown>;
  const text = typeof r.text === 'string' && r.text.trim() ? r.text.slice(0, LABEL_LIMITS.textLength) : fallback.text;
  return {
    ...fallback,
    text,
    curve: readCurve(r.curve, fallback.curve),
    fontSize: readNumber(r.fontSize, fallback.fontSize, LABEL_LIMITS.fontSize, 1),
    letterSpacing: readNumber(r.letterSpacing, fallback.letterSpacing ?? 0, LABEL_LIMITS.letterSpacing, 0.01),
    startOffset: readNumber(r.startOffset, fallback.startOffset ?? 50, LABEL_LIMITS.startOffset, 0.5),
  };
}

/**
 * Applies stored edits (an array or an id-keyed object) to your default labels, matched by id.
 * Unknown ids are ignored, so stored data can never add labels or styles you did not define.
 */
export function applyStoredLabels(defaults: readonly CurvedLabel[], stored: unknown): CurvedLabel[] {
  const byId = new Map<string, unknown>();
  if (Array.isArray(stored)) {
    for (const item of stored) {
      if (item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string') {
        byId.set((item as { id: string }).id, item);
      }
    }
  } else if (stored && typeof stored === 'object') {
    for (const [id, item] of Object.entries(stored)) byId.set(id, item);
  }
  return defaults.map((label) => normalizeLabel(byId.get(label.id), label));
}

/** Just the editable fields, keyed by id: the smallest thing worth storing. */
export function serializeLabels(labels: readonly CurvedLabel[]): Record<string, Pick<CurvedLabel, EditableField>> {
  return Object.fromEntries(
    labels.map((l) => [
      l.id,
      { text: l.text, curve: { ...l.curve }, fontSize: l.fontSize, letterSpacing: l.letterSpacing ?? 0, startOffset: l.startOffset ?? 50 },
    ]),
  );
}

export function sameLabels(a: readonly CurvedLabel[], b: readonly CurvedLabel[]): boolean {
  return JSON.stringify(serializeLabels(a)) === JSON.stringify(serializeLabels(b));
}

/**
 * Joins Arabic-script parts with kashida (tatweel, U+0640) to stretch a word along a long curve:
 * `kashida(['ک', 'وردس', 'ت', 'ان'], [9, 8, 6])`. Only join between letters that connect.
 */
export function kashida(parts: readonly string[], counts: readonly number[]): string {
  return parts.reduce((out, part, i) => out + part + (i < parts.length - 1 ? 'ـ'.repeat(Math.max(0, counts[i] ?? 0)) : ''), '');
}
