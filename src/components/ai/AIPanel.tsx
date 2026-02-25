import React, { useState } from 'react';
import { useDAWStore } from '../../store/useDAWStore';
import { getAIService } from '../../ai/AIService';
import { URLDownloadPanel } from './URLDownloadPanel';

export const AIPanel: React.FC = () => {
  const {
    view, aiAnalysis, aiProcessing, aiProgress,
    setAIProcessing, setAIAnalysis,
    applySuggestedCut, applyAllSuggestedCuts, dismissSuggestedCut,
    autopilotEnabled, toggleAutopilot,
    addMarker,
  } = useDAWStore();

  const [statusText, setStatusText] = useState('Ready');
  const [activeSection, setActiveSection] = useState<string | null>(null);

  if (!view.showAIPanel) return null;

  const aiService = getAIService();
  const patternCount = aiService.getPatternCount();
  const confidence = aiService.getAutopilotConfidence();

  const handleAnalyze = async () => {
    setAIProcessing(true, 0);
    setStatusText('Starting analysis...');

    const audioCtx = new AudioContext();
    const sampleRate = 48000;
    const duration = 60;
    const buffer = audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
    const channelData = buffer.getChannelData(0);

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
      const stats = [
        `${analysis.fillerWords.length} fillers`,
        `${analysis.breathRegions.length} breaths`,
        `${analysis.repetitions.length} repetitions`,
        `${analysis.speakers.length} speakers`,
        `${analysis.chapters.length} chapters`,
      ].join(', ');
      setStatusText(`Found: ${stats}`);

      // Auto-add chapter markers
      for (const ch of analysis.chapters) {
        addMarker(ch.startTime, ch.title, 'chapter');
      }
    } catch (err) {
      setStatusText('Analysis failed');
      setAIProcessing(false, 0);
    }

    audioCtx.close();
  };

  const pendingCuts = aiAnalysis?.suggestedCuts.filter(c => !c.applied) || [];
  const appliedCuts = aiAnalysis?.suggestedCuts.filter(c => c.applied) || [];

  const cutsByType = {
    filler: pendingCuts.filter(c => c.type === 'filler'),
    silence: pendingCuts.filter(c => c.type === 'silence'),
    noise: pendingCuts.filter(c => c.type === 'noise'),
    breath: pendingCuts.filter(c => c.type === 'breath'),
    stutter: pendingCuts.filter(c => c.type === 'stutter'),
  };

  const toggleSection = (id: string) => setActiveSection(prev => prev === id ? null : id);

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
        {/* URL Download */}
        <URLDownloadPanel />

        {/* Quick Actions */}
        <div style={styles.section}>
          <button style={styles.primaryBtn} onClick={handleAnalyze} disabled={aiProcessing}>
            {aiProcessing ? `Analyzing... ${aiProgress}%` : 'Analyze Audio'}
          </button>

          {aiProcessing && (
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${aiProgress}%` }} />
            </div>
          )}
          <p style={styles.statusText}>{statusText}</p>
        </div>

        {/* AI Features Grid */}
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>AI Features</h4>
          <div style={styles.featureGrid}>
            {[
              { icon: '🎙', name: 'Detect Fillers', desc: 'um, uh, like...' },
              { icon: '📝', name: 'Transcribe', desc: 'Auto transcript' },
              { icon: '🔊', name: 'Level Match', desc: 'LUFS normalization' },
              { icon: '🔇', name: 'De-Noise', desc: 'Remove noise' },
              { icon: '🫁', name: 'Breath Removal', desc: 'Detect & remove' },
              { icon: '🗣', name: 'Diarization', desc: 'Who speaks when' },
              { icon: '📑', name: 'Chapters', desc: 'Auto-chapters' },
              { icon: '📋', name: 'Show Notes', desc: 'AI summary' },
              { icon: '🔁', name: 'Stutters', desc: 'Find repeats' },
              { icon: '🎭', name: 'Sentiment', desc: 'Energy timeline' },
              { icon: '🎛', name: 'Voice EQ', desc: 'Per-speaker EQ' },
              { icon: '✂️', name: 'Auto-Crossfade', desc: 'Smart fades' },
            ].map((feature, i) => (
              <button key={i} style={styles.featureBtn}>
                <span style={{ fontSize: 14 }}>{feature.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 10 }}>{feature.name}</div>
                  <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>{feature.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Speakers */}
        {aiAnalysis && aiAnalysis.speakers.length > 0 && (
          <div style={styles.section}>
            <button style={styles.collapseHeader} onClick={() => toggleSection('speakers')}>
              <h4 style={styles.sectionTitle}>
                Speakers ({aiAnalysis.speakers.length})
              </h4>
              <span style={styles.chevron}>{activeSection === 'speakers' ? '▾' : '▸'}</span>
            </button>
            {activeSection === 'speakers' && (
              <div style={styles.speakerList}>
                {aiAnalysis.speakers.map(speaker => (
                  <div key={speaker.id} style={styles.speakerCard}>
                    <div style={{ ...styles.speakerDot, background: speaker.color }} />
                    <div style={styles.speakerInfo}>
                      <div style={styles.speakerName}>{speaker.label}</div>
                      <div style={styles.speakerMeta}>
                        {Math.round(speaker.totalSpeakingTime)}s speaking ·
                        {speaker.voiceProfile.pitchMean}Hz avg pitch
                      </div>
                      <div style={styles.eqSuggestion}>
                        EQ: {speaker.voiceProfile.suggestedEQ.name}
                      </div>
                    </div>
                    <button style={styles.applyEQBtn}>Apply EQ</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chapters */}
        {aiAnalysis && aiAnalysis.chapters.length > 0 && (
          <div style={styles.section}>
            <button style={styles.collapseHeader} onClick={() => toggleSection('chapters')}>
              <h4 style={styles.sectionTitle}>
                Chapters ({aiAnalysis.chapters.length})
              </h4>
              <span style={styles.chevron}>{activeSection === 'chapters' ? '▾' : '▸'}</span>
            </button>
            {activeSection === 'chapters' && (
              <div style={styles.chapterList}>
                {aiAnalysis.chapters.map(ch => (
                  <div key={ch.id} style={styles.chapterItem}>
                    <span style={styles.chapterTime}>
                      {String(Math.floor(ch.startTime / 60)).padStart(2, '0')}:
                      {String(Math.floor(ch.startTime % 60)).padStart(2, '0')}
                    </span>
                    <div style={styles.chapterInfo}>
                      <div style={styles.chapterTitle}>{ch.title}</div>
                      {ch.keywords.length > 0 && (
                        <div style={styles.chapterKeywords}>
                          {ch.keywords.map((k, i) => (
                            <span key={i} style={styles.keyword}>{k}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Show Notes */}
        {aiAnalysis?.summary && (
          <div style={styles.section}>
            <button style={styles.collapseHeader} onClick={() => toggleSection('summary')}>
              <h4 style={styles.sectionTitle}>Show Notes</h4>
              <span style={styles.chevron}>{activeSection === 'summary' ? '▾' : '▸'}</span>
            </button>
            {activeSection === 'summary' && (
              <div style={styles.summaryCard}>
                <div style={styles.summaryTitle}>{aiAnalysis.summary.title}</div>
                <p style={styles.summaryText}>{aiAnalysis.summary.shortSummary}</p>
                <div style={styles.tagRow}>
                  {aiAnalysis.summary.suggestedTags.map((tag, i) => (
                    <span key={i} style={styles.tag}>#{tag}</span>
                  ))}
                </div>
                <button style={styles.copyBtn}>Copy Show Notes</button>
              </div>
            )}
          </div>
        )}

        {/* Suggested Edits by Type */}
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

            {/* Type tabs */}
            <div style={styles.cutTypeTabs}>
              {(Object.entries(cutsByType) as [string, typeof pendingCuts][]).map(([type, cuts]) => (
                cuts.length > 0 && (
                  <div key={type} style={styles.cutTypeGroup}>
                    <div style={{
                      ...styles.cutTypeHeader,
                      color: type === 'filler' ? 'var(--accent-red)'
                        : type === 'silence' ? 'var(--accent-yellow)'
                        : type === 'breath' ? 'var(--accent-teal)'
                        : type === 'stutter' ? 'var(--accent-orange)'
                        : 'var(--accent-purple)',
                    }}>
                      {type} ({cuts.length})
                    </div>
                    {cuts.slice(0, 8).map(cut => (
                      <div key={cut.id} style={styles.cutItem}>
                        <div style={styles.cutInfo}>
                          <span style={styles.cutReason}>{cut.reason}</span>
                          <span style={styles.cutTime}>
                            {cut.startTime.toFixed(1)}s - {cut.endTime.toFixed(1)}s
                          </span>
                        </div>
                        <div style={styles.cutActions}>
                          <button style={styles.cutApplyBtn} onClick={() => applySuggestedCut(cut.id)}>
                            ✓
                          </button>
                          <button style={styles.cutDismissBtn} onClick={() => dismissSuggestedCut(cut.id)}>
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Applied count */}
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
              {[
                { label: 'Integrated', value: `${aiAnalysis.loudnessProfile.integrated.toFixed(1)} LUFS` },
                { label: 'True Peak', value: `${aiAnalysis.loudnessProfile.truePeak.toFixed(1)} dBTP` },
                { label: 'Range', value: `${aiAnalysis.loudnessProfile.range.toFixed(1)} LU` },
              ].map((item, i) => (
                <div key={i} style={styles.loudnessItem}>
                  <span style={styles.loudnessLabel}>{item.label}</span>
                  <span style={styles.loudnessValue}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sentiment Timeline */}
        {aiAnalysis && aiAnalysis.sentimentTimeline.length > 0 && (
          <div style={styles.section}>
            <button style={styles.collapseHeader} onClick={() => toggleSection('sentiment')}>
              <h4 style={styles.sectionTitle}>Sentiment & Energy</h4>
              <span style={styles.chevron}>{activeSection === 'sentiment' ? '▾' : '▸'}</span>
            </button>
            {activeSection === 'sentiment' && (
              <div style={styles.sentimentContainer}>
                <svg width="100%" height="50" viewBox={`0 0 ${aiAnalysis.sentimentTimeline.length * 12} 50`}>
                  {aiAnalysis.sentimentTimeline.map((point, i) => (
                    <g key={i}>
                      {/* Energy bar */}
                      <rect
                        x={i * 12}
                        y={50 - point.energy * 40}
                        width={10}
                        height={point.energy * 40}
                        fill={point.sentiment > 0.2 ? 'rgba(81,207,102,0.4)'
                          : point.sentiment < -0.2 ? 'rgba(255,107,107,0.4)'
                          : 'rgba(74,158,255,0.3)'}
                        rx={2}
                      />
                      {/* Sentiment dot */}
                      <circle
                        cx={i * 12 + 5}
                        cy={25 - point.sentiment * 20}
                        r={3}
                        fill={point.sentiment > 0.2 ? 'var(--accent-green)'
                          : point.sentiment < -0.2 ? 'var(--accent-red)'
                          : 'var(--accent-blue)'}
                      />
                    </g>
                  ))}
                  {/* Center line */}
                  <line x1={0} y1={25} x2={aiAnalysis.sentimentTimeline.length * 12} y2={25}
                    stroke="var(--border-medium)" strokeDasharray="2,2" />
                </svg>
                <div style={styles.sentimentLegend}>
                  <span style={{ color: 'var(--accent-green)', fontSize: 9 }}>Positive</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>Neutral</span>
                  <span style={{ color: 'var(--accent-red)', fontSize: 9 }}>Negative</span>
                </div>
              </div>
            )}
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
              <span style={styles.statItem}>Patterns: {patternCount}</span>
              <span style={styles.statItem}>Confidence: {(confidence * 100).toFixed(0)}%</span>
            </div>
            <div style={styles.progressBar}>
              <div style={{
                ...styles.progressFill,
                width: `${confidence * 100}%`,
                background: confidence > 0.7 ? 'var(--accent-green)'
                  : confidence > 0.4 ? 'var(--accent-yellow)' : 'var(--accent-red)',
              }} />
            </div>
            <p style={styles.helpText}>
              {patternCount < 10 ? 'Keep editing to teach the AI your style...'
                : patternCount < 50 ? 'Learning your editing patterns...'
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
    width: 8, height: 8, borderRadius: '50%', transition: 'background 0.3s',
  },
  content: {
    flex: 1, overflow: 'auto', padding: '8px',
  },
  section: { marginBottom: 12 },
  sectionHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
    textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: 6,
  },
  primaryBtn: {
    width: '100%', padding: '10px 16px',
    background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
    color: 'white', fontWeight: 600, fontSize: 13,
    borderRadius: 6, transition: 'opacity 0.15s', marginBottom: 8,
  },
  progressBar: {
    height: 4, background: 'var(--bg-darkest)', borderRadius: 2,
    overflow: 'hidden', marginBottom: 4,
  },
  progressFill: {
    height: '100%', background: 'var(--accent-blue)', borderRadius: 2,
    transition: 'width 0.3s',
  },
  statusText: {
    fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' as const,
  },
  featureGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3,
  },
  featureBtn: {
    display: 'flex', alignItems: 'center', gap: 4, padding: '6px',
    background: 'var(--bg-medium)', borderRadius: 4,
    textAlign: 'left' as const, transition: 'background 0.12s',
  },
  collapseHeader: {
    width: '100%', display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '4px 0', cursor: 'pointer',
  },
  chevron: { fontSize: 10, color: 'var(--text-muted)' },
  speakerList: { display: 'flex', flexDirection: 'column', gap: 4 },
  speakerCard: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
    background: 'var(--bg-medium)', borderRadius: 4,
  },
  speakerDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  speakerInfo: { flex: 1, minWidth: 0 },
  speakerName: { fontSize: 11, fontWeight: 600 },
  speakerMeta: { fontSize: 9, color: 'var(--text-muted)' },
  eqSuggestion: {
    fontSize: 9, color: 'var(--accent-teal)', fontStyle: 'italic',
  },
  applyEQBtn: {
    padding: '3px 8px', fontSize: 9, fontWeight: 600,
    background: 'var(--bg-lighter)', borderRadius: 3,
    color: 'var(--accent-teal)', flexShrink: 0,
  },
  chapterList: { display: 'flex', flexDirection: 'column', gap: 3 },
  chapterItem: {
    display: 'flex', gap: 8, padding: '4px 6px',
    background: 'var(--bg-medium)', borderRadius: 4, cursor: 'pointer',
  },
  chapterTime: {
    fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--accent-yellow)',
    flexShrink: 0, width: 36,
  },
  chapterInfo: { flex: 1, minWidth: 0 },
  chapterTitle: { fontSize: 11, fontWeight: 600 },
  chapterKeywords: { display: 'flex', gap: 3, marginTop: 2, flexWrap: 'wrap' as const },
  keyword: {
    padding: '1px 4px', background: 'var(--bg-lighter)', borderRadius: 2,
    fontSize: 8, color: 'var(--text-muted)',
  },
  summaryCard: {
    padding: '8px', background: 'var(--bg-medium)', borderRadius: 6,
  },
  summaryTitle: { fontSize: 12, fontWeight: 600, marginBottom: 4 },
  summaryText: { fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 },
  tagRow: { display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' as const },
  tag: {
    padding: '2px 6px', background: 'rgba(74,158,255,0.1)', borderRadius: 3,
    fontSize: 9, color: 'var(--accent-blue)',
  },
  copyBtn: {
    width: '100%', padding: '6px', fontSize: 10, fontWeight: 600,
    background: 'var(--bg-lighter)', borderRadius: 4, color: 'var(--text-secondary)',
  },
  cutTypeTabs: { display: 'flex', flexDirection: 'column', gap: 6 },
  cutTypeGroup: { marginBottom: 4 },
  cutTypeHeader: {
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const,
    letterSpacing: '0.3px', marginBottom: 3,
  },
  applyAllBtn: {
    padding: '3px 8px', fontSize: 10, fontWeight: 600,
    background: 'var(--accent-green)', color: 'white', borderRadius: 4,
  },
  cutItem: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px',
    background: 'var(--bg-medium)', borderRadius: 3, marginBottom: 2,
  },
  cutInfo: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  cutReason: {
    fontSize: 10, color: 'var(--text-primary)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  cutTime: { fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' },
  cutActions: { display: 'flex', gap: 2, flexShrink: 0 },
  cutApplyBtn: {
    width: 20, height: 20, borderRadius: 3,
    background: 'rgba(81,207,102,0.15)', color: 'var(--accent-green)',
    fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  cutDismissBtn: {
    width: 20, height: 20, borderRadius: 3,
    background: 'rgba(255,107,107,0.15)', color: 'var(--accent-red)',
    fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  appliedBanner: {
    padding: '6px 12px', background: 'rgba(81,207,102,0.1)',
    border: '1px solid rgba(81,207,102,0.2)', borderRadius: 4,
    fontSize: 11, color: 'var(--accent-green)', textAlign: 'center' as const,
    marginBottom: 12,
  },
  loudnessGrid: { display: 'flex', gap: 4 },
  loudnessItem: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '6px', background: 'var(--bg-medium)', borderRadius: 4,
  },
  loudnessLabel: { fontSize: 9, color: 'var(--text-muted)' },
  loudnessValue: {
    fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600,
    color: 'var(--text-primary)',
  },
  sentimentContainer: { padding: '4px', background: 'var(--bg-medium)', borderRadius: 4 },
  sentimentLegend: {
    display: 'flex', justifyContent: 'space-between', padding: '4px 8px',
  },
  autopilotCard: { padding: '8px', background: 'var(--bg-medium)', borderRadius: 6 },
  autopilotRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8, fontSize: 12, fontWeight: 500,
  },
  toggleSwitch: {
    width: 36, height: 20, borderRadius: 10, padding: 2,
    transition: 'background 0.2s', display: 'flex', alignItems: 'center',
  },
  toggleKnob: {
    width: 16, height: 16, borderRadius: '50%', background: 'white',
    transition: 'transform 0.2s',
  },
  autopilotStats: {
    display: 'flex', justifyContent: 'space-between', marginBottom: 6,
  },
  statItem: { fontSize: 10, color: 'var(--text-muted)' },
  helpText: {
    fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 6,
  },
};
