import React, { useState } from 'react';
import { useDAWStore } from '../../store/useDAWStore';
import { getAIService } from '../../ai/AIService';

export const AIPanel: React.FC = () => {
  const {
    view, aiAnalysis, aiProcessing, aiProgress,
    setAIProcessing, setAIAnalysis,
    applySuggestedCut, applyAllSuggestedCuts, dismissSuggestedCut,
    autopilotEnabled, toggleAutopilot,
  } = useDAWStore();

  const [statusText, setStatusText] = useState('Ready');

  if (!view.showAIPanel) return null;

  const aiService = getAIService();
  const patternCount = aiService.getPatternCount();
  const confidence = aiService.getAutopilotConfidence();

  const handleAnalyze = async () => {
    setAIProcessing(true, 0);
    setStatusText('Starting analysis...');

    // Create a demo AudioBuffer for the prototype
    const audioCtx = new AudioContext();
    const sampleRate = 48000;
    const duration = 60; // 1 minute demo
    const buffer = audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
    const channelData = buffer.getChannelData(0);

    // Generate demo waveform (speech-like with pauses)
    for (let i = 0; i < channelData.length; i++) {
      const t = i / sampleRate;
      const speechEnvelope = Math.sin(t * 0.5) * 0.5 + 0.5;
      const pauses = Math.sin(t * 2) > 0.3 ? 1 : 0.02;
      channelData[i] = (Math.random() * 2 - 1) * 0.3 * speechEnvelope * pauses;
    }

    try {
      const analysis = await aiService.analyzeAudio(buffer, (progress, status) => {
        setAIProcessing(true, progress);
        setStatusText(status);
      });
      setAIAnalysis(analysis);
      setStatusText(`Found ${analysis.fillerWords.length} filler words, ${analysis.suggestedCuts.length} suggested edits`);
    } catch (err) {
      setStatusText('Analysis failed');
      setAIProcessing(false, 0);
    }

    audioCtx.close();
  };

  const pendingCuts = aiAnalysis?.suggestedCuts.filter(c => !c.applied) || [];
  const appliedCuts = aiAnalysis?.suggestedCuts.filter(c => c.applied) || [];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>AI Assistant</span>
        <div style={{
          ...styles.statusDot,
          background: aiProcessing ? 'var(--accent-yellow)' : aiAnalysis ? 'var(--accent-green)' : 'var(--text-muted)',
        }} />
      </div>

      <div style={styles.content}>
        {/* Quick Actions */}
        <div style={styles.section}>
          <button style={styles.primaryBtn} onClick={handleAnalyze} disabled={aiProcessing}>
            {aiProcessing ? 'Analyzing...' : 'Analyze Audio'}
          </button>

          {aiProcessing && (
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${aiProgress}%` }} />
            </div>
          )}

          <p style={styles.statusText}>{statusText}</p>
        </div>

        {/* AI Features */}
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>AI Features</h4>
          <div style={styles.featureGrid}>
            {[
              { icon: '🎙', name: 'Detect Fillers', desc: 'Find um, uh, like...', color: 'var(--accent-red)' },
              { icon: '📝', name: 'Transcribe', desc: 'Auto transcription', color: 'var(--accent-blue)' },
              { icon: '🔊', name: 'Level Match', desc: 'Normalize loudness', color: 'var(--accent-green)' },
              { icon: '🔇', name: 'De-Noise', desc: 'Remove background noise', color: 'var(--accent-purple)' },
            ].map((feature, i) => (
              <button key={i} style={styles.featureBtn}>
                <span style={{ fontSize: 16 }}>{feature.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 11 }}>{feature.name}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{feature.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Suggested Edits */}
        {aiAnalysis && pendingCuts.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h4 style={styles.sectionTitle}>
                Suggested Edits ({pendingCuts.length})
              </h4>
              <button style={styles.applyAllBtn} onClick={applyAllSuggestedCuts}>
                Apply All
              </button>
            </div>
            <div style={styles.cutList}>
              {pendingCuts.slice(0, 20).map(cut => (
                <div key={cut.id} style={styles.cutItem}>
                  <div style={{
                    ...styles.cutTypeBadge,
                    background: cut.type === 'filler' ? 'rgba(255,107,107,0.15)'
                      : cut.type === 'silence' ? 'rgba(255,212,59,0.15)'
                      : 'rgba(204,93,232,0.15)',
                    color: cut.type === 'filler' ? 'var(--accent-red)'
                      : cut.type === 'silence' ? 'var(--accent-yellow)'
                      : 'var(--accent-purple)',
                  }}>
                    {cut.type}
                  </div>
                  <div style={styles.cutInfo}>
                    <span style={styles.cutReason}>{cut.reason}</span>
                    <span style={styles.cutTime}>
                      {cut.startTime.toFixed(1)}s - {cut.endTime.toFixed(1)}s
                    </span>
                  </div>
                  <div style={styles.cutActions}>
                    <button
                      style={styles.cutApplyBtn}
                      onClick={() => applySuggestedCut(cut.id)}
                    >
                      ✓
                    </button>
                    <button
                      style={styles.cutDismissBtn}
                      onClick={() => dismissSuggestedCut(cut.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Applied edits counter */}
        {appliedCuts.length > 0 && (
          <div style={styles.appliedBanner}>
            {appliedCuts.length} edit{appliedCuts.length !== 1 ? 's' : ''} applied
          </div>
        )}

        {/* Loudness Info */}
        {aiAnalysis?.loudnessProfile && (
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>Loudness</h4>
            <div style={styles.loudnessGrid}>
              <div style={styles.loudnessItem}>
                <span style={styles.loudnessLabel}>Integrated</span>
                <span style={styles.loudnessValue}>
                  {aiAnalysis.loudnessProfile.integrated.toFixed(1)} LUFS
                </span>
              </div>
              <div style={styles.loudnessItem}>
                <span style={styles.loudnessLabel}>True Peak</span>
                <span style={styles.loudnessValue}>
                  {aiAnalysis.loudnessProfile.truePeak.toFixed(1)} dBTP
                </span>
              </div>
              <div style={styles.loudnessItem}>
                <span style={styles.loudnessLabel}>Range</span>
                <span style={styles.loudnessValue}>
                  {aiAnalysis.loudnessProfile.range.toFixed(1)} LU
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Autopilot */}
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Autopilot</h4>
          <div style={styles.autopilotCard}>
            <div style={styles.autopilotRow}>
              <span>Autopilot Mode</span>
              <button
                style={{
                  ...styles.toggleSwitch,
                  background: autopilotEnabled ? 'var(--accent-green)' : 'var(--bg-lighter)',
                }}
                onClick={toggleAutopilot}
              >
                <div style={{
                  ...styles.toggleKnob,
                  transform: autopilotEnabled ? 'translateX(16px)' : 'translateX(0)',
                }} />
              </button>
            </div>
            <div style={styles.autopilotStats}>
              <span style={styles.statItem}>Patterns learned: {patternCount}</span>
              <span style={styles.statItem}>
                Confidence: {(confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div style={styles.progressBar}>
              <div style={{
                ...styles.progressFill,
                width: `${confidence * 100}%`,
                background: confidence > 0.7
                  ? 'var(--accent-green)'
                  : confidence > 0.4
                  ? 'var(--accent-yellow)'
                  : 'var(--accent-red)',
              }} />
            </div>
            <p style={styles.helpText}>
              {patternCount < 10
                ? 'Keep editing to teach the AI your style...'
                : patternCount < 50
                ? 'Learning your editing patterns...'
                : 'Ready for autonomous editing!'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: 'var(--sidebar-width)',
    minWidth: 280,
    background: 'var(--bg-dark)',
    borderLeft: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    background: 'var(--bg-medium)',
    borderBottom: '1px solid var(--border-subtle)',
    flexShrink: 0,
  },
  title: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    transition: 'background 0.3s',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '8px',
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: 6,
  },
  primaryBtn: {
    width: '100%',
    padding: '10px 16px',
    background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
    color: 'white',
    fontWeight: 600,
    fontSize: 13,
    borderRadius: 6,
    transition: 'opacity 0.15s',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    background: 'var(--bg-darkest)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    background: 'var(--accent-blue)',
    borderRadius: 2,
    transition: 'width 0.3s',
  },
  statusText: {
    fontSize: 11,
    color: 'var(--text-muted)',
    textAlign: 'center' as const,
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 4,
  },
  featureBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px',
    background: 'var(--bg-medium)',
    borderRadius: 6,
    textAlign: 'left' as const,
    transition: 'background 0.12s',
  },
  applyAllBtn: {
    padding: '3px 8px',
    fontSize: 10,
    fontWeight: 600,
    background: 'var(--accent-green)',
    color: 'white',
    borderRadius: 4,
  },
  cutList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    maxHeight: 200,
    overflow: 'auto',
  },
  cutItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 6px',
    background: 'var(--bg-medium)',
    borderRadius: 4,
  },
  cutTypeBadge: {
    padding: '2px 6px',
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    flexShrink: 0,
  },
  cutInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  cutReason: {
    fontSize: 11,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cutTime: {
    fontSize: 9,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
  },
  cutActions: {
    display: 'flex',
    gap: 2,
    flexShrink: 0,
  },
  cutApplyBtn: {
    width: 22,
    height: 22,
    borderRadius: 3,
    background: 'rgba(81,207,102,0.15)',
    color: 'var(--accent-green)',
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cutDismissBtn: {
    width: 22,
    height: 22,
    borderRadius: 3,
    background: 'rgba(255,107,107,0.15)',
    color: 'var(--accent-red)',
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appliedBanner: {
    padding: '6px 12px',
    background: 'rgba(81,207,102,0.1)',
    border: '1px solid rgba(81,207,102,0.2)',
    borderRadius: 4,
    fontSize: 11,
    color: 'var(--accent-green)',
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  loudnessGrid: {
    display: 'flex',
    gap: 4,
  },
  loudnessItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '6px',
    background: 'var(--bg-medium)',
    borderRadius: 4,
  },
  loudnessLabel: {
    fontSize: 9,
    color: 'var(--text-muted)',
  },
  loudnessValue: {
    fontSize: 12,
    fontFamily: 'var(--font-mono)',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  autopilotCard: {
    padding: '8px',
    background: 'var(--bg-medium)',
    borderRadius: 6,
  },
  autopilotRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    fontSize: 12,
    fontWeight: 500,
  },
  toggleSwitch: {
    width: 36,
    height: 20,
    borderRadius: 10,
    padding: 2,
    transition: 'background 0.2s',
    display: 'flex',
    alignItems: 'center',
  },
  toggleKnob: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: 'white',
    transition: 'transform 0.2s',
  },
  autopilotStats: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statItem: {
    fontSize: 10,
    color: 'var(--text-muted)',
  },
  helpText: {
    fontSize: 10,
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    marginTop: 6,
  },
};
