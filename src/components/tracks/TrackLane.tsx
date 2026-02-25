import React, { useCallback } from 'react';
import type { Track } from '../../types';
import { useDAWStore } from '../../store/useDAWStore';
import { ClipView } from './ClipView';

interface TrackLaneProps {
  track: Track;
}

export const TrackLane: React.FC<TrackLaneProps> = ({ track }) => {
  const { view, currentTime, setCurrentTime, splitClip } = useDAWStore();

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    // Double click on empty area = set playhead
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left + view.scrollX;
    const time = x / view.zoom;
    setCurrentTime(Math.max(0, time));
  }, [view.zoom, view.scrollX, setCurrentTime]);

  const playheadX = currentTime * view.zoom - view.scrollX;

  return (
    <div
      style={{
        ...styles.container,
        height: track.height,
        opacity: track.muted ? 0.4 : 1,
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Grid lines */}
      <div style={styles.grid} />

      {/* Clips */}
      {track.clips.map(clip => (
        <ClipView
          key={clip.id}
          clip={clip}
          trackColor={track.color}
          zoom={view.zoom}
          scrollX={view.scrollX}
        />
      ))}

      {/* Playhead line */}
      <div
        style={{
          ...styles.playhead,
          left: playheadX,
        }}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    background: 'var(--bg-darker)',
    borderBottom: '1px solid var(--border-subtle)',
    overflow: 'hidden',
    flex: 1,
  },
  grid: {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)',
    backgroundSize: '100px 100%',
    opacity: 0.5,
    pointerEvents: 'none',
  },
  playhead: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    background: 'var(--accent-blue)',
    pointerEvents: 'none',
    zIndex: 10,
  },
};
