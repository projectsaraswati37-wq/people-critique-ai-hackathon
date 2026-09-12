import React, { useEffect, useRef, useState } from 'react';
import AIOrb from '../components/AIOrb';
import VoiceControls from '../components/VoiceControls';
import { speechService } from '../utils/speech';

interface HomeProps {
  voiceEnabled: boolean;
  onVoiceToggle: () => void;
  onStart: (demo?: boolean) => void;
  scanCount: number;
}

// ── Floating particle ──────────────────────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
}

function randomParticles(n: number): Particle[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 3,
    duration: Math.random() * 3 + 2,
    opacity: Math.random() * 0.5 + 0.1,
  }));
}

const Home: React.FC<HomeProps> = ({ voiceEnabled, onVoiceToggle, onStart, scanCount }) => {
  const [speaking, setSpeaking] = useState(false);
  const particles = useRef(randomParticles(25)).current;
  const [uptime, setUptime] = useState(0);
  const [demoMode, setDemoMode] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    speechService.setOnSpeakingChange(setSpeaking);

    const interval = setInterval(() => setUptime((u) => u + 1), 1000);

    // Guard: only speak the welcome message once per mount.
    if (!startedRef.current && voiceEnabled && speechService.isSupported()) {
      startedRef.current = true;
      setTimeout(() => {
        speechService.speak(
          "Welcome to PeopleCritique A I. The world's most unnecessary human analysis system."
        );
      }, 600);
    }

    return () => {
      clearInterval(interval);
      // Stop any in-progress welcome speech when navigating away.
      speechService.stop();
    };
  }, []); // run exactly once on mount

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-between overflow-hidden scanlines grid-bg">

      {/* Floating particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: '#00d4ff',
            opacity: p.opacity,
            animation: `floatUp ${p.duration}s ease-in ${p.delay}s infinite`,
          }}
        />
      ))}

      {/* Status bar */}
      <div className="w-full max-w-lg px-4 pt-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400" style={{ animation: 'blink 2s step-start infinite' }} />
          <span className="text-xs font-mono text-green-400">ONLINE</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono opacity-40">UPTIME {formatUptime(uptime)}</span>
          <VoiceControls
            voiceEnabled={voiceEnabled}
            speaking={speaking}
            onToggle={onVoiceToggle}
            onStop={() => speechService.stop()}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 z-10 w-full max-w-lg">
        {/* AI Orb */}
        <div className="mb-6 pulse-ring rounded-full">
          <AIOrb speaking={speaking} size="lg" />
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <div className="text-xs font-mono tracking-[0.4em] mb-2 opacity-60" style={{ color: '#00d4ff' }}>
            ◆ ADVANCED HUMAN ANALYSIS SYSTEM ◆
          </div>
          <h1
            className="font-mono font-black tracking-[0.15em] mb-3"
            style={{
              fontSize: 'clamp(1.6rem, 8vw, 2.8rem)',
              color: '#00d4ff',
              textShadow: '0 0 20px rgba(0,212,255,0.6), 0 0 60px rgba(0,212,255,0.2)',
              lineHeight: 1.1,
            }}
          >
            PEOPLECRITIQUE
            <span style={{ color: '#00ff88', textShadow: '0 0 20px rgba(0,255,136,0.6)' }}> AI</span>
          </h1>
          <p className="font-mono text-sm opacity-60 mb-1">
            The world's most unnecessary human analysis system.
          </p>
          <p className="font-mono text-xs opacity-40 italic">
            "Because apparently we needed AI for this."
          </p>
        </div>

        {/* CTA button */}
        <button
          onClick={() => onStart()}
          className="w-full max-w-sm py-5 rounded-xl font-mono font-bold text-xl tracking-widest transition-all duration-300 mb-4 glow-blue"
          style={{
            background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,255,136,0.1))',
            border: '2px solid #00d4ff',
            color: '#00d4ff',
            boxShadow: '0 0 30px rgba(0,212,255,0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 50px rgba(0,212,255,0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 0 30px rgba(0,212,255,0.3)';
          }}
        >
          ⚡ INITIALIZE HUMAN SCANNER
        </button>

        {/* Demo mode toggle */}
        <button
          onClick={() => {
            const newDemo = !demoMode;
            setDemoMode(newDemo);
            onStart(newDemo);
          }}
          className="text-xs font-mono opacity-30 hover:opacity-60 transition-opacity mb-6 underline underline-offset-2"
          style={{ color: '#ffaa00' }}
        >
          {demoMode ? '[ DEMO MODE ACTIVE — CLICK TO START ]' : '[ DEMO MODE ]'}
        </button>

        {/* Stats row */}
        <div className="flex gap-6 text-center mb-6">
          {[
            { label: 'SCANS TODAY', value: scanCount.toString().padStart(3, '0') },
            { label: 'ACCURACY', value: '±∞%' },
            { label: 'USEFULNESS', value: '0%' },
          ].map((s) => (
            <div key={s.label}>
              <div className="font-mono font-bold text-lg" style={{ color: '#00d4ff' }}>{s.value}</div>
              <div className="text-xs font-mono opacity-40 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Feature chips */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {['NPC DETECTION', 'AURA SCAN', 'FUTURE PREDICTION', 'DRIP ANALYSIS', 'THREAT ASSESSMENT'].map((f) => (
            <span
              key={f}
              className="text-xs font-mono px-2.5 py-1 rounded-full border"
              style={{ borderColor: '#1a3a5c', color: '#4a6a8c', background: 'rgba(0,20,40,0.5)' }}
            >
              {f}
            </span>
          ))}
        </div>

        {/* Disclaimer */}
        <div
          className="text-center text-xs font-mono py-3 px-4 rounded-lg border max-w-sm"
          style={{ borderColor: '#1a3a5c', color: '#4a6a8c', background: 'rgba(0,10,20,0.6)' }}
        >
          ⚠ For entertainment purposes only. Results are completely unnecessary.
          <br />
          <span className="opacity-50">This system cannot determine any real characteristics.</span>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full px-4 pb-6 text-center z-10">
        <div className="text-xs font-mono opacity-30">
          AI HUMAN ANALYSIS SYSTEM v2.7.4 • Human Analysis Division
        </div>
        <div className="text-xs font-mono opacity-20 mt-1">
          © PeopleCritique AI — No humans were harmed in the making of this analysis.
        </div>
      </div>

      {/* Corner HUD decorations */}
      <div
        className="absolute top-0 left-0 w-32 h-32 pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle at top left, rgba(0,212,255,0.3), transparent 70%)',
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-32 h-32 pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle at bottom right, rgba(0,255,136,0.2), transparent 70%)',
        }}
      />
    </div>
  );
};

export default Home;
