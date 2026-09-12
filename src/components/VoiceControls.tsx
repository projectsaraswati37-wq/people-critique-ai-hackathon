import React from 'react';
import { speechService } from '../utils/speech';

interface VoiceControlsProps {
  voiceEnabled: boolean;
  speaking: boolean;
  onToggle: () => void;
  onStop: () => void;
}

const VoiceControls: React.FC<VoiceControlsProps> = ({ voiceEnabled, speaking, onToggle, onStop }) => {
  const supported = speechService.isSupported();

  if (!supported) {
    return (
      <div className="flex items-center gap-2 text-xs text-yellow-400 font-mono opacity-70">
        <span>⚠</span>
        <span>VOICE MODULE OFFLINE</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggle}
        title={voiceEnabled ? 'Mute voice' : 'Unmute voice'}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono transition-all duration-200"
        style={{
          borderColor: voiceEnabled ? '#00d4ff' : '#1a3a5c',
          color: voiceEnabled ? '#00d4ff' : '#4a6a8c',
          background: voiceEnabled ? 'rgba(0,212,255,0.08)' : 'transparent',
        }}
      >
        <span className="text-sm">{voiceEnabled ? '🔊' : '🔇'}</span>
        <span>{voiceEnabled ? 'VOICE ON' : 'VOICE OFF'}</span>
      </button>

      {speaking && voiceEnabled && (
        <button
          onClick={onStop}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-red-500 text-red-400 text-xs font-mono hover:bg-red-500/10 transition-all"
        >
          <span>⏹</span>
          <span>STOP</span>
        </button>
      )}
    </div>
  );
};

export default VoiceControls;
