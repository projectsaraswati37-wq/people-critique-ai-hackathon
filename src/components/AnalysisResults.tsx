import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { HumanAnalysis } from '../types/analysis';
import AIOrb from './AIOrb';
import VoiceControls from './VoiceControls';
import { speechService } from '../utils/speech';

// ─────────────────────────────────────────────────────────────────────────────
// Reveal phase lifecycle
// 'locked'   → not yet announced: shows ???, dim
// 'scanning' → setup phrase being spoken: shows ANALYZING..., highlighted
// 'glitch'   → value phrase started: glitch animation plays, count-up begins
// 'revealed' → fully visible, count-up still running to target
// ─────────────────────────────────────────────────────────────────────────────
type StatPhase = 'locked' | 'scanning' | 'glitch' | 'revealed';

const ALL_KEYS = [
  'npcLevel', 'aura', 'mainCharacterEnergy', 'dripLevel',
  'threatLevel', 'luck', 'sideCharacterEnergy',
  'futureCareer', 'verdict', 'overallScore',
] as const;
type StatKey = typeof ALL_KEYS[number];

// ─────────────────────────────────────────────────────────────────────────────
// SegBar — fills when animate becomes true
// ─────────────────────────────────────────────────────────────────────────────
function SegBar({
  pct, color, active, animate, segments = 18,
}: {
  pct: number; color: string; active: boolean; animate: boolean; segments?: number;
}) {
  const [filled, setFilled] = useState(0);

  useEffect(() => {
    let raf: number;
    if (!animate) { setFilled(0); return; }
    const target = Math.round((Math.min(100, Math.max(0, pct)) / 100) * segments);
    let current = 0;
    const tick = () => {
      current = Math.min(current + 1, target);
      setFilled(current);
      if (current < target) raf = requestAnimationFrame(tick);
    };
    // Tiny delay so the glitch renders first
    const id = setTimeout(() => { raf = requestAnimationFrame(tick); }, 40);
    return () => { clearTimeout(id); cancelAnimationFrame(raf); };
  }, [animate, pct, segments]);

  return (
    <div className="flex gap-[2px] mt-1.5">
      {Array.from({ length: segments }, (_, i) => (
        <div
          key={i}
          className="h-[5px] flex-1 rounded-sm transition-colors duration-75"
          style={{
            background: i < filled ? color : 'rgba(255,255,255,0.07)',
            boxShadow: active && i < filled ? `0 0 4px ${color}bb` : 'none',
          }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AnimCount — starts counting as soon as it mounts (animate=true always)
// The count-up duration is tuned to roughly match a 1-3 word value phrase
// ─────────────────────────────────────────────────────────────────────────────
function AnimCount({
  target, prefix = '', suffix = '', decimals = 0, durationMs = 950,
}: {
  target: number; prefix?: string; suffix?: string; decimals?: number; durationMs?: number;
}) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (target === Infinity) { setVal(Infinity); return; }
    setVal(0);
    const start = Date.now();
    let raf: number;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = target * eased;
      setVal(decimals > 0 ? parseFloat(cur.toFixed(decimals)) : Math.round(cur));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, decimals]);

  if (target === Infinity) return <>∞</>;
  return <>{prefix}{decimals > 0 ? val.toFixed(decimals) : val}{suffix}</>;
}

// ─────────────────────────────────────────────────────────────────────────────
// StatRow
// ─────────────────────────────────────────────────────────────────────────────
function StatRow({
  icon, label, type, numValue, textValue, color, phase,
}: {
  icon: string; label: string;
  type: 'percent' | 'signed-number' | 'text';
  numValue?: number; textValue?: string;
  color: string; phase: StatPhase;
}) {
  const isRevealed = phase === 'revealed';
  const isGlitch   = phase === 'glitch';
  const isScanning = phase === 'scanning';
  const isLocked   = phase === 'locked';
  const isActive   = isScanning || isGlitch;
  // Start animating count-up as soon as glitch fires (not just when 'revealed')
  const shouldAnimate = isGlitch || isRevealed;

  // RevealedValue mounts fresh when shouldAnimate first becomes true
  // → AnimCount starts from zero immediately, synchronized with the value phrase
  const RevealedValue = () => (
    <span
      key={`rv-${phase}`}
      className={isGlitch ? 'glitch-unlock' : ''}
      style={{ color: '#fff', textShadow: `0 0 10px ${color}` }}
    >
      {type === 'percent' && numValue !== undefined && (
        <AnimCount target={numValue} suffix="%" />
      )}
      {type === 'signed-number' && numValue !== undefined && (
        numValue === Infinity
          ? '∞'
          : <AnimCount target={Math.abs(numValue)} prefix={numValue >= 0 ? '+' : '-'} />
      )}
      {type === 'text' && textValue}
    </span>
  );

  return (
    <div
      className="rounded px-3 py-2 transition-all duration-200"
      style={{
        background: isActive
          ? `${color}15`
          : shouldAnimate
          ? 'rgba(255,255,255,0.025)'
          : 'rgba(0,0,0,0.25)',
        borderLeft: `2px solid ${
          isActive ? color : shouldAnimate ? `${color}35` : '#111c2e'
        }`,
        boxShadow: isActive ? `0 0 16px ${color}22` : 'none',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-xs shrink-0"
            style={{ color: isActive ? color : shouldAnimate ? `${color}77` : '#172030' }}
          >
            {icon}
          </span>
          <span
            className="text-xs font-mono tracking-widest truncate"
            style={{ color: isActive ? '#bddeff' : shouldAnimate ? '#3d5a78' : '#172030' }}
          >
            {label}
          </span>
        </div>

        <div className="font-mono font-bold text-sm shrink-0">
          {(isLocked || isScanning) && (
            <span
              className={isScanning ? 'scan-blink' : 'classified-flicker'}
              style={{ color: isScanning ? color : '#1a2a3a' }}
            >
              {isScanning ? 'ANALYZING...' : '???'}
            </span>
          )}
          {shouldAnimate && <RevealedValue />}
        </div>
      </div>

      {type === 'percent' && numValue !== undefined && (
        <SegBar
          pct={numValue}
          color={color}
          active={isActive}
          animate={shouldAnimate}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel
// ─────────────────────────────────────────────────────────────────────────────
function Panel({
  title, accent = '#00d4ff', children, className = '',
}: {
  title: string; accent?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div
      className={`rounded-xl border flex flex-col ${className}`}
      style={{ borderColor: `${accent}33`, background: 'rgba(5,12,24,0.88)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b rounded-t-xl"
        style={{ borderColor: `${accent}22`, background: `${accent}09` }}
      >
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: accent, boxShadow: `0 0 6px ${accent}` }} />
        <span className="text-xs font-mono tracking-[0.22em] font-bold" style={{ color: `${accent}cc` }}>
          {title}
        </span>
      </div>
      <div className="flex-1 p-3">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CareerCard
// ─────────────────────────────────────────────────────────────────────────────
function CareerCard({ career, phase }: { career: string; phase: StatPhase }) {
  const show     = phase === 'revealed' || phase === 'glitch';
  const scanning = phase === 'scanning';

  return (
    <div className="flex flex-col items-center text-center py-3 gap-3">
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl transition-all duration-300"
        style={{
          background: show ? 'rgba(255,170,0,0.1)' : 'rgba(0,0,0,0.3)',
          border: `1px solid ${show ? 'rgba(255,170,0,0.3)' : '#111c2e'}`,
        }}
      >
        {show ? '📋' : <span className="lock-pulse text-xl" style={{ color: '#172030' }}>🔒</span>}
      </div>

      <div>
        <div className="text-xs font-mono mb-2 tracking-widest" style={{ color: '#2a4a6a' }}>
          ASSIGNED CLASS
        </div>
        {show ? (
          <div
            className={`font-mono font-bold text-lg leading-snug ${phase === 'glitch' ? 'glitch-unlock' : ''}`}
            style={{ color: '#ffaa00', textShadow: '0 0 14px rgba(255,170,0,0.5)' }}
          >
            {career.toUpperCase()}
          </div>
        ) : (
          <div
            className={scanning ? 'scan-blink' : 'classified-flicker'}
            style={{ color: scanning ? '#ffaa00' : '#172030', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1rem' }}
          >
            {scanning ? 'PROCESSING...' : 'CAREER CLASSIFIED'}
          </div>
        )}
      </div>

      <div
        className="px-4 py-1.5 rounded-full border text-xs font-mono tracking-widest transition-all duration-300"
        style={
          show
            ? { borderColor: '#00ff8844', color: '#00ff88', background: 'rgba(0,255,136,0.08)' }
            : { borderColor: '#111c2e', color: '#172030' }
        }
      >
        {show ? '✓ STATUS: CONFIRMED' : 'STATUS: PENDING'}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VerdictCard
// ─────────────────────────────────────────────────────────────────────────────
function VerdictCard({ verdict, phase, speaking }: { verdict: string; phase: StatPhase; speaking: boolean }) {
  const show     = phase === 'revealed' || phase === 'glitch';
  const scanning = phase === 'scanning';

  return (
    <div className="flex flex-col items-center text-center py-3 gap-3">
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300"
        style={{
          background: show ? 'rgba(136,68,255,0.12)' : 'rgba(0,0,0,0.3)',
          border: `1px solid ${show ? 'rgba(136,68,255,0.3)' : '#111c2e'}`,
        }}
      >
        <AIOrb speaking={speaking && scanning} size="sm" />
      </div>

      <div>
        <div className="text-xs font-mono mb-2 tracking-widest" style={{ color: '#2a4a6a' }}>
          SYSTEM ASSESSMENT
        </div>
        {show ? (
          <div
            className={`font-mono italic text-base leading-relaxed ${phase === 'glitch' ? 'glitch-unlock' : ''}`}
            style={{ color: '#d0e8ff' }}
          >
            "{verdict}"
          </div>
        ) : (
          <div
            className={scanning ? 'scan-blink' : 'classified-flicker'}
            style={{ color: scanning ? '#8844ff' : '#172030', fontFamily: 'monospace', fontWeight: 'bold' }}
          >
            {scanning ? 'FORMULATING...' : 'ANALYSIS CLASSIFIED'}
          </div>
        )}
      </div>

      {show && <div className="text-xs font-mono opacity-25">— PeopleCritique AI v2.7.4</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ScoreSection
// ─────────────────────────────────────────────────────────────────────────────
function ScoreSection({ score, accent, phase }: { score: number; accent: string; phase: StatPhase }) {
  const show     = phase === 'revealed' || phase === 'glitch';
  const scanning = phase === 'scanning';

  return (
    <div className="p-6 flex flex-col items-center gap-4">
      <div className="flex items-baseline gap-2">
        {show ? (
          <div
            className={`font-mono font-black ${phase === 'glitch' ? 'glitch-unlock score-pop' : 'score-pop'}`}
            style={{
              fontSize: 'clamp(3rem, 10vw, 5rem)',
              color: accent,
              lineHeight: 1,
              textShadow: `0 0 30px ${accent}99`,
            }}
          >
            {/* AnimCount mounts fresh here → starts from 0 → counts up while value phrase plays */}
            <AnimCount target={score} decimals={1} durationMs={1100} />
          </div>
        ) : (
          <div
            className={`font-mono font-black ${scanning ? 'scan-blink' : 'classified-flicker'}`}
            style={{
              fontSize: 'clamp(3rem, 10vw, 5rem)',
              color: scanning ? accent : '#1a2a3a',
              lineHeight: 1,
            }}
          >
            {scanning ? '...' : '???'}
          </div>
        )}
        <div className="font-mono font-bold text-2xl opacity-30" style={{ color: accent }}>/ 10</div>
      </div>

      <div className="w-full max-w-sm">
        <SegBar pct={(score / 10) * 100} color={accent} active={scanning} animate={show} segments={20} />
      </div>

      <div className="text-xs font-mono opacity-30 tracking-widest">
        SCIENTIFIC ACCURACY: QUESTIONABLE
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
interface AnalysisResultsProps {
  analysis: HumanAnalysis;
  imageDataUrl: string;
  voiceEnabled: boolean;
  onVoiceToggle: () => void;
  onScanAgain: () => void;
  onHome: () => void;
}

const RARITY_COLORS: Record<string, string> = {
  COMMON:    '#00d4ff',
  UNCOMMON:  '#00ff88',
  RARE:      '#aa44ff',
  LEGENDARY: '#ff8800',
};

// Glitch animation lasts 420ms; revealed phase is set after that.
const GLITCH_MS = 420;

const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  analysis, imageDataUrl, voiceEnabled, onVoiceToggle, onScanAgain, onHome,
}) => {
  const [speaking, setSpeaking] = useState(false);
  const [phases, setPhases]     = useState<Record<string, StatPhase>>({});

  const spokeForIdRef = useRef<string | null>(null);
  const mountedRef    = useRef(true);
  const seqIdRef      = useRef(0);
  const voiceRef      = useRef(voiceEnabled);

  useEffect(() => { voiceRef.current = voiceEnabled; }, [voiceEnabled]);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const accentColor = RARITY_COLORS[analysis.rarity] ?? '#00d4ff';

  const auraAbsStr =
    analysis.aura === Infinity
      ? 'infinity'
      : `${Math.abs(analysis.aura)}`;
  const auraSignStr = analysis.aura >= 0 ? 'plus' : 'minus';


  // ── Phase helpers ──────────────────────────────────────────────────────────
  const setPhase = (key: string, phase: StatPhase) => {
    if (!mountedRef.current) return;
    setPhases(prev => ({ ...prev, [key]: phase }));
  };

  /**
   * Fire-and-forget reveal trigger.
   * glitch phase starts immediately → revealed phase starts after GLITCH_MS.
   * The count-up in AnimCount begins as soon as glitch fires, running
   * concurrently with the value phrase the voice is speaking.
   */
  const triggerReveal = (key: string) => {
    if (!mountedRef.current) return;
    setPhases(prev => ({ ...prev, [key]: 'glitch' }));
    setTimeout(() => {
      if (!mountedRef.current) return;
      setPhases(prev => ({ ...prev, [key]: 'revealed' }));
    }, GLITCH_MS);
  };

  // ── Reveal sequence ────────────────────────────────────────────────────────
  const startRevealSequence = useCallback(() => {
    speechService.stop();

    // Reset all to locked
    const locked: Record<string, StatPhase> = {};
    ALL_KEYS.forEach(k => { locked[k] = 'locked'; });
    setPhases(locked);

    const mySeqId = ++seqIdRef.current;
    const alive   = () => mountedRef.current && seqIdRef.current === mySeqId;

    /**
     * speak() → say the phrase via voice, or wait a fixed duration when muted.
     * isSetupPhrase=true  → shorter wait (just the label being announced)
     * isSetupPhrase=false → longer wait (the value is being revealed during this)
     */
    const say = (text: string, isSetupPhrase = false): Promise<void> => {
      if (!alive()) return Promise.resolve();
      if (voiceRef.current && speechService.isSupported()) {
        return speechService.speak(text);
      }
      // No voice: shorter setup wait, longer value wait so animations are visible
      return new Promise(r => setTimeout(r, isSetupPhrase ? 320 : 520));
    };

    const wait = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

    (async () => {
      if (!alive()) return;

      // Opening lines (voice only)
      if (voiceRef.current && speechService.isSupported()) {
        await say('Analysis complete.');
        if (analysis.legendaryEvent) {
          await say(`Warning. ${analysis.legendaryEvent}`);
        }
      } else {
        await wait(500);
      }

      // ── Core stats ──────────────────────────────────────────────────────
      // Each entry: setup phrase (spoken while ANALYZING...) +
      //             value phrase (spoken while count-up / glitch plays)
      const statSteps: { key: StatKey; setup: string; value: string }[] = [
        {
          key:   'npcLevel',
          setup: 'N P C level:',
          value: `${analysis.npcLevel} percent.`,
        },
        {
          key:   'aura',
          setup: 'Aura:',
          value: `${auraSignStr} ${auraAbsStr}.`,
        },
        {
          key:   'mainCharacterEnergy',
          setup: 'Main character energy:',
          value: `${analysis.mainCharacterEnergy} percent.`,
        },
        {
          key:   'dripLevel',
          setup: 'Drip level:',
          value: `${analysis.dripLevel} percent.`,
        },
        {
          key:   'threatLevel',
          setup: 'Threat level:',
          value: `${analysis.threatLevel}.`,
        },
        {
          key:   'luck',
          setup: 'Luck:',
          value: `${analysis.luck >= 0 ? 'plus' : 'minus'} ${Math.abs(analysis.luck)}.`,
        },
        {
          key:   'sideCharacterEnergy',
          setup: 'Side character energy:',
          value: `${analysis.sideCharacterEnergy} percent.`,
        },
      ];

      for (const step of statSteps) {
        if (!alive()) return;

        // Show ANALYZING... while setup phrase plays
        setPhase(step.key, 'scanning');
        await say(step.setup, true);

        if (!alive()) return;

        // Trigger glitch + count-up, then say value phrase simultaneously
        triggerReveal(step.key);
        await say(step.value, false); // count-up runs during this
      }

      // ── Future Career ────────────────────────────────────────────────────
      if (!alive()) return;
      setPhase('futureCareer', 'scanning');
      await say('Future career:', true);
      if (!alive()) return;
      triggerReveal('futureCareer');
      await say(`${analysis.futureCareer}.`, false);

      // ── AI Final Verdict ─────────────────────────────────────────────────
      if (!alive()) return;
      setPhase('verdict', 'scanning');
      await say('Final verdict.', true);
      if (!alive()) return;
      triggerReveal('verdict');
      await say(analysis.verdict, false);

      // ── Overall Human Score ──────────────────────────────────────────────
      if (!alive()) return;
      setPhase('overallScore', 'scanning');
      await say('Overall human score:', true);
      if (!alive()) return;
      triggerReveal('overallScore');
      await say(`${analysis.overallScore.toFixed(1)} out of ten.`, false);

      // Closing
      if (alive() && voiceRef.current && speechService.isSupported()) {
        await wait(200);
        await say('Thank you for participating in this completely unnecessary analysis.');
      }
    })();
  }, [analysis, auraAbsStr, auraSignStr]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-start on new analysis ────────────────────────────────────────────
  useEffect(() => {
    speechService.setOnSpeakingChange(setSpeaking);

    if (spokeForIdRef.current !== analysis.id) {
      spokeForIdRef.current = analysis.id;
      startRevealSequence();
    }

    return () => {
      speechService.stop();
      spokeForIdRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis.id]);

  const getPhase = (key: string): StatPhase => phases[key] ?? 'locked';
  const allRevealed = ALL_KEYS.every(k => getPhase(k) === 'revealed');

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cyber-bg grid-bg screen-enter">

      {/* ── Header ── */}
      <div
        className="sticky top-0 z-20 border-b"
        style={{ background: 'rgba(3,7,16,0.97)', borderColor: `${accentColor}33`, backdropFilter: 'blur(8px)' }}
      >
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <div>
            <div
              className="text-xs font-mono tracking-[0.25em] font-bold"
              style={{ color: accentColor, textShadow: `0 0 8px ${accentColor}77` }}
            >
              PEOPLECRITIQUE AI
            </div>
            <div className="text-xs font-mono opacity-35 tracking-widest">
              ANALYSIS COMPLETE · {analysis.id}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <AIOrb speaking={speaking} size="sm" />
            <VoiceControls
              voiceEnabled={voiceEnabled}
              speaking={speaking}
              onToggle={onVoiceToggle}
              onStop={() => speechService.stop()}
            />
          </div>
        </div>
      </div>

      {/* ── Legendary alert ── */}
      {analysis.rarity === 'LEGENDARY' && (
        <div
          className="border-b px-4 py-3 text-center"
          style={{ background: 'rgba(255,136,0,0.08)', borderColor: '#ff880033' }}
        >
          <span className="font-mono font-bold text-orange-400 tracking-widest text-sm">
            ⚠ LEGENDARY RESULT · {analysis.legendaryEvent}
          </span>
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="max-w-5xl mx-auto px-3 py-4 pb-36">

        {/* Row 1: Character photo + Human Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">

          {/* CHARACTER PANEL */}
          <Panel title="CHARACTER PROFILE" accent={accentColor}>
            <div className="relative rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <img
                src={imageDataUrl}
                alt="Subject"
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              <div className="absolute inset-0" style={{ background: 'rgba(0,8,20,0.42)' }} />

              {(['tl','tr','bl','br'] as const).map(pos => (
                <div
                  key={pos}
                  className={`corner-bracket corner-${pos}`}
                  style={{
                    top:    pos.startsWith('t') ? 10 : undefined,
                    bottom: pos.startsWith('b') ? 10 : undefined,
                    left:   pos.endsWith('l')   ? 10 : undefined,
                    right:  pos.endsWith('r')   ? 10 : undefined,
                    width: 22, height: 22,
                  }}
                />
              ))}

              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="scan-line" />
              </div>

              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />

              <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                <div
                  className="px-2 py-0.5 rounded text-xs font-mono font-bold"
                  style={{ background: `${accentColor}1a`, border: `1px solid ${accentColor}44`, color: accentColor }}
                >
                  {analysis.isDemoMode ? 'DEMO MODE' : `RARITY: ${analysis.rarity}`}
                </div>
                <div
                  className="px-2 py-0.5 rounded text-xs font-mono"
                  style={{ background: 'rgba(0,255,136,0.15)', color: '#00ff88', border: '1px solid #00ff8833' }}
                >
                  ✓ SCAN COMPLETE
                </div>
              </div>

              <div
                className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-6"
                style={{ background: 'linear-gradient(transparent, rgba(3,7,16,0.96))' }}
              >
                <div className="text-xs font-mono opacity-40 mb-0.5">ANALYSIS ID</div>
                <div className="font-mono font-bold text-sm" style={{ color: accentColor }}>
                  {analysis.id}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="text-xs font-mono opacity-40">LVL {analysis.scanNumber} HUMAN</div>
                  <div className="text-xs font-mono opacity-30">{analysis.timestamp.toLocaleTimeString()}</div>
                </div>
              </div>
            </div>

            <div
              className="mt-2 px-3 py-2 rounded flex items-center justify-between text-xs font-mono"
              style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.09)' }}
            >
              <span style={{ color: '#2a4a6a' }}>SCAN #{analysis.scanNumber}</span>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#00ff88', boxShadow: '0 0 4px #00ff88', animation: 'scanBlink 2s ease-in-out infinite' }}
                />
                <span style={{ color: '#00ff88' }}>SUBJECT LOCKED</span>
              </div>
            </div>
          </Panel>

          {/* HUMAN STATS PANEL */}
          <Panel title="HUMAN STATS" accent="#00d4ff">
            <div className="flex flex-col gap-1.5">
              <StatRow icon="◈" label="NPC LEVEL"            type="percent"       numValue={analysis.npcLevel}            color="#ff3366" phase={getPhase('npcLevel')} />
              <StatRow icon="✦" label="AURA"                  type="signed-number" numValue={analysis.aura}                color="#8844ff" phase={getPhase('aura')} />
              <StatRow icon="★" label="MAIN CHARACTER ENERGY" type="percent"       numValue={analysis.mainCharacterEnergy} color="#00ff88" phase={getPhase('mainCharacterEnergy')} />
              <StatRow icon="◆" label="DRIP LEVEL"            type="percent"       numValue={analysis.dripLevel}           color="#ff8844" phase={getPhase('dripLevel')} />
              <StatRow icon="⚠" label="THREAT LEVEL"          type="text"          textValue={analysis.threatLevel}        color="#ff3366" phase={getPhase('threatLevel')} />
              <StatRow icon="✧" label="LUCK"                  type="signed-number" numValue={analysis.luck}                color={analysis.luck >= 0 ? '#ffdd00' : '#ff3366'} phase={getPhase('luck')} />
              <StatRow icon="◉" label="SIDE CHARACTER ENERGY" type="percent"       numValue={analysis.sideCharacterEnergy} color="#44aaff" phase={getPhase('sideCharacterEnergy')} />
            </div>
          </Panel>
        </div>

        {/* Row 2: Career + Verdict */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <Panel title="FUTURE CAREER ANALYSIS" accent="#ffaa00">
            <CareerCard career={analysis.futureCareer} phase={getPhase('futureCareer')} />
          </Panel>
          <Panel title="AI FINAL VERDICT" accent="#8844ff">
            <VerdictCard verdict={analysis.verdict} phase={getPhase('verdict')} speaking={speaking} />
          </Panel>
        </div>

        {/* Row 3: Overall Score */}
        <div
          className="rounded-xl border mb-3 overflow-hidden"
          style={{ borderColor: `${accentColor}33`, background: 'rgba(5,12,24,0.9)' }}
        >
          <div
            className="px-4 py-2.5 border-b flex items-center gap-2"
            style={{ borderColor: `${accentColor}22`, background: `${accentColor}08` }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}` }} />
            <span className="text-xs font-mono tracking-[0.22em] font-bold" style={{ color: `${accentColor}cc` }}>
              OVERALL HUMAN SCORE
            </span>
          </div>
          <ScoreSection score={analysis.overallScore} accent={accentColor} phase={getPhase('overallScore')} />
        </div>

        <div className="text-center text-xs font-mono opacity-20 mb-4">
          Images are processed locally for this demo and are not stored.
        </div>

        {/* Replay — only after full sequence completes */}
        {allRevealed && voiceEnabled && speechService.isSupported() && (
          <button
            onClick={startRevealSequence}
            className="w-full py-2.5 mb-2 rounded-lg border font-mono text-xs tracking-widest transition-all hover:opacity-80 fade-in-up"
            style={{ borderColor: '#1a3a5c', color: '#4a6a8c' }}
          >
            🔊 REPLAY ANALYSIS
          </button>
        )}
      </div>

      {/* ── Fixed bottom actions ── */}
      <div
        className="fixed bottom-0 left-0 right-0 p-4"
        style={{ background: 'linear-gradient(transparent, rgba(3,7,16,0.99) 35%)' }}
      >
        <div className="max-w-lg mx-auto flex flex-col gap-2">
          <button
            onClick={onScanAgain}
            className="w-full py-4 rounded-xl font-mono font-bold text-lg tracking-widest transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, rgba(0,212,255,0.18), rgba(0,255,136,0.12))',
              border: '2px solid #00d4ff',
              color: '#00d4ff',
              boxShadow: '0 0 25px rgba(0,212,255,0.25)',
            }}
          >
            ⚡ SCAN ANOTHER HUMAN
          </button>
          <button
            onClick={onHome}
            className="w-full py-3 rounded-xl font-mono text-sm tracking-widest transition-all hover:opacity-70"
            style={{ border: '1px solid #1a3a5c', color: '#4a6a8c' }}
          >
            RETURN TO HOME
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResults;
