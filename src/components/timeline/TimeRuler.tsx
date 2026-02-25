import React, { useRef, useCallback } from 'react';
import { useDAWStore } from '../../store/useDAWStore';

export const TimeRuler: React.FC = () => {
  const { view, currentTime, setCurrentTime, markers } = useDAWStore();
  const rulerRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + view.scrollX;
    const time = x / view.zoom;
    setCurrentTime(Math.max(0, time));
  }, [view.zoom, view.scrollX, setCurrentTime]);

  // Calculate ruler markings
  const pixelsPerSecond = view.zoom;
  let interval = 1; // seconds
  if (pixelsPerSecond < 20) interval = 10;
  else if (pixelsPerSecond < 50) interval = 5;
  else if (pixelsPerSecond < 150) interval = 1;
  else interval = 0.5;

  const totalWidth = 3600 * pixelsPerSecond; // 1 hour max
  const startTime = Math.floor(view.scrollX / pixelsPerSecond / interval) * interval;
  const visibleWidth = 2000; // approximate
  const endTime = startTime + visibleWidth / pixelsPerSecond + interval;

  const ticks: Array<{ time: number; x: number; major: boolean }> = [];
  for (let t = startTime; t <= endTime; t += interval) {
    ticks.push({
      time: t,
      x: t * pixelsPerSecond - view.scrollX,
      major: t % (interval * 5) === 0 || interval >= 5,
    });
  }

  const playheadX = currentTime * pixelsPerSecond - view.scrollX;

  const formatRulerTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (seconds < 60) return `${s}s`;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div ref={rulerRef} style={styles.container} onClick={handleClick}>
      <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
        {ticks.map((tick, i) => (
          <g key={i}>
            <line
              x1={tick.x}
              y1={tick.major ? 8 : 16}
              x2={tick.x}
              y2={28}
              stroke={tick.major ? 'var(--text-muted)' : 'var(--border-medium)'}
              strokeWidth={1}
            />
            {tick.major && (
              <text
                x={tick.x + 3}
                y={14}
                fill="var(--text-muted)"
                fontSize="10"
                fontFamily="var(--font-mono)"
              >
                {formatRulerTime(tick.time)}
              </text>
            )}
          </g>
        ))}

        {/* Markers */}
        {markers.map(marker => {
          const mx = marker.time * pixelsPerSecond - view.scrollX;
          return (
            <g key={marker.id}>
              <polygon
                points={`${mx-4},0 ${mx+4},0 ${mx},8`}
                fill={marker.color}
              />
              <text x={mx + 6} y={8} fill={marker.color} fontSize="9">
                {marker.name}
              </text>
            </g>
          );
        })}

        {/* Playhead */}
        <line
          x1={playheadX}
          y1={0}
          x2={playheadX}
          y2={28}
          stroke="var(--accent-blue)"
          strokeWidth={2}
        />
        <polygon
          points={`${playheadX-5},0 ${playheadX+5},0 ${playheadX},8`}
          fill="var(--accent-blue)"
        />
      </svg>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: 28,
    background: 'var(--bg-darker)',
    borderBottom: '1px solid var(--border-subtle)',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    marginLeft: 'var(--track-header-width)',
  },
};
