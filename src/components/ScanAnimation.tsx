import React, { useEffect, useState, useRef } from 'react';
import { DIAGNOSTIC_MESSAGES } from '../utils/analysisGenerator';
import TerminalLog from './TerminalLog';

interface ScanAnimationProps {
  imageDataUrl: string;
  onComplete: () => void;
}

const ScanAnimation: React.FC<ScanAnimationProps> = ({ imageDataUrl, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [messages, setMessages] = useState<string[]>([DIAGNOSTIC_MESSAGES[0].text]);
  const [done, setDone] = useState(false);
  const calledComplete = useRef(false);

  const TOTAL_DURATION = DIAGNOSTIC_MESSAGES[DIAGNOSTIC_MESSAGES.length - 1].delay + 600;

  useEffect(() => {
    // Progress bar
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / TOTAL_DURATION) * 100));
      setProgress(pct);
      if (pct >= 100) clearInterval(interval);
    }, 50);

    // Messages
    const timers: ReturnType<typeof setTimeout>[] = [];
    DIAGNOSTIC_MESSAGES.forEach((msg, i) => {
      if (i === 0) return; // already shown
      const t = setTimeout(() => {
        setMessages((prev) => [...prev, msg.text]);
        if (i === DIAGNOSTIC_MESSAGES.length - 1) {
          setDone(true);
          if (!calledComplete.current) {
            calledComplete.current = true;
            setTimeout(onComplete, 900);
          }
        }
      }, msg.delay);
      timers.push(t);
    });

    return () => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="flex flex-col items-center min-h-screen bg-cyber-bg px-4 py-6">
      {/* Title */}
      <div className="text-center mb-4">
        <div className="text-xs font-mono tracking-widest mb-1" style={{ color: '#00d4ff' }}>
          PEOPLECRITIQUE AI
        </div>
        <h2 className="text-lg font-mono font-bold tracking-wider" style={{ color: '#00ff88' }}>
          {done ? '✓ ANALYSIS COMPLETE' : 'SCANNING...'}
        </h2>
      </div>

      {/* Image with scan overlay */}
      <div className="relative w-full max-w-sm rounded-xl overflow-hidden mb-4" style={{ aspectRatio: '3/4' }}>
        <img
          src={imageDataUrl}
          alt="scan subject"
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* Dark tint */}
        <div className="absolute inset-0" style={{ background: 'rgba(0,10,30,0.45)' }} />

        {/* Corner brackets */}
        <div className="corner-bracket corner-tl" style={{ top: 12, left: 12, width: 32, height: 32 }} />
        <div className="corner-bracket corner-tr" style={{ top: 12, right: 12, width: 32, height: 32 }} />
        <div className="corner-bracket corner-bl" style={{ bottom: 12, left: 12, width: 32, height: 32 }} />
        <div className="corner-bracket corner-br" style={{ bottom: 12, right: 12, width: 32, height: 32 }} />

        {/* Scan line */}
        {!done && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="scan-line" />
          </div>
        )}

        {/* Analysis grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,212,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.06) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Face box */}
        <div
          className="absolute"
          style={{
            top: '15%', left: '25%', right: '25%', height: '45%',
            border: '1px solid rgba(0,255,136,0.6)',
            boxShadow: '0 0 10px rgba(0,255,136,0.3)',
          }}
        >
          <span
            className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-mono px-1"
            style={{ color: '#00ff88', background: '#050a14' }}
          >
            SUBJECT
          </span>
        </div>

        {/* Progress overlay */}
        <div
          className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-2"
          style={{ background: 'linear-gradient(transparent, rgba(0,10,20,0.9))' }}
        >
          <div className="flex justify-between text-xs font-mono mb-1" style={{ color: '#00d4ff' }}>
            <span>ANALYSIS</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: '#1a3a5c' }}>
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${progress}%`,
                background: done
                  ? '#00ff88'
                  : 'linear-gradient(90deg, #00d4ff, #00ff88)',
                boxShadow: '0 0 8px rgba(0,212,255,0.6)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Terminal log */}
      <div className="w-full max-w-sm">
        <TerminalLog messages={messages} maxHeight="180px" />
      </div>

      {/* Scan ID */}
      <div className="mt-3 text-xs font-mono opacity-30">
        SCAN ID: {Math.random().toString(36).slice(2, 10).toUpperCase()}
      </div>
    </div>
  );
};

export default ScanAnimation;
