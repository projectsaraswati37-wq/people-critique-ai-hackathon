import React, { useEffect, useRef, useState } from 'react';

interface CameraScannerProps {
  onCapture: (imageDataUrl: string) => void;
  onCancel: () => void;
}

const CameraScanner: React.FC<CameraScannerProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [scanning, setScanning] = useState(false);

  const startCamera = async () => {
    setCameraError(null);
    setReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setReady(true);
        };
      }
    } catch (err) {
      const e = err as Error;
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setCameraError('PERMISSION_DENIED');
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        setCameraError('NO_CAMERA');
      } else {
        setCameraError('UNKNOWN');
      }
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current || !ready) return;
    setScanning(true);
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      // Stop stream then hand off
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setTimeout(() => onCapture(dataUrl), 300);
    }
  };

  // ── Error screens ──
  if (cameraError) {
    const messages: Record<string, { title: string; body: string }> = {
      PERMISSION_DENIED: {
        title: 'CAMERA ACCESS DENIED',
        body: "Even the camera doesn't want to participate.",
      },
      NO_CAMERA: {
        title: 'NO CAMERA DETECTED',
        body: 'This device appears to be camera-shy.',
      },
      UNKNOWN: {
        title: 'CAMERA CONNECTION FAILED',
        body: 'An unknown anomaly has prevented scanning.',
      },
    };
    const msg = messages[cameraError] ?? messages.UNKNOWN;
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center gap-6">
        <div
          className="rounded-xl border p-8 max-w-md w-full"
          style={{ borderColor: '#ff3366', background: 'rgba(255,51,102,0.08)' }}
        >
          <div className="text-4xl mb-4">📷</div>
          <h2 className="text-xl font-mono font-bold text-red-400 mb-3">{msg.title}</h2>
          <p className="text-sm font-mono mb-1" style={{ color: '#8aaccc' }}>{msg.body}</p>
          <p className="text-xs font-mono opacity-50 mb-6">ERROR: CAMERA MODULE OFFLINE</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={startCamera}
              className="px-6 py-3 rounded border border-cyan-400 text-cyan-400 font-mono text-sm hover:bg-cyan-400/10 transition-all"
            >
              RETRY
            </button>
            <button
              onClick={onCancel}
              className="px-6 py-3 rounded border text-sm font-mono transition-all hover:opacity-70"
              style={{ borderColor: '#1a3a5c', color: '#4a6a8c' }}
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-cyber-bg">
      {/* Header */}
      <div className="w-full px-4 pt-4 pb-2 flex items-center justify-between max-w-lg">
        <div>
          <div className="text-xs font-mono text-cyan-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" style={{ animation: 'blink 1s step-start infinite' }} />
            HUMAN SCANNER ACTIVE
          </div>
          <div className="text-xs font-mono opacity-40 mt-0.5">Position yourself inside the frame.</div>
        </div>
        <button
          onClick={onCancel}
          className="text-xs font-mono px-3 py-1.5 rounded border transition-all hover:opacity-70"
          style={{ borderColor: '#1a3a5c', color: '#4a6a8c' }}
        >
          CANCEL
        </button>
      </div>

      {/* Camera view */}
      <div className="relative w-full max-w-lg flex-1 flex items-center justify-center px-4">
        <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '3/4', background: '#000' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />

          {/* Scanning corners */}
          <div className="corner-bracket corner-tl" style={{ top: 16, left: 16 }} />
          <div className="corner-bracket corner-tr" style={{ top: 16, right: 16 }} />
          <div className="corner-bracket corner-bl" style={{ bottom: 16, left: 16 }} />
          <div className="corner-bracket corner-br" style={{ bottom: 16, right: 16 }} />

          {/* Scanning line */}
          {ready && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="scan-line" />
            </div>
          )}

          {/* Loading overlay */}
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center">
                <div className="text-cyan-400 font-mono text-sm animate-pulse">INITIALIZING SCANNER...</div>
              </div>
            </div>
          )}

          {/* HUD overlays */}
          {ready && (
            <>
              <div
                className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded text-xs font-mono"
                style={{ background: 'rgba(0,212,255,0.12)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.3)' }}
              >
                FACE DETECTION ACTIVE
              </div>
              <div
                className="absolute bottom-4 right-4 text-xs font-mono"
                style={{ color: 'rgba(0,212,255,0.6)' }}
              >
                LIVE
              </div>
            </>
          )}

          {scanning && (
            <div className="absolute inset-0 bg-cyan-400/20 flex items-center justify-center">
              <div className="text-cyan-300 font-mono text-lg animate-pulse">CAPTURING...</div>
            </div>
          )}
        </div>
      </div>

      {/* Capture button */}
      <div className="w-full max-w-lg px-4 py-6 flex flex-col gap-3">
        <button
          onClick={handleCapture}
          disabled={!ready || scanning}
          className="w-full py-4 rounded-xl font-mono font-bold text-lg tracking-widest transition-all duration-200 disabled:opacity-40"
          style={{
            background: ready && !scanning
              ? 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,255,136,0.15))'
              : 'rgba(0,212,255,0.05)',
            border: '2px solid',
            borderColor: ready && !scanning ? '#00d4ff' : '#1a3a5c',
            color: ready && !scanning ? '#00d4ff' : '#4a6a8c',
            boxShadow: ready && !scanning ? '0 0 20px rgba(0,212,255,0.25)' : 'none',
          }}
        >
          {scanning ? '⚡ CAPTURING...' : '⚡ SCAN HUMAN'}
        </button>

        <p className="text-center text-xs font-mono opacity-30">
          Images are processed locally and are not stored.
        </p>
      </div>
    </div>
  );
};

export default CameraScanner;
