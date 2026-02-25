import React, { useCallback, useRef, useState } from 'react';
import type { Track } from '../../types';
import { useDAWStore } from '../../store/useDAWStore';
import { ClipView } from './ClipView';

interface TrackLaneProps {
  track: Track;
}

export const TrackLane: React.FC<TrackLaneProps> = ({ track }) => {
  const {
    view, currentTime, setCurrentTime, splitClip,
    activeTool, setSelectedClip, selectedClipId, moveClip,
    setSelection,
  } = useDAWStore();

  const laneRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    clipId: string;
    startX: number;
    originalStartTime: number;
  } | null>(null);
  const [rangeStart, setRangeStart] = useState<number | null>(null);

  const getTimeFromX = useCallback((clientX: number) => {
    if (!laneRef.current) return 0;
    const rect = laneRef.current.getBoundingClientRect();
    const x = clientX - rect.left + view.scrollX;
    return Math.max(0, x / view.zoom);
  }, [view.zoom, view.scrollX]);

  const snapTime = useCallback((time: number) => {
    if (!view.snapEnabled) return time;
    const res = view.snapResolution;
    let grid = 0.1;
    if (res === '0.5s') grid = 0.5;
    else if (res === '1s') grid = 1;
    else if (res === 'beat') grid = 60 / 120; // assume 120bpm
    else if (res === 'bar') grid = (60 / 120) * 4;
    return Math.round(time / grid) * grid;
  }, [view.snapEnabled, view.snapResolution]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const time = getTimeFromX(e.clientX);

    if (activeTool === 'range') {
      setRangeStart(time);
      setSelection(time, time);

      const onMove = (me: MouseEvent) => {
        const t = getTimeFromX(me.clientX);
        const start = Math.min(time, t);
        const end = Math.max(time, t);
        setSelection(start, end);
      };
      const onUp = () => {
        setRangeStart(null);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      return;
    }

    // Default: set playhead on double-click / click on empty area
    setCurrentTime(snapTime(time));
  }, [activeTool, getTimeFromX, setCurrentTime, snapTime, setSelection]);

  // Clip interaction handlers passed to ClipView
  const handleClipMouseDown = useCallback((e: React.MouseEvent, clipId: string) => {
    e.stopPropagation();
    const clip = track.clips.find(c => c.id === clipId);
    if (!clip) return;

    if (activeTool === 'split') {
      const time = getTimeFromX(e.clientX);
      splitClip(track.id, clipId, time);
      return;
    }

    if (activeTool === 'eraser') {
      useDAWStore.getState().removeClip(track.id, clipId);
      return;
    }

    // Select mode: drag clip
    setSelectedClip(clipId, track.id);
    const startX = e.clientX;
    const originalStartTime = clip.startTime;

    const onMove = (me: MouseEvent) => {
      const dx = me.clientX - startX;
      const dt = dx / view.zoom;
      const newTime = snapTime(Math.max(0, originalStartTime + dt));
      useDAWStore.getState().updateClip(track.id, clipId, { startTime: newTime });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [activeTool, getTimeFromX, snapTime, track.id, track.clips, splitClip, setSelectedClip, view.zoom]);

  const playheadX = currentTime * view.zoom - view.scrollX;

  // Grid spacing based on zoom
  const gridInterval = view.zoom < 20 ? 10 : view.zoom < 50 ? 5 : view.zoom < 150 ? 1 : 0.5;
  const gridPx = gridInterval * view.zoom;

  // Cursor based on active tool
  const cursor = activeTool === 'split' ? 'col-resize'
    : activeTool === 'eraser' ? 'pointer'
    : activeTool === 'range' ? 'text'
    : 'default';

  return (
    <div
      ref={laneRef}
      style={{
        ...styles.container,
        height: track.height,
        opacity: track.muted ? 0.4 : 1,
        cursor,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Grid lines */}
      <div
        style={{
          ...styles.grid,
          backgroundSize: `${gridPx}px 100%`,
        }}
      />

      {/* Selection range overlay */}
      {view.selectionStart !== null && view.selectionEnd !== null && (
        <div
          style={{
            position: 'absolute',
            left: view.selectionStart * view.zoom - view.scrollX,
            width: (view.selectionEnd - view.selectionStart) * view.zoom,
            top: 0,
            bottom: 0,
            background: 'rgba(74,158,255,0.12)',
            borderLeft: '1px solid var(--accent-blue)',
            borderRight: '1px solid var(--accent-blue)',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />
      )}

      {/* Clips */}
      {track.clips.map(clip => (
        <ClipView
          key={clip.id}
          clip={clip}
          trackColor={track.color}
          zoom={view.zoom}
          scrollX={view.scrollX}
          isSelected={clip.id === selectedClipId}
          onMouseDown={handleClipMouseDown}
          activeTool={activeTool}
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
