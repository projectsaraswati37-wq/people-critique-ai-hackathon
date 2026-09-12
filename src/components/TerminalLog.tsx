import React, { useEffect, useRef } from 'react';

interface TerminalLogProps {
  messages: string[];
  maxHeight?: string;
}

const TerminalLog: React.FC<TerminalLogProps> = ({ messages, maxHeight = '160px' }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div
      className="rounded border text-xs font-mono p-3 overflow-y-auto"
      style={{
        maxHeight,
        background: 'rgba(0,10,20,0.8)',
        borderColor: '#1a3a5c',
      }}
    >
      {messages.map((msg, i) => (
        <div
          key={i}
          className="mb-1 leading-relaxed"
          style={{
            color: msg.includes('✓') || msg.includes('COMPLETE')
              ? '#00ff88'
              : msg.includes('ERROR') || msg.includes('FAILED') || msg.includes('NOT')
              ? '#ff8844'
              : msg.includes('WARNING')
              ? '#ffaa00'
              : '#00d4ff',
            opacity: i === messages.length - 1 ? 1 : 0.7,
          }}
        >
          <span className="opacity-50 mr-2 text-green-400">›</span>
          {msg}
          {i === messages.length - 1 && (
            <span className="blink ml-1 opacity-80">_</span>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default TerminalLog;
