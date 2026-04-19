// TikTok Overlay Editor - Essential Tools Only
export const editorButtonCatalog = {
  // Essential tools for overlay creation
  tools: [
    { id: 'move', label: 'Move/Select', key: 'V', icon: 'fa-arrow-pointer', common: true },
    { id: 'zoom', label: 'Zoom', key: 'Z', icon: 'fa-magnifying-glass', common: true },
    { id: 'text', label: 'Text', key: 'T', icon: 'fa-font', common: true },
    { id: 'shape', label: 'Shape', key: 'U', icon: 'fa-square', common: true },
    { id: 'image', label: 'Image/Layer', key: 'I', icon: 'fa-image', common: true }
  ],

  // Top toolbar: File, Undo/Redo, Zoom controls
  topBar: [
    { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z', icon: 'fa-rotate-left', common: true },
    { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Shift+Z', icon: 'fa-rotate-right', common: true },
    { id: 'zoom-in', label: 'Zoom In', shortcut: '+', icon: 'fa-plus', common: true },
    { id: 'zoom-out', label: 'Zoom Out', shortcut: '-', icon: 'fa-minus', common: true },
    { id: 'fit-screen', label: 'Fit Screen', shortcut: '0', icon: 'fa-arrow-minimize', common: true },
    { id: 'actual-size', label: '100%', shortcut: '1', icon: 'fa-eye', common: true },
    { id: 'grid', label: 'Grid', shortcut: "Ctrl+'", icon: 'fa-border-all', common: true }
  ],

  // Layer panel controls
  layerPanel: [
    { id: 'new-layer', label: 'New Layer', icon: 'fa-plus', common: true },
    { id: 'duplicate-layer', label: 'Duplicate', icon: 'fa-copy', common: true },
    { id: 'delete-layer', label: 'Delete', icon: 'fa-trash', common: true },
    { id: 'hide-layer', label: 'Toggle Visibility', icon: 'fa-eye', common: true },
    { id: 'lock-layer', label: 'Lock/Unlock', icon: 'fa-lock', common: true },
    { id: 'bring-front', label: 'Bring to Front', icon: 'fa-arrow-up', common: true },
    { id: 'send-back', label: 'Send to Back', icon: 'fa-arrow-down', common: true }
  ],

  // Alignment and transform
  transformBar: [
    { id: 'align-left', label: 'Align Left', icon: 'fa-align-left', common: true },
    { id: 'align-center-h', label: 'Align Center', icon: 'fa-object-group', common: true },
    { id: 'align-right', label: 'Align Right', icon: 'fa-align-right', common: true },
    { id: 'align-top', label: 'Align Top', icon: 'fa-arrow-up', common: true },
    { id: 'align-center-v', label: 'Align Middle', icon: 'fa-divide', common: true },
    { id: 'align-bottom', label: 'Align Bottom', icon: 'fa-arrow-down', common: true },
    { id: 'flip-h', label: 'Flip Horizontal', icon: 'fa-arrows-left-right', common: true },
    { id: 'flip-v', label: 'Flip Vertical', icon: 'fa-arrows-up-down', common: true }
  ]
}

// All buttons already essential for TikTok overlays
export const implementedButtons = {
  tools: ['move', 'zoom', 'text', 'shape', 'image'],
  topBar: ['undo', 'redo', 'zoom-in', 'zoom-out', 'fit-screen', 'actual-size', 'grid'],
  layerPanel: ['new-layer', 'duplicate-layer', 'delete-layer', 'hide-layer', 'lock-layer', 'bring-front', 'send-back'],
  transformBar: ['align-left', 'align-center-h', 'align-right', 'align-top', 'align-center-v', 'align-bottom', 'flip-h', 'flip-v']
}
