export { getOcScenarios, getOcInstructions, INSTRUCTIONS_DEFENCE, INSTRUCTIONS_WELLBEING } from "./ocScenarios";

export const USER_TYPES = {
  NDA: "NDA",
  ARMY: "ARMY",
  NAVY: "NAVY",
  AIRFORCE: "AIRFORCE",
  PTSD: "PTSD",
  NAVY_PTSD: "NAVY_PTSD",
};

/** Session vignette floor after each ACK (scenarios 1–4). */
export const SESSION_FLOORS = [0, 0.1, 0.2, 0.3];

/** Brief collapses at this fraction of timer elapsed per scenario index. */
export const BRIEF_COLLAPSE_AT = [0.8, 0.75, 0.7, 0.65];

export const TIME_REDUCTION = [1.0, 0.9, 0.8, 0.7];

export const BUZZER_THRESHOLD_SEC = 15;

/** Fixed countdown per scenario (2 minutes). */
export const OC_SCENARIO_TIMER_SEC = 120;

/** Per user-type timer behaviour (duration uses OC_SCENARIO_TIMER_SEC). */
export const TIMER_PROFILE = {
  NDA:       { mode: "countdown_pressure", scale: 1.0,  label: "Mission window", buzzerAt: 15 },
  ARMY:      { mode: "countdown_pressure", scale: 1.0,  label: "Field window",   buzzerAt: 15 },
  NAVY:      { mode: "countdown_watch",    scale: 1.0,  label: "Watch cycle",    buzzerAt: 20 },
  AIRFORCE:  { mode: "countdown_pressure", scale: 1.0,  label: "Sortie window",  buzzerAt: 15 },
  PTSD:      { mode: "wellbeing_soft",     scale: 1.0,  label: "Gentle pace",    buzzerAt: 0 },
  NAVY_PTSD: { mode: "wellbeing_soft",     scale: 1.0,  label: "Watch pace",     buzzerAt: 0 },
};

export function getEffectiveTimeLimit(scenario, userType) {
  if (!scenario || scenario.noTimer === true) return 0;
  const prof = TIMER_PROFILE[userType] || TIMER_PROFILE.NDA;
  if (!prof?.mode) return 0;
  return OC_SCENARIO_TIMER_SEC;
}

export function hasActiveTimer(userType, scenario) {
  if (!scenario) return false;
  if (scenario.noTimer === true) return false;
  return !!(TIMER_PROFILE[userType]?.mode);
}

export const PTSD_SCENE_SOUNDS = ["nature", "ambulance", "scream", "nature"];

/** Shared NEURO Z assessment shell (matches CBDT / Header). */
export const OC_SHELL = {
  page: "bg-[#050b18] text-slate-100 flex flex-col overflow-hidden",
  pageHeight: { height: "calc(100vh - 56px)" },
  panel: "bg-[#0c1528] border border-blue-900/40 rounded-2xl",
  label: "text-[10px] font-mono uppercase tracking-widest text-slate-500",
  title: "text-blue-400 font-semibold tracking-widest text-sm uppercase",
  btnPrimary: "bg-blue-600 hover:bg-blue-500 transition text-white text-sm font-semibold px-8 py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed",
  btnGhost: "border border-blue-900/40 hover:border-blue-500/60 text-slate-300 text-sm px-6 py-3 rounded-xl transition-all",
  textarea: "w-full bg-[#1b2435] rounded-xl px-4 py-3 text-sm outline-none border border-blue-900/40 focus:border-blue-500 transition-all placeholder-slate-600 resize-y leading-relaxed text-slate-200",
};

export const USER_TYPE_CONFIG = {
  [USER_TYPES.NDA]: {
    label: "NDA Cadet",
    icon: "◈",
    hasTimer: true,
    timerMode: "countdown_pressure",
    hasPressureAccumulation: true,
    exitButton: false,
    accentColor: "#58a6ff",
    rivalName: "Cadet Jatin",
    rivalScenarioIndex: 1,
    popups: {
      ack: "Decision logged.",
      freeze: ["The window is closing.", "Your platoon is watching.", "Make the call."],
      rival: (name) => `${name} — submitted.`,
      timer60: "Time pressure increasing. Maintain focus.",
      timer80: "Window closing. Commit your response.",
      timer90: "Critical — time nearly expired.",
      sessionClose: "Session complete.",
      sessionCloseSub: "You stayed for all four.\nThat is not nothing.",
      return: (n) => `SESSION ${n}\n\nYou came back.`,
      returnGap: (n, days) => `SESSION ${n}\n\n${days} days since your last session.\nYou came back.`,
    },
  },
  [USER_TYPES.ARMY]: {
    label: "Indian Army",
    icon: "◆",
    hasTimer: true,
    timerMode: "countdown_pressure",
    hasPressureAccumulation: true,
    exitButton: false,
    accentColor: "#39d353",
    rivalName: "Officer Singh",
    rivalScenarioIndex: 1,
    popups: {
      ack: "SECTOR CLEAR.\nDecision logged. Proceed.",
      freeze: ["COMMAND IS WAITING.", "THE FIELD DOESN'T PAUSE.", "TRANSMIT NOW."],
      rival: (name) => `${name} — DECISION TRANSMITTED.`,
      timer60: "Time pressure increasing. Maintain operational focus.",
      timer80: "Transmission window closing.",
      timer90: "CRITICAL — TRANSMIT NOW.",
      sessionClose: "Session complete.",
      sessionCloseSub: "All four transmitted.\nIntel logged.",
      return: (n) => `SESSION ${n}\n\nYou came back.`,
      returnGap: (n, days) => `SESSION ${n}\n\n${days} days since your last session.\nYou came back.`,
    },
  },
  [USER_TYPES.NAVY]: {
    label: "Indian Navy",
    icon: "◉",
    hasTimer: true,
    timerMode: "countdown_watch",
    hasPressureAccumulation: true,
    exitButton: false,
    accentColor: "#4fc3f7",
    rivalName: "Petty Officer Rajan",
    rivalScenarioIndex: 2,
    crewLine: "Petty Officer Rajan is still in that compartment.",
    popups: {
      ack: (x, total) => `Watch sector ${x} of ${total} — logged.`,
      complacency: [
        "Standard response recorded.",
        "What does this situation require beyond procedure?",
      ],
      rival: null,
      timer60: "Watch pressure increasing.",
      timer80: "Transmission window closing.",
      timer90: "CRITICAL — LOG YOUR DECISION.",
      sessionClose: "All systems nominal.",
      sessionCloseSub: "Watch cycle complete.\nLog entry confirmed.",
      return: (n) => `WATCH CYCLE ${n}\n\nYou're back on deck.`,
      returnGap: (n, days) => `WATCH CYCLE ${n}\n\n${days} days ashore.\nSome calibration required.`,
    },
  },
  [USER_TYPES.AIRFORCE]: {
    label: "Indian Air Force",
    icon: "◇",
    hasTimer: true,
    timerMode: "countdown_pressure",
    hasPressureAccumulation: true,
    exitButton: false,
    accentColor: "#b39ddb",
    rivalName: "Officer Verma",
    rivalScenarioIndex: 1,
    popups: {
      ack: "Sortie logged. Proceed.",
      freeze: ["COMMAND IS WAITING.", "THE SORTIE DOESN'T HOLD.", "TRANSMIT NOW."],
      rival: (name) => `${name} — SORTIE TRANSMITTED.`,
      timer60: "Time pressure increasing. Maintain focus.",
      timer80: "Transmission window closing.",
      timer90: "CRITICAL — TRANSMIT NOW.",
      sessionClose: "Session complete.",
      sessionCloseSub: "All four sorties logged.\nMission intel recorded.",
      return: (n) => `SESSION ${n}\n\nYou came back.`,
      returnGap: (n, days) => `SESSION ${n}\n\n${days} days since your last session.\nYou came back.`,
    },
  },
  [USER_TYPES.PTSD]: {
    label: "Terror Attack Survivor",
    icon: "◎",
    hasTimer: true,
    timerMode: "wellbeing_soft",
    hasPressureAccumulation: false,
    exitButton: true,
    accentColor: "#f48fb1",
    popups: {
      ack: "Scene closed.\nYou're out.",
      gentleNaming: [
        "This part seems harder to stay with.",
        "That makes sense.",
        "Is there anything you want to add before we move on?",
      ],
      dissociation: [
        "Before we continue —",
        "You've been moving through these quickly.",
        "That's okay.",
        "Can you feel the surface under you right now?",
      ],
      sessionClose: "You stayed for all of it.",
      sessionCloseSub: "That matters.",
      return: "You came back.\n\nThis is a safe space.\nNothing here will be asked of you that you cannot step away from.",
      bodyCheck: [
        "Before we continue —",
        "Can you feel your feet right now?",
        "The surface under you? The air around you?",
      ],
    },
  },
  [USER_TYPES.NAVY_PTSD]: {
    label: "Navy PTSD",
    icon: "◎",
    hasTimer: true,
    timerMode: "wellbeing_soft",
    hasPressureAccumulation: false,
    exitButton: true,
    accentColor: "#7dd3fc",
    popups: {
      ack: "Watch closed.\nYou're clear.",
      gentleNaming: [
        "This part of the watch seems harder to keep.",
        "That's understood.",
        "Is there anything you want to add before we move on?",
      ],
      dissociation: [
        "Before we continue —",
        "You've been moving through this quickly.",
        "That's understood.",
        "Can you feel the deck under you right now?",
      ],
      sessionClose: "Watch kept.",
      sessionCloseSub: "You stayed for all of it.",
      return: "You came back.\n\nThis is a safe place.\nThe watch here is yours to keep at whatever pace you need.",
      bodyCheck: [
        "Before we continue —",
        "You've been keeping this watch a while.",
        "Can you feel the deck under you? The steadiness of it?",
      ],
    },
  },
};

export function getMilitaryTypes() {
  return [USER_TYPES.NDA, USER_TYPES.ARMY, USER_TYPES.NAVY, USER_TYPES.AIRFORCE];
}

export function isPtsdType(userType) {
  return userType === USER_TYPES.PTSD || userType === USER_TYPES.NAVY_PTSD;
}

/** Map EMA keys, signup roles, or OC keys to a valid USER_TYPES value. */
const RAW_TO_OC_TYPE = {
  nda: USER_TYPES.NDA,
  NDA: USER_TYPES.NDA,
  cadet: USER_TYPES.NDA,
  army: USER_TYPES.ARMY,
  ARMY: USER_TYPES.ARMY,
  army_men: USER_TYPES.ARMY,
  navy: USER_TYPES.NAVY,
  NAVY: USER_TYPES.NAVY,
  air_force: USER_TYPES.AIRFORCE,
  AIRFORCE: USER_TYPES.AIRFORCE,
  terror_survivor: USER_TYPES.PTSD,
  PTSD: USER_TYPES.PTSD,
  ptsd_victim: USER_TYPES.PTSD,
  NAVY_PTSD: USER_TYPES.NAVY_PTSD,
};

export function normalizeOcUserType(raw) {
  if (!raw) return null;
  if (USER_TYPE_CONFIG[raw]) return raw;
  const mapped = RAW_TO_OC_TYPE[raw] ?? RAW_TO_OC_TYPE[String(raw).toLowerCase()];
  return mapped && USER_TYPE_CONFIG[mapped] ? mapped : null;
}

export function computeVignetteDim(scenarioIndex, pressureLevel, hasPressure) {
  if (!hasPressure) return 0;
  const floor = SESSION_FLOORS[scenarioIndex] ?? 0;
  return Math.min(0.95, floor + (1 - floor) * pressureLevel * 0.9);
}

export function getTimerBarColor(pressureLevel, accentColor) {
  if (pressureLevel < 0.5) return accentColor;
  if (pressureLevel < 0.75) return "#facc15";
  return "#ef4444";
}
