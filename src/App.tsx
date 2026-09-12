import React, { useState, useCallback } from 'react';
import Home from './pages/Home';
import Scanner from './pages/Scanner';
import AnalysisResults from './components/AnalysisResults';
import type { HumanAnalysis, AppScreen } from './types/analysis';
import { generateHumanAnalysis } from './utils/analysisGenerator';
import { speechService } from './utils/speech';

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>('HOME');
  const [capturedImage, setCapturedImage] = useState<string>('');
  const [analysis, setAnalysis] = useState<HumanAnalysis | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [scanCount, setScanCount] = useState(0);
  const [demoMode, setDemoMode] = useState(false);

  const handleVoiceToggle = useCallback(() => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    speechService.setEnabled(next);
    if (!next) speechService.stop();
  }, [voiceEnabled]);

  const handleStart = useCallback((demo = false) => {
    setDemoMode(demo);
    speechService.stop();
    setScreen('CAMERA');
  }, []);

  const handleCaptureDone = useCallback((imageDataUrl: string) => {
    setCapturedImage(imageDataUrl);
    const result = generateHumanAnalysis(demoMode);
    setAnalysis(result);
    setScanCount((c) => c + 1);
    setScreen('RESULTS');
  }, [demoMode]);

  const handleScanAgain = useCallback(() => {
    speechService.stop();
    setAnalysis(null);
    setCapturedImage('');
    setScreen('CAMERA');
  }, []);

  const handleHome = useCallback(() => {
    speechService.stop();
    setAnalysis(null);
    setCapturedImage('');
    setScreen('HOME');
  }, []);

  const handleCancel = useCallback(() => {
    speechService.stop();
    setScreen('HOME');
  }, []);

  return (
    <div className="min-h-screen bg-cyber-bg">
      {screen === 'HOME' && (
        <Home
          voiceEnabled={voiceEnabled}
          onVoiceToggle={handleVoiceToggle}
          onStart={handleStart}
          scanCount={scanCount}
        />
      )}
      {(screen === 'CAMERA' || screen === 'SCANNING') && (
        <Scanner
          voiceEnabled={voiceEnabled}
          onCaptureDone={handleCaptureDone}
          onCancel={handleCancel}
        />
      )}
      {screen === 'RESULTS' && analysis && (
        <AnalysisResults
          analysis={analysis}
          imageDataUrl={capturedImage}
          voiceEnabled={voiceEnabled}
          onVoiceToggle={handleVoiceToggle}
          onScanAgain={handleScanAgain}
          onHome={handleHome}
        />
      )}
    </div>
  );
};

export default App;
