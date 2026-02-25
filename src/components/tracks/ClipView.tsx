import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { Clip } from '../../types';
import { useDAWStore } from '../../store/useDAWStore';
import type { ToolMode } from '../../store/useDAWStore';

interface ClipViewProps {
  clip: Clip;
  trackColor: string;
  zoom: number;
  scrollX: number;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, clipId: string) => void;
  activeTool: ToolMode;
}

export const ClipView: React.FC<ClipViewProps> = ({
  clip, trackColor, zoom, scrollX, isSelected, onMouseDown, activeTool,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { aiAnalysis } = useDAWStore();
  const [trimSide, setTrimSide] = useState<'left' | 'right' | null>(null);

  const clipX = clip.startTime * zoom - scrollX;
  const clipWidth = clip.duration * zoom;

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !clip.waveformData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = Math.max(1, clipWidth);
    const displayHeight = 60;
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Draw filler/noise regions as background highlights
    if (aiAnalysis) {
      for (const cut of aiAnalysis.suggestedCuts) {
        if (cut.applied) continue;
        const regionStart = (cut.startTime - clip.startTime) * zoom;
        const regionWidth = (cut.endTime - cut.startTime) * zoom;
        if (regionStart + regionWidth < 0 || regionStart > displayWidth) continue;

        ctx.fillStyle = cut.type === 'filler'
          ? 'rgba(255,107,107,0.15)'
          : cut.type === 'silence'
          ? 'rgba(255,212,59,0.1)'
          : 'rgba(204,93,232,0.12)';
        ctx.fillRect(
          Math.max(0, regionStart),
          0,
          regionWidth,
          displayHeight
        );
      }
    }

    // Draw waveform
    const data = clip.waveformData;
    const barWidth = displayWidth / data.length;
    const midY = displayHeight / 2;

    ctx.fillStyle = trackColor;
    ctx.globalAlpha = 0.8;

    for (let i = 0; i < data.length; i++) {
      const amp = data[i] * midY * 0.9;
      ctx.fillRect(
        i * barWidth,
        midY - amp,
        Math.max(1, barWidth - 0.5),
        amp * 2 || 1
      );
    }

    ctx.globalAlpha = 1;

    // Fade in indicator
    if (clip.fadeIn > 0) {
      const fadeWidth = clip.fadeIn * zoom;
      const grad = ctx.createLinearGradient(0, 0, fadeWidth, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0.6)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, fadeWidth, displayHeight);
    }

    // Fade out indicator
    if (clip.fadeOut > 0) {
      const fadeWidth = clip.fadeOut * zoom;
      const grad = ctx.createLinearGradient(displayWidth - fadeWidth, 0, displayWidth, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = grad;
      ctx.fillRect(displayWidth - fadeWidth, 0, fadeWidth, displayHeight);
    }
  }, [clip.waveformData, trackColor, zoom, aiAnalysis, clip.startTime, clip.fadeIn, clip.fadeOut, clipWidth]);

  // Trim edge detection
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (activeTool !== 'select') {
      setTrimSide(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < 6) setTrimSide('left');
    else if (x > rect.width - 6) setTrimSide('right');
    else setTrimSide(null);
  }, [activeTool]);

  const handleMouseDownLocal = useCallback((e: React.MouseEvent) => {
    // Handle edge trim
    if (trimSide && activeTool === 'select') {
      e.stopPropagation();
      const startX = e.clientX;
      const originalStart = clip.startTime;
      const originalDuration = clip.duration;
      const originalOffset = clip.offset;
      const trackId = clip.trackId;

      const onMove = (me: MouseEvent) => {
        const dx = me.clientX - startX;
        const dt = dx / zoom;
        if (trimSide === 'left') {
          const newStart = Math.max(0, originalStart + dt);
          const maxShift = originalDuration - 0.05;
          const actualDt = Math.min(newStart - originalStart, maxShift);
          useDAWStore.getState().updateClip(trackId, clip.id, {
            startTime: originalStart + actualDt,
            duration: originalDuration - actualDt,
            offset: originalOffset + actualDt,
          });
        } else {
          const newDuration = Math.max(0.05, originalDuration + dt);
          useDAWStore.getState().updateClip(trackId, clip.id, {
            duration: newDuration,
          });
        }
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      return;
    }
    onMouseDown(e, clip.id);
  }, [trimSide, activeTool, clip, zoom, onMouseDown]);

  if (clipX + clipWidth < 0) return null;

  const cursor = activeTool === 'split' ? 'col-resize'
    : activeTool === 'eraser' ? 'pointer'
    : trimSide ? 'col-resize'
    : 'grab';

  return (
    <div
      style={{
        ...styles.container,
        left: clipX,
        width: clipWidth,
        borderColor: isSelected ? 'var(--accent-blue)' : trackColor,
        boxShadow: isSelected ? '0 0 0 1px var(--accent-blue), 0 2px 8px rgba(74,158,255,0.25)' : undefined,
        cursor,
      }}
      onMouseDown={handleMouseDownLocal}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTrimSide(null)}
    >
      {/* Trim handles */}
      {activeTool === 'select' && (
        <>
          <div style={styles.trimHandleLeft} />
          <div style={styles.trimHandleRight} />
        </>
      )}

      <div style={{ ...styles.header, background: trackColor + '40' }}>
        <span style={styles.clipName}>{clip.name}</span>
        {clip.gain !== 1 && (
          <span style={styles.gainBadge}>
            {clip.gain > 1 ? '+' : ''}{(20 * Math.log10(clip.gain)).toFixed(1)}dB
          </span>
        )}
      </div>
      <canvas
        ref={canvasRef}
        style={styles.waveform}
        width={Math.max(1, clipWidth)}
        height={60}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    borderRadius: 4,
    border: '1px solid',
    background: 'var(--bg-medium)',
    overflow: 'hidden',
    transition: 'box-shadow 0.12s',
  },
  header: {
    height: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 6px',
    fontSize: 10,
  },
  clipName: {
    fontWeight: 600,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  gainBadge: {
    fontSize: 9,
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-yellow)',
    flexShrink: 0,
  },
  waveform: {
    width: '100%',
    height: 'calc(100% - 18px)',
    display: 'block',
  },
  trimHandleLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    cursor: 'col-resize',
    zIndex: 2,
    background: 'transparent',
  },
  trimHandleRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 5,
    cursor: 'col-resize',
    zIndex: 2,
    background: 'transparent',
  },
};
