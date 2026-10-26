import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { EditableCurvedLabels, applyStoredLabels, kashida, serializeLabels, type CurvedLabel } from '../../src';
import '../../src/styles.css';

// The overlay's 1000×500 viewBox is stretched over these bounds; curves use its units.
const BOUNDS: [[number, number], [number, number]] = [[40.5, 35.0], [31.5, 50.0]];

const DEFAULT_LABELS: CurvedLabel[] = [
  {
    id: 'latin',
    text: 'KURDISTAN',
    curve: { x1: 14, y1: 169, cx: 843, cy: -188, x2: 861, y2: 833 },
    fontSize: 69,
    letterSpacing: 0.5,
    startOffset: 46,
    fill: 'rgba(0, 0, 0, 0.45)',
    style: { textShadow: '0 2px 8px rgba(255,255,255,0.8)' },
  },
  {
    id: 'kurdish',
    text: kashida(['ک', 'وردس', 'ت', 'ان'], [9, 8, 6]),
    curve: { x1: -381, y1: 316, cx: 1130, cy: -325, x2: 616, y2: 1216 },
    fontSize: 50,
    startOffset: 46,
    direction: 'rtl',
    lang: 'ckb',
    side: 'right',
    fill: 'rgba(0, 0, 0, 0.45)',
    hideOnAppleTouch: true,
  },
];

const STORAGE_KEY = 'curved-labels-example';

function loadLabels(): CurvedLabel[] {
  try {
    return applyStoredLabels(DEFAULT_LABELS, JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'));
  } catch {
    return DEFAULT_LABELS;
  }
}

function App() {
  // In a real app, load these from your server and save them with a request in onSave.
  const [labels, setLabels] = useState(loadLabels);

  return (
    <MapContainer center={[37.1, 43.1]} zoom={6} style={{ height: '100%' }}>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <EditableCurvedLabels
        labels={labels}
        defaults={DEFAULT_LABELS}
        bounds={BOUNDS}
        fadeBetweenZooms={[6.5, 8]}
        editable
        onSave={(next) => {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeLabels(next)));
          setLabels(next);
        }}
      />
    </MapContainer>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
