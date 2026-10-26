import { useCallback, useState } from 'react';
import { CurvedLabels, type CurvedLabelsProps } from './CurvedLabels';
import { CurvedLabelGuide } from './CurvedLabelGuide';
import { CurvedLabelStudio, type StudioTheme } from './CurvedLabelStudio';
import type { CurvedLabel, EditableField } from './labels';
import type { StudioMessages } from './messages';

export interface EditableCurvedLabelsProps extends CurvedLabelsProps {
  /** Show the studio. Gate this on your own permission check; leave false for normal visitors. */
  editable?: boolean;
  /** Persist the labels. Throw (or reject) to show an error. After it resolves, pass the new labels back in. */
  onSave?: (labels: CurvedLabel[]) => void | Promise<void>;
  /** Your defaults, for the studio's "Defaults" button. */
  defaults?: readonly CurvedLabel[];
  fields?: readonly EditableField[];
  messages?: Partial<StudioMessages>;
  theme?: StudioTheme;
  position?: 'bottom-left' | 'bottom-right';
  guideColor?: string;
  guideZIndex?: number;
  /** Called when the studio opens or closes, for example to pause map popups. */
  onEditingChange?: (editing: boolean) => void;
}

/**
 * Curved labels plus, when `editable`, the studio: a launcher button, the panel and a drag guide.
 * Edits stay a private draft until saved. Render it inside a react-leaflet MapContainer.
 */
export function EditableCurvedLabels({
  editable = false,
  onSave,
  defaults,
  fields,
  messages,
  theme,
  position,
  guideColor,
  guideZIndex,
  onEditingChange,
  ...layer
}: EditableCurvedLabelsProps) {
  const saved = layer.labels;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CurvedLabel[] | null>(null);
  const [selectedId, setSelectedId] = useState(() => saved[0]?.id ?? '');

  const setOpenState = useCallback(
    (next: boolean) => {
      setOpen(next);
      setDraft(next ? [...saved] : null);
      onEditingChange?.(next);
    },
    [saved, onEditingChange],
  );

  const editing = editable && open && draft !== null;
  const shown = editing ? draft : saved;
  const selected = shown.find((l) => l.id === selectedId) ?? shown[0];
  const canMove = !fields || fields.includes('curve');

  return (
    <>
      <CurvedLabels {...layer} labels={shown} />
      {editing && selected && canMove && (
        <CurvedLabelGuide
          curve={selected.curve}
          startOffset={selected.startOffset}
          onChange={(curve) => setDraft((d) => d && d.map((l) => (l.id === selected.id ? { ...l, curve } : l)))}
          bounds={layer.bounds}
          viewBox={layer.viewBox}
          fadeBetweenZooms={layer.fadeBetweenZooms}
          color={guideColor}
          zIndex={guideZIndex}
        />
      )}
      {editable && (
        <CurvedLabelStudio
          open={open}
          onOpenChange={setOpenState}
          saved={saved}
          draft={draft ?? saved}
          onDraftChange={setDraft}
          defaults={defaults}
          selectedId={selected?.id ?? ''}
          onSelect={setSelectedId}
          onSave={async (labels) => {
            await onSave?.(labels);
            setDraft(labels);
          }}
          fields={fields}
          messages={messages}
          theme={theme}
          position={position}
        />
      )}
    </>
  );
}
