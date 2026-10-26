import { useEffect, useRef, useState } from 'react';
import L, { type LatLngBoundsExpression } from 'leaflet';
import { Pane, SVGOverlay } from 'react-leaflet';
import { curvePath, moveCurve, pointAlongCurve, type LabelCurve } from './geometry';
import { DEFAULT_VIEWBOX, useSafeId, useZoomFade, type ZoomFade } from './CurvedLabels';

export interface CurvedLabelGuideProps {
  curve: LabelCurve;
  /** The label's startOffset, so the grip sits on the middle of the text. */
  startOffset?: number;
  onChange: (next: LabelCurve) => void;
  bounds: LatLngBoundsExpression;
  viewBox?: string;
  fadeBetweenZooms?: ZoomFade;
  color?: string;
  /**
   * z-index of the guide's own pane. It must sit above every layer that can take the pointer,
   * including canvas renderers (overlay pane is 400, markers 600). Default 640.
   */
  zIndex?: number;
}

/**
 * The curve as a dashed line with a grip at the text's centre. Dragging the line or the grip moves
 * the whole curve. Pointer handling is native, not React, so it can stop the events before
 * Leaflet starts panning the map.
 */
export function CurvedLabelGuide({
  curve,
  startOffset = 50,
  onChange,
  bounds,
  viewBox = DEFAULT_VIEWBOX,
  fadeBetweenZooms,
  color = '#f59e0b',
  zIndex = 640,
}: CurvedLabelGuideProps) {
  const paneName = useSafeId('clp-guide');
  const { scale } = useZoomFade(fadeBetweenZooms);

  return (
    <Pane name={paneName} style={{ zIndex }}>
      <SVGOverlay bounds={bounds} attributes={{ viewBox, style: 'pointer-events: none; overflow: visible;' }}>
        <g style={{ transformOrigin: '50% 50%', transform: `scale(${scale})` }}>
          {/* A child component, so its effect runs once the overlay has actually rendered it */}
          <GuideShape curve={curve} startOffset={startOffset} onChange={onChange} color={color} />
        </g>
      </SVGOverlay>
    </Pane>
  );
}

interface GuideShapeProps {
  curve: LabelCurve;
  startOffset: number;
  onChange: (next: LabelCurve) => void;
  color: string;
}

function GuideShape({ curve, startOffset, onChange, color }: GuideShapeProps) {
  const groupRef = useRef<SVGGElement>(null);
  const latest = useRef({ curve, onChange });
  useEffect(() => {
    latest.current = { curve, onChange };
  }, [curve, onChange]);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    L.DomEvent.disableClickPropagation(group as unknown as HTMLElement);
    L.DomEvent.disableScrollPropagation(group as unknown as HTMLElement);

    let drag: { id: number; x: number; y: number; from: LabelCurve } | null = null;
    const toSvg = (e: PointerEvent) => {
      const matrix = group.getScreenCTM();
      return matrix ? new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse()) : null;
    };
    const down = (e: PointerEvent) => {
      const point = toSvg(e);
      if (!point) return;
      e.preventDefault();
      e.stopPropagation();
      drag = { id: e.pointerId, x: point.x, y: point.y, from: latest.current.curve };
      (e.target as Element).setPointerCapture?.(e.pointerId);
      setDragging(true);
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const point = toSvg(e);
      if (!point) return;
      e.preventDefault();
      latest.current.onChange(moveCurve(drag.from, point.x - drag.x, point.y - drag.y));
    };
    const up = (e: PointerEvent) => {
      if (drag && e.pointerId === drag.id) {
        drag = null;
        setDragging(false);
      }
    };
    group.addEventListener('pointerdown', down);
    group.addEventListener('pointermove', move);
    group.addEventListener('pointerup', up);
    group.addEventListener('pointercancel', up);
    return () => {
      group.removeEventListener('pointerdown', down);
      group.removeEventListener('pointermove', move);
      group.removeEventListener('pointerup', up);
      group.removeEventListener('pointercancel', up);
    };
  }, []);

  const d = curvePath(curve);
  const centre = pointAlongCurve(curve, startOffset);

  return (
    <g ref={groupRef} style={{ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}>
      {/* Leaflet's stylesheet turns pointer events off for paths in its panes; inline styles win */}
      <path d={d} fill="none" stroke="transparent" strokeWidth={48} style={{ pointerEvents: 'stroke' }} />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeOpacity={0.75}
        strokeWidth={2}
        strokeDasharray="10 8"
        vectorEffect="non-scaling-stroke"
        style={{ pointerEvents: 'none' }}
      />
      <circle cx={centre.x} cy={centre.y} r={22} fill="transparent" style={{ pointerEvents: 'all' }} />
      <circle
        cx={centre.x}
        cy={centre.y}
        r={9}
        fill={color}
        stroke="#fff"
        strokeWidth={3}
        vectorEffect="non-scaling-stroke"
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
}
