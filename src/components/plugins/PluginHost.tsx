import React from 'react';
import type { PluginInstance, PluginFormat } from '../../types';

// ============================================================
// Plugin Host System
// Abstracts AU, VST3, VST2, and ARA plugin loading.
// In production this would use native Node.js addons via Electron.
// ============================================================

interface PluginHostProps {
  plugins: PluginInstance[];
  onUpdatePlugin: (pluginId: string, updates: Partial<PluginInstance>) => void;
  onRemovePlugin: (pluginId: string) => void;
}

export const PluginHost: React.FC<PluginHostProps> = ({ plugins, onUpdatePlugin, onRemovePlugin }) => {
  if (plugins.length === 0) return null;

  return (
    <div style={styles.container}>
      {plugins.map(plugin => (
        <div key={plugin.id} style={styles.plugin}>
          <div style={styles.pluginHeader}>
            <div style={{
              ...styles.formatBadge,
              background: formatColors[plugin.format] || 'var(--bg-lighter)',
            }}>
              {plugin.format.toUpperCase()}
            </div>
            <span style={styles.pluginName}>{plugin.name}</span>
            <button
              style={{
                ...styles.enableBtn,
                opacity: plugin.enabled ? 1 : 0.4,
              }}
              onClick={() => onUpdatePlugin(plugin.id, { enabled: !plugin.enabled })}
            >
              {plugin.enabled ? 'ON' : 'OFF'}
            </button>
            <button
              style={styles.removeBtn}
              onClick={() => onRemovePlugin(plugin.id)}
            >
              ×
            </button>
          </div>
          {plugin.enabled && (
            <div style={styles.pluginParams}>
              {Object.entries(plugin.parameters).map(([key, value]) => (
                <div key={key} style={styles.param}>
                  <label style={styles.paramLabel}>{key}</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={value}
                    onChange={e => {
                      const newParams = { ...plugin.parameters, [key]: parseFloat(e.target.value) };
                      onUpdatePlugin(plugin.id, { parameters: newParams });
                    }}
                    style={styles.paramSlider}
                  />
                  <span style={styles.paramValue}>{(value * 100).toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ============================================================
// Plugin Scanner (would use native modules in production)
// ============================================================

export interface ScannedPlugin {
  name: string;
  vendor: string;
  format: PluginFormat;
  path: string;
  category: string;
}

export async function scanForPlugins(): Promise<ScannedPlugin[]> {
  // In production with Electron:
  // - VST3: Scan /Library/Audio/Plug-Ins/VST3/ (macOS)
  //         or C:\Program Files\Common Files\VST3\ (Windows)
  // - VST2: Scan configured VST2 paths
  // - AU: Use AudioUnit framework APIs (macOS only)
  // - ARA: Detect ARA-compatible plugins from VST3/AU scans

  // Return demo plugins for prototype
  return [
    { name: 'FabFilter Pro-Q 3', vendor: 'FabFilter', format: 'vst3', path: '/Library/Audio/Plug-Ins/VST3/FabFilter Pro-Q 3.vst3', category: 'EQ' },
    { name: 'RX 11 De-noise', vendor: 'iZotope', format: 'vst3', path: '/Library/Audio/Plug-Ins/VST3/iZotope RX 11.vst3', category: 'Restoration' },
    { name: 'RX 11 Voice De-noise', vendor: 'iZotope', format: 'ara', path: '/Library/Audio/Plug-Ins/VST3/iZotope RX 11.vst3', category: 'ARA Restoration' },
    { name: 'Waves NS1', vendor: 'Waves', format: 'vst3', path: '/Library/Audio/Plug-Ins/VST3/Waves NS1.vst3', category: 'Noise Suppression' },
    { name: 'LA-2A Compressor', vendor: 'Universal Audio', format: 'au', path: '/Library/Audio/Plug-Ins/Components/UAD LA-2A.component', category: 'Dynamics' },
    { name: 'SSL Channel Strip', vendor: 'Waves', format: 'vst3', path: '/Library/Audio/Plug-Ins/VST3/Waves SSL.vst3', category: 'Channel Strip' },
    { name: 'Descript (ARA)', vendor: 'Descript', format: 'ara', path: '/Library/Audio/Plug-Ins/VST3/Descript.vst3', category: 'ARA Editing' },
  ];
}

const formatColors: Record<string, string> = {
  vst3: '#4A9EFF',
  vst2: '#FF922B',
  au: '#CC5DE8',
  ara: '#20C997',
  builtin: 'var(--bg-lighter)',
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '4px',
  },
  plugin: {
    background: 'var(--bg-medium)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  pluginHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 6px',
    background: 'var(--bg-light)',
  },
  formatBadge: {
    padding: '2px 5px',
    borderRadius: 2,
    fontSize: 8,
    fontWeight: 700,
    color: 'white',
  },
  pluginName: {
    flex: 1,
    fontSize: 11,
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  enableBtn: {
    fontSize: 9,
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: 3,
    background: 'var(--accent-green)',
    color: 'white',
  },
  removeBtn: {
    width: 18,
    height: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    fontSize: 14,
  },
  pluginParams: {
    padding: '4px 6px',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  param: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  paramLabel: {
    fontSize: 10,
    color: 'var(--text-muted)',
    width: 60,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  paramSlider: {
    flex: 1,
    height: 4,
    accentColor: 'var(--accent-blue)',
  },
  paramValue: {
    fontSize: 10,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
    width: 28,
    textAlign: 'right' as const,
  },
};
