// ============================================================
// SuperDAW Keyboard Shortcuts Reference
// ============================================================

export interface Shortcut {
  keys: string;
  description: string;
  category: string;
}

export const SHORTCUTS: Shortcut[] = [
  // Transport
  { keys: 'Space', description: 'Play / Pause', category: 'Transport' },
  { keys: 'Enter', description: 'Stop', category: 'Transport' },
  { keys: 'Home', description: 'Go to start', category: 'Transport' },
  { keys: 'R', description: 'Record', category: 'Transport' },
  { keys: 'L', description: 'Toggle loop', category: 'Transport' },

  // Editing
  { keys: 'V', description: 'Select tool', category: 'Editing' },
  { keys: 'R', description: 'Range selection tool', category: 'Editing' },
  { keys: 'S', description: 'Split tool', category: 'Editing' },
  { keys: 'E', description: 'Eraser tool', category: 'Editing' },
  { keys: 'Ctrl+Z', description: 'Undo', category: 'Editing' },
  { keys: 'Ctrl+Shift+Z', description: 'Redo', category: 'Editing' },
  { keys: 'Ctrl+X', description: 'Cut', category: 'Editing' },
  { keys: 'Ctrl+C', description: 'Copy', category: 'Editing' },
  { keys: 'Ctrl+V', description: 'Paste', category: 'Editing' },
  { keys: 'Delete', description: 'Delete selection', category: 'Editing' },
  { keys: 'Ctrl+D', description: 'Duplicate', category: 'Editing' },

  // View
  { keys: 'Ctrl+=', description: 'Zoom in', category: 'View' },
  { keys: 'Ctrl+-', description: 'Zoom out', category: 'View' },
  { keys: 'Ctrl+0', description: 'Zoom to fit', category: 'View' },
  { keys: 'Ctrl+M', description: 'Toggle mixer', category: 'View' },
  { keys: 'Ctrl+A', description: 'Toggle AI panel', category: 'View' },
  { keys: 'Ctrl+T', description: 'Toggle transcript', category: 'View' },
  { keys: 'N', description: 'Toggle snap', category: 'View' },

  // AI
  { keys: 'Ctrl+Shift+A', description: 'Analyze audio', category: 'AI' },
  { keys: 'Ctrl+Shift+F', description: 'Remove all fillers', category: 'AI' },
  { keys: 'Ctrl+Shift+L', description: 'Level match', category: 'AI' },
  { keys: 'Ctrl+Shift+N', description: 'De-noise', category: 'AI' },

  // Project
  { keys: 'Ctrl+N', description: 'New project', category: 'Project' },
  { keys: 'Ctrl+O', description: 'Open project', category: 'Project' },
  { keys: 'Ctrl+S', description: 'Save project', category: 'Project' },
  { keys: 'Ctrl+Shift+E', description: 'Export', category: 'Project' },
];
