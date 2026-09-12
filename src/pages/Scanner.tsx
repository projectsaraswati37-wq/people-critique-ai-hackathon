import React, { useEffect, useRef, useState } from 'react';
import CameraScanner from '../components/CameraScanner';
import ScanAnimation from '../components/ScanAnimation';
import { speechService } from '../utils/speech';

type ScannerPhase = 'CAMERA' | 'SCANNING';

interface ScannerProps {
  voiceEnabled: boolean;
  onCaptureDone: (imageDataUrl: string) => void;
  onCancel: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ voiceEnabled, onCaptureDone, onCancel }) => {
  const [phase, setPhase] = useState<ScannerPhase>('CAMERA');
  const [capturedImage, setCapturedImage] = useState<string>('');

  // Guard: prevent the init greeting from firing more than once per mount.
  const initSpokenRef = useRef(false);
  // Track all scan-phase timers so we can cancel them if the component unmounts early.
  const scanTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!initSpokenRef.current && voiceEnabled && speechService.isSupported()) {
      initSpokenRef.current = true;
      speechService.speak(
        'Human scanner initialized. Please position yourself inside the scanning area.'
      );
    }

    return () => {
      // Cancel every pending scan-phase timer on unmount.
      scanTimersRef.current.forEach(clearTimeout);
      scanTimersRef.current = [];
      // Stop any in-progress speech so it doesn't bleed into the next screen.
      speechService.stop();
    };
  }, []); // run exactly once on mount

  const handleCapture = (imageDataUrl: string) => {
    setCapturedImage(imageDataUrl);
    setPhase('SCANNING');

    if (voiceEnabled && speechService.isSupported()) {
      // Stop the init greeting if it's still talking, then queue the scan lines.
      speechService.stop();

      const scanLines = [
        'Human detected.',
        'Beginning advanced analysis.',
        'Analyzing facial geometry.',
        'Calculating aura levels.',
        'Checking main character energy.',
        'Analyzing N P C probability.',
        'Scanning future career trajectory.',
      ];

      // Use the speech queue directly rather than raw setTimeouts so lines don't
      // double-fire if the component re-renders while a timer is pending.
      const speakScanSequence = async () => {
        for (let i = 0; i < scanLines.length; i++) {
          await speechService.speak(scanLines[i]);
          if (i === scanLines.length - 2) {
            await speechService.speak('Interesting.');
          }
        }
        await speechService.speak('Future trajectory unavailable.');
      };

      speakScanSequence();
    }
  };

  const handleScanComplete = () => {
    // Cancel any leftover scan timers before handing control to the results screen.
    scanTimersRef.current.forEach(clearTimeout);
    scanTimersRef.current = [];
    onCaptureDone(capturedImage);
  };

  if (phase === 'CAMERA') {
    return (
      <CameraScanner
        onCapture={handleCapture}
        onCancel={onCancel}
      />
    );
  }

  return (
    <ScanAnimation
      imageDataUrl={capturedImage}
      onComplete={handleScanComplete}
    />
  );
};

export default Scanner;
