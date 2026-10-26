/** Every piece of text the studio shows. Pass a partial object to translate or reword it. */
export interface StudioMessages {
  launcher: string;
  title: string;
  dialogLabel: string;
  close: string;
  statusClean: string;
  statusDirty: string;
  dragHint: string;
  appleTouchHint: string;
  groupText: string;
  groupLine: string;
  text: string;
  size: string;
  letterSpacing: string;
  position: string;
  angle: string;
  bend: string;
  length: string;
  defaults: string;
  discard: string;
  save: string;
  saving: string;
  saveFailed: string;
  confirmClose: string;
}

export const DEFAULT_MESSAGES: StudioMessages = {
  launcher: 'Map labels',
  title: 'Map labels',
  dialogLabel: 'Map label studio',
  close: 'Close',
  statusClean: 'Matches what everyone sees',
  statusDirty: 'Unsaved changes, only you see them',
  dragHint: 'Drag the dashed line on the map to move the text.',
  appleTouchHint: 'This label is hidden on iPhone and iPad.',
  groupText: 'Text',
  groupLine: 'Line',
  text: 'Text',
  size: 'Size',
  letterSpacing: 'Letter spacing',
  position: 'Position on line',
  angle: 'Angle',
  bend: 'Bend',
  length: 'Length',
  defaults: 'Defaults',
  discard: 'Discard',
  save: 'Save',
  saving: 'Saving…',
  saveFailed: 'Could not save. Try again.',
  confirmClose: 'Close without saving? Your changes will be lost.',
};
