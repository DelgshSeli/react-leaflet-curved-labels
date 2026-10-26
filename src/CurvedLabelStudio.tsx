import { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  GEOMETRY_LIMITS,
  curveAngle,
  curveBend,
  curveLength,
  withCurveAngle,
  withCurveBend,
  withCurveLength,
  type LabelCurve,
} from './geometry';
import { LABEL_LIMITS, sameLabels, type CurvedLabel, type EditableField } from './labels';
import { DEFAULT_MESSAGES, type StudioMessages } from './messages';

export type StudioTheme = 'light' | 'dark' | 'auto';

export interface CurvedLabelStudioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What everyone sees now. */
  saved: readonly CurvedLabel[];
  /** What you are editing. */
  draft: readonly CurvedLabel[];
  onDraftChange: (next: CurvedLabel[]) => void;
  /** Your defaults, for the "Defaults" button. Hidden when omitted. */
  defaults?: readonly CurvedLabel[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Persist the draft. Throw (or reject) to show an error and keep the draft. */
  onSave: (draft: CurvedLabel[]) => void | Promise<void>;
  /** Which fields can be edited. Default: all. */
  fields?: readonly EditableField[];
  messages?: Partial<StudioMessages>;
  theme?: StudioTheme;
  /** Where the launcher and panel sit on wide screens. Default "bottom-left". */
  position?: 'bottom-left' | 'bottom-right';
}

const ALL_FIELDS: readonly EditableField[] = ['text', 'fontSize', 'letterSpacing', 'startOffset', 'curve'];

/**
 * The editing panel. It renders into document.body, so it never sits inside the map's DOM (no
 * click or scroll ever reaches Leaflet) and works with any page layout. On narrow screens it
 * becomes a bottom sheet.
 */
export function CurvedLabelStudio({
  open,
  onOpenChange,
  saved,
  draft,
  onDraftChange,
  defaults,
  selectedId,
  onSelect,
  onSave,
  fields = ALL_FIELDS,
  messages,
  theme = 'auto',
  position = 'bottom-left',
}: CurvedLabelStudioProps) {
  const m = { ...DEFAULT_MESSAGES, ...messages };
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const dirty = !sameLabels(draft, saved);
  const label = draft.find((l) => l.id === selectedId) ?? draft[0];
  const can = (field: EditableField) => fields.includes(field);

  if (typeof document === 'undefined' || !label) return null;

  const patch = (change: Partial<CurvedLabel>) => {
    setError(false);
    onDraftChange(draft.map((l) => (l.id === label.id ? { ...l, ...change } : l)));
  };
  const setCurve = (curve: LabelCurve) => patch({ curve });

  const save = async () => {
    setSaving(true);
    setError(false);
    try {
      await onSave(draft.map((l) => ({ ...l, curve: { ...l.curve } })));
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    if (dirty && !window.confirm(m.confirmClose)) return;
    onOpenChange(false);
  };

  const rootProps = { 'data-clp-theme': theme, 'data-clp-position': position };

  if (!open) {
    return createPortal(
      <button type="button" className="clp-launcher" onClick={() => onOpenChange(true)} {...rootProps}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7V4h16v3M9 20h6M12 4v16" />
        </svg>
        {m.launcher}
      </button>,
      document.body,
    );
  }

  return createPortal(
    <div className="clp-panel" role="dialog" aria-label={m.dialogLabel} {...rootProps}>
      <header className="clp-header">
        <div>
          <h2 className="clp-title">{m.title}</h2>
          <p className="clp-status">{dirty ? m.statusDirty : m.statusClean}</p>
        </div>
        <button type="button" className="clp-icon-button" onClick={close} aria-label={m.close}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      {draft.length > 1 && (
        <div className="clp-tabs" role="tablist">
          {draft.map((l) => (
            <button
              key={l.id}
              type="button"
              role="tab"
              aria-selected={l.id === label.id}
              className="clp-tab"
              onClick={() => onSelect(l.id)}
              dir={l.direction}
              lang={l.lang}
              title={l.text}
            >
              {l.text}
            </button>
          ))}
        </div>
      )}

      <div className="clp-body">
        {can('curve') && <p className="clp-hint">{m.dragHint}</p>}
        {label.hideOnAppleTouch && <p className="clp-hint">{m.appleTouchHint}</p>}

        <section className="clp-group">
          <h3 className="clp-group-title">{m.groupText}</h3>
          {can('text') && (
            <TextField
              label={m.text}
              value={label.text}
              dir={label.direction}
              lang={label.lang}
              onChange={(text) => patch({ text: text.slice(0, LABEL_LIMITS.textLength) })}
            />
          )}
          {can('fontSize') && (
            <Slider label={m.size} value={label.fontSize} limits={LABEL_LIMITS.fontSize} onChange={(fontSize) => patch({ fontSize })} />
          )}
          {can('letterSpacing') && (
            <Slider
              label={m.letterSpacing}
              value={label.letterSpacing ?? 0}
              limits={LABEL_LIMITS.letterSpacing}
              step={0.01}
              format={(v) => v.toFixed(2)}
              onChange={(letterSpacing) => patch({ letterSpacing })}
            />
          )}
          {can('startOffset') && (
            <Slider
              label={m.position}
              value={label.startOffset ?? 50}
              limits={LABEL_LIMITS.startOffset}
              step={0.5}
              format={(v) => `${v}%`}
              onChange={(startOffset) => patch({ startOffset })}
            />
          )}
        </section>

        {can('curve') && (
          <section className="clp-group">
            <h3 className="clp-group-title">{m.groupLine}</h3>
            <Slider
              label={m.angle}
              value={curveAngle(label.curve)}
              limits={GEOMETRY_LIMITS.angle}
              format={(v) => `${v}°`}
              onChange={(v) => setCurve(withCurveAngle(label.curve, v))}
            />
            <Slider label={m.bend} value={curveBend(label.curve)} limits={GEOMETRY_LIMITS.bend} onChange={(v) => setCurve(withCurveBend(label.curve, v))} />
            <Slider
              label={m.length}
              value={curveLength(label.curve)}
              limits={GEOMETRY_LIMITS.length}
              step={10}
              onChange={(v) => setCurve(withCurveLength(label.curve, v))}
            />
          </section>
        )}
      </div>

      {error && (
        <p className="clp-error" role="alert">
          {m.saveFailed}
        </p>
      )}

      <footer className="clp-footer">
        {defaults && (
          <button
            type="button"
            className="clp-button clp-button-quiet"
            disabled={sameLabels(draft, defaults)}
            onClick={() => onDraftChange(defaults.map((l) => ({ ...l, curve: { ...l.curve } })))}
          >
            {m.defaults}
          </button>
        )}
        <span className="clp-spacer" />
        <button type="button" className="clp-button" disabled={!dirty || saving} onClick={() => onDraftChange([...saved])}>
          {m.discard}
        </button>
        <button type="button" className="clp-button clp-button-primary" disabled={!dirty || saving} onClick={save}>
          {saving ? m.saving : m.save}
        </button>
      </footer>
    </div>,
    document.body,
  );
}

interface SliderProps {
  label: string;
  value: number;
  limits: readonly [number, number];
  step?: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}

function Slider({ label, value, limits, step = 1, format = String, onChange }: SliderProps) {
  const id = useId();
  return (
    <div className="clp-field">
      <div className="clp-field-row">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{format(value)}</output>
      </div>
      <input
        id={id}
        className="clp-range"
        type="range"
        min={limits[0]}
        max={limits[1]}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  dir?: string;
  lang?: string;
  onChange: (value: string) => void;
}

function TextField({ label, value, dir, lang, onChange }: TextFieldProps) {
  const id = useId();
  return (
    <div className="clp-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="clp-input" type="text" value={value} dir={dir} lang={lang} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
