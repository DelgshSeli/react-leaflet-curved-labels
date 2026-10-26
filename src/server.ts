// Framework-free helpers for API routes and servers: no React, no Leaflet, no "use client".
export { LABEL_LIMITS, applyStoredLabels, normalizeLabel, sameLabels, serializeLabels, kashida, type CurvedLabel, type EditableField } from './labels';
export { GEOMETRY_LIMITS, curvePath, normalizeCurve, parseCurvePath, type LabelCurve } from './geometry';
