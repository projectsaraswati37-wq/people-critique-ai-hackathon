export interface SpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice | null;
}

class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private enabled = true;
  private queue: Array<{ text: string; resolve: () => void }> = [];
  private speaking = false;
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private onSpeakingChange: ((speaking: boolean) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      // Voices may load async
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Prefer a deep/robotic-sounding English voice
    const preferred = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.toLowerCase().includes('daniel') ||
          v.name.toLowerCase().includes('alex') ||
          v.name.toLowerCase().includes('fred') ||
          v.name.toLowerCase().includes('google uk') ||
          v.name.toLowerCase().includes('microsoft david') ||
          v.name.toLowerCase().includes('microsoft mark') ||
          v.name.toLowerCase().includes('microsoft zira'))
    );
    this.preferredVoice = preferred || voices.find((v) => v.lang.startsWith('en')) || null;
  }

  isSupported(): boolean {
    return this.synth !== null;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  setOnSpeakingChange(cb: (speaking: boolean) => void) {
    this.onSpeakingChange = cb;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  speak(text: string, options: SpeechOptions = {}): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth || !this.enabled) {
        resolve();
        return;
      }
      this.queue.push({ text, resolve });
      if (!this.speaking) {
        this.processQueue(options);
      }
    });
  }

  private processQueue(options: SpeechOptions = {}) {
    if (this.queue.length === 0) {
      this.speaking = false;
      this.onSpeakingChange?.(false);
      return;
    }
    const { text, resolve } = this.queue.shift()!;
    this.speaking = true;
    this.onSpeakingChange?.(true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate ?? 0.88;
    utterance.pitch = options.pitch ?? 0.7;
    utterance.volume = options.volume ?? 1;
    utterance.voice = options.voice ?? this.preferredVoice;

    utterance.onend = () => {
      resolve();
      this.processQueue(options);
    };
    utterance.onerror = () => {
      resolve();
      this.processQueue(options);
    };

    try {
      this.synth!.speak(utterance);
    } catch {
      resolve();
      this.processQueue(options);
    }
  }

  stop() {
    this.queue = [];
    this.speaking = false;
    this.onSpeakingChange?.(false);
    try {
      this.synth?.cancel();
    } catch {
      // ignore
    }
  }

  pause() {
    try {
      this.synth?.pause();
    } catch {
      // ignore
    }
  }

  resume() {
    try {
      this.synth?.resume();
    } catch {
      // ignore
    }
  }
}

export const speechService = new SpeechService();

export function speakSequence(lines: string[], delayBetween = 200): Promise<void> {
  return lines.reduce((promise, line) => {
    return promise.then(() => {
      return new Promise<void>((res) => {
        speechService.speak(line).then(() => {
          setTimeout(res, delayBetween);
        });
      });
    });
  }, Promise.resolve());
}
