import React from 'react';
import type { Track } from '../../types';
import { useDAWStore } from '../../store/useDAWStore';

interface TrackHeaderProps {
  track: Track;
}

export const TrackHeader: React.FC<TrackHeaderProps> = ({ track }) => {
  const { updateTrack, removeTrack } = useDAWStore();

  return (
    <div style={{ ...styles.container, borderLeftColor: track.color }}>
      {/* Track name */}
      <div style={styles.nameRow}>
        <div
          style={{ ...styles.colorDot, background: track.color }}
        />
        <input
          style={styles.nameInput}
          value={track.name}
          onChange={e => updateTrack(track.id, { name: e.target.value })}
          onFocus={e => e.target.select()}
        />
        <button
          style={styles.deleteBtn}
          onClick={() => removeTrack(track.id)}
          title="Remove track"
        >
          ×
        </button>
      </div>

      {/* Controls row */}
      <div style={styles.controlsRow}>
        {/* Mute */}
        <button
          style={{
            ...styles.toggleBtn,
            background: track.muted ? 'var(--accent-red)' : undefined,
            color: track.muted ? 'white' : 'var(--text-muted)',
          }}
          onClick={() => updateTrack(track.id, { muted: !track.muted })}
          title="Mute"
        >
          M
        </button>

        {/* Solo */}
        <button
          style={{
            ...styles.toggleBtn,
            background: track.solo ? 'var(--accent-yellow)' : undefined,
            color: track.solo ? 'var(--bg-darkest)' : 'var(--text-muted)',
          }}
          onClick={() => updateTrack(track.id, { solo: !track.solo })}
          title="Solo"
        >
          S
        </button>

        {/* Record arm */}
        {track.type === 'audio' && (
          <button
            style={{
              ...styles.toggleBtn,
              background: track.armed ? 'rgba(255,107,107,0.2)' : undefined,
              color: track.armed ? 'var(--accent-red)' : 'var(--text-muted)',
            }}
            onClick={() => updateTrack(track.id, { armed: !track.armed })}
            title="Record Arm"
          >
            R
          </button>
        )}

        {/* Volume slider */}
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={track.volume}
          onChange={e => updateTrack(track.id, { volume: parseFloat(e.target.value) })}
          style={styles.volumeSlider}
          title={`Volume: ${Math.round(track.volume * 100)}%`}
        />

        {/* Pan knob (simplified as slider) */}
        <input
          type="range"
          min="-1"
          max="1"
          step="0.01"
          value={track.pan}
          onChange={e => updateTrack(track.id, { pan: parseFloat(e.target.value) })}
          style={styles.panSlider}
          title={`Pan: ${track.pan === 0 ? 'C' : track.pan < 0 ? `L${Math.round(Math.abs(track.pan) * 100)}` : `R${Math.round(track.pan * 100)}`}`}
        />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: 'var(--track-header-width)',
    minWidth: 200,
    background: 'var(--bg-dark)',
    borderBottom: '1px solid var(--border-subtle)',
    borderLeft: '3px solid',
    padding: '6px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flexShrink: 0,
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  nameInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: 12,
    fontWeight: 600,
    padding: '2px 4px',
    borderRadius: 3,
    minWidth: 0,
  },
  deleteBtn: {
    width: 18,
    height: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
    color: 'var(--text-muted)',
    fontSize: 14,
    flexShrink: 0,
    opacity: 0.5,
  },
  controlsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
  },
  toggleBtn: {
    width: 22,
    height: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
    fontSize: 10,
    fontWeight: 700,
    background: 'var(--bg-medium)',
    transition: 'all 0.12s',
  },
  volumeSlider: {
    flex: 1,
    height: 4,
    accentColor: 'var(--accent-blue)',
    cursor: 'pointer',
  },
  panSlider: {
    width: 40,
    height: 4,
    accentColor: 'var(--accent-orange)',
    cursor: 'pointer',
  },
};
