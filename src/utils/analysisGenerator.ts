import type { HumanAnalysis, ThreatLevel, RarityTier } from '../types/analysis';

// ─── Data Pools ──────────────────────────────────────────────────────────────

const FUTURE_CAREERS: string[] = [
  'Professional Procrastinator',
  'Professional Scroller',
  'Full-Time Nap Specialist',
  'No Future Detected',
  'Professional Excuse Generator',
  'Chief Procrastination Officer',
  'Unemployed But Optimistic',
];

const VERDICTS: string[] = [
  'This individual appears suspiciously confident.',
  'Main character energy not detected.',
  'System recommends touching grass.',
  'This individual appears to be functioning. Barely.',
  'Confidence levels exceed skill levels.',
  'Congratulations. You passed the bare minimum.',
];




const THREAT_LEVELS: ThreatLevel[] = [
  'PUBLIC NUISANCE — APPROACH AT YOUR OWN RISK',
  'CERTIFIED MENACE',
  'THREAT LEVEL: UNNECESSARILY PROBLEMATIC',
  'ONE BAD DECISION AWAY FROM DISASTER',
  'WALKING RED FLAG',
  'ERROR 999: COMMON SENSE NOT DETECTED',
];

// ─── Legendary Events ─────────────────────────────────────────────────────────

interface LegendaryEvent {
  id: string;
  name: string;
  description: string;
  overrides: Partial<Omit<HumanAnalysis, 'id' | 'scanNumber' | 'timestamp' | 'rarity' | 'legendaryEvent' | 'isDemoMode'>>;
}

const LEGENDARY_EVENTS: LegendaryEvent[] = [
  {
    id: 'AURA_OVERLOAD',
    name: 'AURA OVERLOAD',
    description: 'WARNING: Aura levels have exceeded safe operating parameters.',
    overrides: {
      aura: Infinity,
      mainCharacterEnergy: 99,
      verdict: 'WARNING. This individual\'s aura has overloaded our sensors.',
      overallScore: 10,
    },
  },
  {
    id: 'MAIN_CHARACTER',
    name: 'MAIN CHARACTER DETECTED',
    description: 'WARNING: Main character detected.',
    overrides: {
      mainCharacterEnergy: 100,
      npcLevel: 1,
      sideCharacterEnergy: 0,
      verdict: 'Confirmed main character. The rest of us are just NPCs.',
      overallScore: 9.8,
    },
  },
  {
    id: 'SYSTEM_FAILURE',
    name: 'SYSTEM FAILURE',
    description: 'CRITICAL ERROR: This human is too powerful.',
    overrides: {
      npcLevel: 0,
      aura: 9999,
      mainCharacterEnergy: 100,
      verdict: 'ERROR 999: TOO MUCH AURA. System cannot process this individual.',
      overallScore: 10,
    },
  },
  {
    id: 'NPC_BOSS',
    name: 'NPC BOSS DETECTED',
    description: 'This is not a normal NPC.',
    overrides: {
      npcLevel: 100,
      sideCharacterEnergy: 100,
      mainCharacterEnergy: 0,
      verdict: 'NPC BOSS DETECTED. Approach with caution. Has respawn mechanic.',
      overallScore: 7.7,
    },
  },
];

// ─── Utility Helpers ─────────────────────────────────────────────────────────

let scanCounter = 0;

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 1): number {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `HUM-${part1}-${part2}`;
}

// ─── Main Generator ───────────────────────────────────────────────────────────

export function generateHumanAnalysis(demoMode = false): HumanAnalysis {
  scanCounter++;

  if (demoMode) {
    return {
      id: generateId(),
      scanNumber: scanCounter,
      timestamp: new Date(),
      npcLevel: 96,
      aura: 999,
      mainCharacterEnergy: 2,
      dripLevel: 42,
      luck: -7,
      sideCharacterEnergy: 98,
      threatLevel: 'CERTIFIED MENACE',
      futureCareer: 'Professional Procrastinator',
      verdict: 'Bro is running on demo mode.',
      overallScore: 6.9,
      rarity: 'UNCOMMON',
      isDemoMode: true,
    };
  }

  // 5% legendary chance
  const isLegendary = Math.random() < 0.05;
  const legendaryEvent = isLegendary ? pick(LEGENDARY_EVENTS) : null;

  // Base stats
  const npcLevel = rand(30, 97);
  const mainCharacterEnergy = Math.min(100, Math.max(0, 100 - npcLevel + rand(-20, 20)));
  const sideCharacterEnergy = Math.min(100, Math.max(0, npcLevel + rand(-15, 15)));
  const dripLevel = rand(10, 90);
  const luck = rand(-50, 100);
  const aura = rand(-200, 1500);

  // Correlated overall score
  const rawScore = (dripLevel * 0.25 + mainCharacterEnergy * 0.2 + luck * 0.05 + (100 - npcLevel) * 0.15) / 10;
  const overallScore = randFloat(Math.max(1.0, rawScore - 1), Math.min(10.0, rawScore + 2), 1);

  // Rarity
  let rarity: RarityTier = 'COMMON';
  if (aura > 1200 || mainCharacterEnergy > 90) rarity = 'RARE';
  else if (aura > 800 || mainCharacterEnergy > 75) rarity = 'UNCOMMON';

  // Context-aware verdict
  const verdict = pick(VERDICTS);

  const base: HumanAnalysis = {
    id: generateId(),
    scanNumber: scanCounter,
    timestamp: new Date(),
    npcLevel,
    aura,
    mainCharacterEnergy,
    dripLevel,
    luck,
    sideCharacterEnergy,
    threatLevel: pick(THREAT_LEVELS),
    futureCareer: pick(FUTURE_CAREERS),
    verdict,
    overallScore,
    rarity,
  };

  if (legendaryEvent) {
    return {
      ...base,
      ...legendaryEvent.overrides,
      rarity: 'LEGENDARY',
      legendaryEvent: legendaryEvent.description,
      aura: legendaryEvent.overrides.aura ?? base.aura,
    };
  }

  return base;
}

export const DIAGNOSTIC_MESSAGES = [
  { text: 'INITIALIZING HUMAN ANALYSIS...', delay: 0 },
  { text: 'CALIBRATING SENSORS...', delay: 400 },
  { text: 'FACE DETECTED ✓', delay: 900 },
  { text: 'CONNECTING TO AURA DATABASE...', delay: 1400 },
  { text: 'AURA DATABASE RESPONDED: "WHY?"', delay: 2000 },
  { text: 'ANALYZING FACIAL GEOMETRY...', delay: 2500 },
  { text: 'CALCULATING NPC PROBABILITY...', delay: 3100 },
  { text: 'MEASURING MAIN CHARACTER ENERGY...', delay: 3700 },
  { text: 'CHECKING FUTURE...', delay: 4200 },
  { text: 'FUTURE SERVER NOT RESPONDING...', delay: 4700 },
  { text: 'RETRYING...', delay: 5100 },
  { text: 'FUTURE STILL NOT FOUND.', delay: 5600 },
  { text: 'CONSULTING ADVANCED AI...', delay: 6000 },
  { text: 'AI HAS QUESTIONS.', delay: 6500 },
  { text: 'SCANNING DRIP LEVELS...', delay: 7000 },
  { text: 'CALCULATING LUCK COEFFICIENT...', delay: 7400 },
  { text: 'THREAT ASSESSMENT IN PROGRESS...', delay: 7800 },
  { text: 'COMPILING RESULTS...', delay: 8300 },
  { text: 'ANALYSIS COMPLETE ✓', delay: 8800 },
];
