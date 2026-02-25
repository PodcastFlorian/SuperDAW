import React from 'react';
import { useDAWStore } from '../../store/useDAWStore';
import type { ToolMode } from '../../store/useDAWStore';

export const Toolbar: React.FC = () => {
  const {
    view, setZoom, toggleSnap, toggleTranscript, toggleAIPanel, toggleMixer,
    addTrack, activeTool, setActiveTool,
  } = useDAWStore();

  return (
    <div style={styles.container}>
      {/* Left: Edit tools */}
      <div style={styles.group}>
        {([
          { id: 'select', label: 'Select (V)', icon: 'M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z' },
          { id: 'range', label: 'Range (R)', icon: 'M4 7v10M20 7v10M4 12h16' },
          { id: 'split', label: 'Split (S)', icon: 'M12 2v20M8 8l4-4 4 4M8 16l4 4 4-4' },
          { id: 'eraser', label: 'Eraser (E)', icon: 'M20 20H7l-4-4 9-9 8 8-4 4zM18 13l-8-8' },
        ] as { id: ToolMode; label: string; icon: string }[]).map(tool => (
          <button
            key={tool.id}
            style={{
              ...styles.toolBtn,
              background: activeTool === tool.id ? 'var(--accent-blue)' : undefined,
              color: activeTool === tool.id ? 'white' : 'var(--text-secondary)',
            }}
            onClick={() => setActiveTool(tool.id)}
            title={tool.label}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={tool.icon} />
            </svg>
          </button>
        ))}
      </div>

      <div style={styles.divider} />

      {/* Center: Snap + Zoom */}
      <div style={styles.group}>
        <button
          style={{
            ...styles.toolBtn,
            color: view.snapEnabled ? 'var(--accent-yellow)' : 'var(--text-muted)',
          }}
          onClick={toggleSnap}
          title={`Snap: ${view.snapEnabled ? 'ON' : 'OFF'}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 14H3M21 10H3M12 3v18" />
          </svg>
        </button>

        <div style={styles.zoomGroup}>
          <button
            style={styles.zoomBtn}
            onClick={() => setZoom(view.zoom * 0.8)}
            title="Zoom out"
          >
            -
          </button>
          <span style={styles.zoomValue}>{Math.round(view.zoom)}%</span>
          <button
            style={styles.zoomBtn}
            onClick={() => setZoom(view.zoom * 1.25)}
            title="Zoom in"
          >
            +
          </button>
        </div>
      </div>

      <div style={styles.divider} />

      {/* Right: View toggles + Add track */}
      <div style={styles.group}>
        <button
          style={{
            ...styles.textBtn,
            color: view.showTranscript ? 'var(--accent-blue)' : 'var(--text-muted)',
          }}
          onClick={toggleTranscript}
        >
          Transcript
        </button>
        <button
          style={{
            ...styles.textBtn,
            color: view.showAIPanel ? 'var(--accent-purple)' : 'var(--text-muted)',
          }}
          onClick={toggleAIPanel}
        >
          AI
        </button>
        <button
          style={{
            ...styles.textBtn,
            color: view.showMixer ? 'var(--accent-green)' : 'var(--text-muted)',
          }}
          onClick={toggleMixer}
        >
          Mixer
        </button>

        <div style={styles.divider} />

        <button
          style={styles.addTrackBtn}
          onClick={() => addTrack('audio')}
        >
          + Track
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: 'var(--toolbar-height)',
    minHeight: 36,
    background: 'var(--bg-dark)',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    gap: 8,
  },
  group: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  toolBtn: {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    transition: 'all 0.12s',
  },
  divider: {
    width: 1,
    height: 20,
    background: 'var(--border-medium)',
    margin: '0 6px',
  },
  zoomGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
  },
  zoomBtn: {
    width: 22,
    height: 22,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
    background: 'var(--bg-medium)',
    color: 'var(--text-secondary)',
    fontSize: 14,
    fontWeight: 600,
  },
  zoomValue: {
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
    width: 40,
    textAlign: 'center' as const,
  },
  textBtn: {
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 500,
    transition: 'all 0.12s',
  },
  addTrackBtn: {
    padding: '4px 10px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    background: 'var(--accent-blue)',
    color: 'white',
  },
};
