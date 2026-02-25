import React, { useCallback, useRef, useState } from 'react';
import { useDAWStore } from '../../store/useDAWStore';
import { importAudioFile } from '../../utils/importAudio';
import type { SidebarTab } from '../../types';

export const Sidebar: React.FC = () => {
  const {
    view, setSidebarTab, templates, customerPresets,
    loadTemplate, addTrack, addClip,
  } = useDAWStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleImportFiles = useCallback(async (files: File[]) => {
    const audioFiles = files.filter(
      f => f.type.startsWith('audio/') || /\.(wav|mp3|flac|aac|ogg|m4a|webm)$/i.test(f.name)
    );
    if (audioFiles.length === 0) return;
    setImporting(true);
    try {
      for (const file of audioFiles) {
        await importAudioFile(file);
      }
    } catch (err) {
      console.error('Audio import failed:', err);
    } finally {
      setImporting(false);
    }
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleImportFiles(files);
  }, [handleImportFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    handleImportFiles(files);
    // Reset so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [handleImportFiles]);

  const tabs: Array<{ id: SidebarTab; label: string }> = [
    { id: 'files', label: 'Files' },
    { id: 'plugins', label: 'Plugins' },
    { id: 'templates', label: 'Templates' },
    { id: 'presets', label: 'Presets' },
  ];

  return (
    <div style={styles.container}>
      {/* Tab bar */}
      <div style={styles.tabBar}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              color: view.sidebarTab === tab.id ? 'var(--accent-blue)' : 'var(--text-muted)',
              borderBottomColor: view.sidebarTab === tab.id ? 'var(--accent-blue)' : 'transparent',
            }}
            onClick={() => setSidebarTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {/* Files Tab */}
        {view.sidebarTab === 'files' && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.wav,.mp3,.flac,.aac,.ogg,.m4a,.webm"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <div
              style={{
                ...styles.dropZone,
                borderColor: dragOver ? 'var(--accent-blue)' : undefined,
                background: dragOver ? 'rgba(74,158,255,0.05)' : undefined,
              }}
              onDrop={handleFileDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => !importing && fileInputRef.current?.click()}
            >
              <div style={styles.dropZoneInner}>
                {importing ? (
                  <>
                    <div style={styles.spinner} />
                    <p style={styles.dropText}>Importing audio...</p>
                  </>
                ) : (
                  <>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={dragOver ? 'var(--accent-blue)' : 'var(--text-muted)'} strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                    </svg>
                    <p style={styles.dropText}>Drop audio files here</p>
                    <p style={styles.dropSubtext}>or click to browse</p>
                    <p style={styles.dropSubtext}>WAV, MP3, FLAC, AAC, OGG</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Plugins Tab */}
        {view.sidebarTab === 'plugins' && (
          <div>
            <h4 style={styles.sectionTitle}>Built-in Effects</h4>
            {[
              { name: 'EQ (Parametric)', type: 'builtin', desc: '8-band parametric EQ' },
              { name: 'Compressor', type: 'builtin', desc: 'Dynamic range control' },
              { name: 'De-Esser', type: 'builtin', desc: 'Sibilance reduction' },
              { name: 'Noise Gate', type: 'builtin', desc: 'Remove background noise' },
              { name: 'Limiter', type: 'builtin', desc: 'Peak limiting' },
              { name: 'Reverb', type: 'builtin', desc: 'Room simulation' },
            ].map((plugin, i) => (
              <div key={i} style={styles.pluginItem}>
                <div style={styles.pluginIcon}>FX</div>
                <div>
                  <div style={styles.pluginName}>{plugin.name}</div>
                  <div style={styles.pluginDesc}>{plugin.desc}</div>
                </div>
              </div>
            ))}

            <h4 style={{ ...styles.sectionTitle, marginTop: 12 }}>External Plugins</h4>
            <div style={styles.pluginFormats}>
              {['VST3', 'VST2', 'AU', 'ARA'].map(format => (
                <div key={format} style={styles.formatBadge}>
                  {format}
                </div>
              ))}
            </div>
            <button style={styles.scanBtn}>Scan for Plugins...</button>
          </div>
        )}

        {/* Templates Tab */}
        {view.sidebarTab === 'templates' && (
          <div>
            <h4 style={styles.sectionTitle}>Podcast Templates</h4>
            {templates.map(template => (
              <button
                key={template.id}
                style={styles.templateCard}
                onClick={() => loadTemplate(template.id)}
              >
                <div style={styles.templateIcon}>
                  {template.category === 'solo' ? '🎙' :
                   template.category === 'interview' ? '👥' :
                   template.category === 'panel' ? '👥👥' : '📻'}
                </div>
                <div>
                  <div style={styles.templateName}>{template.name}</div>
                  <div style={styles.templateDesc}>{template.description}</div>
                  <div style={styles.templateMeta}>
                    {template.tracks.length} tracks · {template.loudnessTarget} LUFS
                  </div>
                </div>
              </button>
            ))}

            <button style={styles.createTemplateBtn}>
              + Create Template
            </button>
          </div>
        )}

        {/* Presets Tab */}
        {view.sidebarTab === 'presets' && (
          <div>
            <h4 style={styles.sectionTitle}>Customer Presets</h4>
            {customerPresets.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No customer presets yet.</p>
                <p style={styles.emptySubtext}>
                  Create presets with intro/outro, loudness targets, and delivery formats for each client.
                </p>
                <button style={styles.createTemplateBtn}>
                  + New Customer Preset
                </button>
              </div>
            ) : (
              customerPresets.map(preset => (
                <button key={preset.id} style={styles.templateCard}>
                  <div>
                    <div style={styles.templateName}>{preset.clientName}</div>
                    <div style={styles.templateMeta}>
                      {preset.deliveryFormat.format.toUpperCase()} ·
                      {preset.loudnessTarget} LUFS ·
                      {preset.introAudioUrl ? ' Intro' : ''}
                      {preset.outroAudioUrl ? ' + Outro' : ''}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: 'var(--sidebar-width)',
    minWidth: 240,
    background: 'var(--bg-dark)',
    borderRight: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  tabBar: {
    display: 'flex',
    background: 'var(--bg-medium)',
    borderBottom: '1px solid var(--border-subtle)',
    flexShrink: 0,
  },
  tab: {
    flex: 1,
    padding: '8px 4px',
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3px',
    borderBottom: '2px solid transparent',
    transition: 'all 0.12s',
    textAlign: 'center' as const,
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '8px',
  },
  dropZone: {
    border: '2px dashed var(--border-medium)',
    borderRadius: 8,
    padding: 24,
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  dropZoneInner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  dropText: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  dropSubtext: {
    fontSize: 10,
    color: 'var(--text-muted)',
  },
  spinner: {
    width: 24,
    height: 24,
    border: '2px solid var(--border-medium)',
    borderTopColor: 'var(--accent-blue)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: 6,
  },
  pluginItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    borderRadius: 4,
    cursor: 'grab',
    marginBottom: 2,
  },
  pluginIcon: {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-medium)',
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 700,
    color: 'var(--accent-blue)',
    flexShrink: 0,
  },
  pluginName: {
    fontSize: 11,
    fontWeight: 600,
  },
  pluginDesc: {
    fontSize: 9,
    color: 'var(--text-muted)',
  },
  pluginFormats: {
    display: 'flex',
    gap: 4,
    marginBottom: 8,
    flexWrap: 'wrap' as const,
  },
  formatBadge: {
    padding: '3px 8px',
    background: 'var(--bg-medium)',
    borderRadius: 3,
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--accent-teal)',
  },
  scanBtn: {
    width: '100%',
    padding: '8px',
    background: 'var(--bg-medium)',
    borderRadius: 4,
    fontSize: 11,
    color: 'var(--text-secondary)',
  },
  templateCard: {
    width: '100%',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '8px',
    background: 'var(--bg-medium)',
    borderRadius: 6,
    marginBottom: 4,
    textAlign: 'left' as const,
    transition: 'background 0.12s',
  },
  templateIcon: {
    fontSize: 20,
    flexShrink: 0,
  },
  templateName: {
    fontSize: 12,
    fontWeight: 600,
  },
  templateDesc: {
    fontSize: 10,
    color: 'var(--text-muted)',
  },
  templateMeta: {
    fontSize: 9,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  createTemplateBtn: {
    width: '100%',
    padding: '8px',
    background: 'var(--bg-medium)',
    border: '1px dashed var(--border-medium)',
    borderRadius: 6,
    fontSize: 11,
    color: 'var(--text-secondary)',
    marginTop: 8,
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '16px 8px',
    color: 'var(--text-muted)',
    fontSize: 11,
  },
  emptySubtext: {
    fontSize: 10,
    marginTop: 4,
    marginBottom: 12,
  },
};
