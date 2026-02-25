import React, { useState } from 'react';
import { v4 as uuid } from 'uuid';
import type { CustomerPreset, DeliveryFormat } from '../../types';
import { useDAWStore } from '../../store/useDAWStore';

interface CustomerPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerPresetModal: React.FC<CustomerPresetModalProps> = ({ isOpen, onClose }) => {
  const { addCustomerPreset, templates } = useDAWStore();

  const [clientName, setClientName] = useState('');
  const [templateId, setTemplateId] = useState(templates[0]?.id || '');
  const [loudnessTarget, setLoudnessTarget] = useState(-16);
  const [format, setFormat] = useState<DeliveryFormat['format']>('mp3');
  const [sampleRate, setSampleRate] = useState(48000);
  const [channels, setChannels] = useState<1 | 2>(2);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleCreate = () => {
    const template = templates.find(t => t.id === templateId);
    if (!template || !clientName.trim()) return;

    const preset: CustomerPreset = {
      id: uuid(),
      clientName: clientName.trim(),
      template: { ...template },
      brandColors: ['#4A9EFF'],
      loudnessTarget,
      deliveryFormat: {
        format,
        sampleRate,
        channels,
        loudnessStandard: 'podcast',
      },
      notes,
    };

    addCustomerPreset(preset);
    onClose();
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h3 style={styles.title}>New Customer Preset</h3>

        <div style={styles.field}>
          <label style={styles.label}>Client Name</label>
          <input
            style={styles.input}
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            placeholder="e.g. Acme Corp Podcast"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Base Template</label>
          <select
            style={styles.input}
            value={templateId}
            onChange={e => setTemplateId(e.target.value)}
          >
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Loudness Target (LUFS)</label>
            <input
              type="number"
              style={styles.input}
              value={loudnessTarget}
              onChange={e => setLoudnessTarget(Number(e.target.value))}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Format</label>
            <select style={styles.input} value={format} onChange={e => setFormat(e.target.value as DeliveryFormat['format'])}>
              <option value="wav">WAV</option>
              <option value="mp3">MP3</option>
              <option value="flac">FLAC</option>
              <option value="aac">AAC</option>
            </select>
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Sample Rate</label>
            <select style={styles.input} value={sampleRate} onChange={e => setSampleRate(Number(e.target.value))}>
              <option value={44100}>44.1 kHz</option>
              <option value={48000}>48 kHz</option>
              <option value={96000}>96 kHz</option>
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Channels</label>
            <select style={styles.input} value={channels} onChange={e => setChannels(Number(e.target.value) as 1 | 2)}>
              <option value={1}>Mono</option>
              <option value={2}>Stereo</option>
            </select>
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Intro Audio</label>
          <button style={styles.uploadBtn}>Choose Intro File...</button>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Outro Audio</label>
          <button style={styles.uploadBtn}>Choose Outro File...</button>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Notes</label>
          <textarea
            style={{ ...styles.input, height: 60, resize: 'vertical' as const }}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Delivery instructions, brand guidelines, etc."
          />
        </div>

        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={styles.createBtn} onClick={handleCreate}>Create Preset</button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: 440,
    maxHeight: '80vh',
    overflow: 'auto',
    background: 'var(--bg-dark)',
    border: '1px solid var(--border-medium)',
    borderRadius: 12,
    padding: '24px',
    boxShadow: 'var(--shadow-lg)',
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 16,
  },
  field: {
    marginBottom: 12,
    flex: 1,
  },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    background: 'var(--bg-medium)',
    border: '1px solid var(--border-medium)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    fontSize: 12,
  },
  row: {
    display: 'flex',
    gap: 12,
  },
  uploadBtn: {
    width: '100%',
    padding: '8px 10px',
    background: 'var(--bg-medium)',
    border: '1px dashed var(--border-medium)',
    borderRadius: 6,
    color: 'var(--text-secondary)',
    fontSize: 11,
  },
  actions: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  cancelBtn: {
    padding: '8px 16px',
    borderRadius: 6,
    background: 'var(--bg-medium)',
    color: 'var(--text-secondary)',
    fontSize: 12,
  },
  createBtn: {
    padding: '8px 16px',
    borderRadius: 6,
    background: 'var(--accent-blue)',
    color: 'white',
    fontWeight: 600,
    fontSize: 12,
  },
};
