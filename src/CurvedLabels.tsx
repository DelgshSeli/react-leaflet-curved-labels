import { useId, useState } from 'react';
import type { LatLngBoundsExpression } from 'leaflet';
import { SVGOverlay, useMapEvents } from 'react-leaflet';
import { curvePath } from './geometry';
import type { CurvedLabel } from './labels';
import { isAppleTouchDevice } from './platform';

export const DEFAULT_VIEWBOX = '0 0 1000 500';

/** Zoom levels between which labels fade out (fully visible at the first, gone at the second). */
export type ZoomFade = readonly [number, number];

/** Opacity and scale for the current zoom. Labels also shrink to 75% as they fade. */
export function useZoomFade(fade: ZoomFade | undefined): { opacity: number; scale: number } {
  const map = useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const [zoom, setZoom] = useState(() => map.getZoom());
  if (!fade) return { opacity: 1, scale: 1 };
  const [from, to] = fade;
  const progress = to === from ? (zoom >= to ? 1 : 0) : Math.min(1, Math.max(0, (zoom - from) / (to - from)));
  return { opacity: 1 - progress, scale: 1 - progress * 0.25 };
}

/** A DOM-safe id prefix per component instance. */
export function useSafeId(prefix: string): string {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

export interface CurvedLabelsProps {
  labels: readonly CurvedLabel[];
  /** The map area the viewBox is stretched over. */
  bounds: LatLngBoundsExpression;
  /** Coordinate system for the curves. Default "0 0 1000 500". */
  viewBox?: string;
  fadeBetweenZooms?: ZoomFade;
  /** A Leaflet pane name. Default: the overlay pane. */
  pane?: string;
  /** Fade the labels in when they first appear. Default true. */
  fadeIn?: boolean;
}

/** Draws each label as SVG text along its curve, inside one overlay stretched over `bounds`. */
export function CurvedLabels({ labels, bounds, viewBox = DEFAULT_VIEWBOX, fadeBetweenZooms, pane, fadeIn = true }: CurvedLabelsProps) {
  const idPrefix = useSafeId('clp');
  const { opacity, scale } = useZoomFade(fadeBetweenZooms);
  // Known before the first paint (these components only render in the browser), so nothing flashes
  const [appleTouch] = useState(() => isAppleTouchDevice());
  const visible = labels.filter((l) => !(l.hideOnAppleTouch && appleTouch));

  return (
    <SVGOverlay
      bounds={bounds}
      // Leaflet copies undefined options too, which would erase its default pane
      {...(pane ? { pane } : {})}
      attributes={{ viewBox, style: 'pointer-events: none; overflow: visible;' }}
    >
      <g className={fadeIn ? 'clp-fade-in' : undefined}>
        <g
          style={{
            transformOrigin: '50% 50%',
            transform: `scale(${scale})`,
            opacity,
            transition: 'transform 0.1s ease-out, opacity 0.1s ease-out',
          }}
        >
          <defs>
            {visible.map((l) => (
              <path key={l.id} id={`${idPrefix}-${l.id}`} d={curvePath(l.curve)} />
            ))}
          </defs>
          {visible.map((l) => (
            <text
              key={l.id}
              className={l.className}
              fill={l.fill ?? 'rgba(0, 0, 0, 0.45)'}
              fontSize={l.fontSize}
              fontWeight={l.fontWeight ?? 700}
              fontFamily={l.fontFamily ?? 'system-ui, sans-serif'}
              letterSpacing={`${l.letterSpacing ?? 0}em`}
              direction={l.direction}
              xmlLang={l.lang}
              style={{ userSelect: 'none', pointerEvents: 'none', ...l.style }}
            >
              <textPath
                href={`#${idPrefix}-${l.id}`}
                startOffset={`${l.startOffset ?? 50}%`}
                textAnchor="middle"
                {...(l.side ? ({ side: l.side } as Record<string, string>) : {})}
              >
                {l.text}
              </textPath>
            </text>
          ))}
        </g>
      </g>
    </SVGOverlay>
  );
}
