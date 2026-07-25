import { USER_TYPES, PTSD_SCENE_SOUNDS } from "./ocConfig";



const BASE = "/sounds";



export const SOUND_FILES = {

  buzzer: `${BASE}/buzzer.mp3`,

  chimes: `${BASE}/chimes.mp3`,

  dimming: `${BASE}/dimming_light.mp3`,

  gunFire: `${BASE}/gun_fire.mp3`,

  nature: `${BASE}/nature.mp3`,

  ambulance: `${BASE}/ambulance.mp3`,

  scream: `${BASE}/scream.mp3`,

  nda: `${BASE}/nda.mp3`,

  navy: `${BASE}/navy.mp3`,

  airforce: `${BASE}/airforce.mp3`,

};



const MILITARY_AMBIENT = {

  [USER_TYPES.NDA]: SOUND_FILES.nda,

  [USER_TYPES.ARMY]: SOUND_FILES.gunFire,

  [USER_TYPES.NAVY]: SOUND_FILES.navy,

  [USER_TYPES.AIRFORCE]: SOUND_FILES.airforce,

};



const RANDOM_POOLS = {

  [USER_TYPES.NDA]: [SOUND_FILES.gunFire, SOUND_FILES.nda, SOUND_FILES.buzzer],

  [USER_TYPES.ARMY]: [SOUND_FILES.gunFire, SOUND_FILES.gunFire, SOUND_FILES.scream],

  [USER_TYPES.NAVY]: [SOUND_FILES.navy, SOUND_FILES.gunFire, SOUND_FILES.nature],

  [USER_TYPES.AIRFORCE]: [SOUND_FILES.airforce, SOUND_FILES.gunFire],

  [USER_TYPES.PTSD]: [SOUND_FILES.nature, SOUND_FILES.ambulance, SOUND_FILES.nature],

  [USER_TYPES.NAVY_PTSD]: [SOUND_FILES.navy, SOUND_FILES.nature],

};



function createLoop(src, volume = 0.25) {

  const audio = new Audio(src);

  audio.loop = true;

  audio.volume = volume;

  audio.preload = "auto";

  return audio;

}



function pickRandom(arr) {

  return arr[Math.floor(Math.random() * arr.length)];

}



export class OcAudioEngine {

  constructor() {

    this.enabled = false;

    this.ambient = null;

    this.gunLayer = null;

    this.dimming = null;

    this.buzzerTimer = null;

    this.buzzerAudio = null;

    this.randomEventTimer = null;

    this._buzzerPlaying = false;

  }



  enable() {

    this.enabled = true;

  }



  async _play(src, { volume = 0.5, loop = false } = {}) {

    if (!this.enabled) return null;

    try {

      const audio = new Audio(src);

      audio.volume = volume;

      audio.loop = loop;

      await audio.play();

      return audio;

    } catch {

      return null;

    }

  }



  stop(audio) {

    if (!audio) return;

    try {

      audio.pause();

      audio.currentTime = 0;

    } catch {}

  }



  stopRandomEvents() {

    if (this.randomEventTimer) {

      clearTimeout(this.randomEventTimer);

      this.randomEventTimer = null;

    }

  }



  stopAmbient() {

    this.stopRandomEvents();

    this.stop(this.ambient);

    this.ambient = null;

    this.stop(this.gunLayer);

    this.gunLayer = null;

  }



  stopDimming() {

    this.stop(this.dimming);

    this.dimming = null;

  }



  stopBuzzer() {

    if (this.buzzerTimer) {

      clearInterval(this.buzzerTimer);

      this.buzzerTimer = null;

    }

    this.stop(this.buzzerAudio);

    this.buzzerAudio = null;

    this._buzzerPlaying = false;

  }



  stopAll() {

    this.stopAmbient();

    this.stopDimming();

    this.stopBuzzer();

  }



  /** Random one-shots layered on ambient — interval jittered per session. */

  startRandomEvents(userType, pressureLevel = 0) {

    if (!this.enabled) return;

    this.stopRandomEvents();

    const pool = RANDOM_POOLS[userType];

    if (!pool?.length) return;



    const scheduleNext = () => {

      const base = userType === USER_TYPES.PTSD || userType === USER_TYPES.NAVY_PTSD ? 14000 : 7000;

      const jitter = Math.random() * (userType === USER_TYPES.ARMY ? 9000 : 6000);

      const delay = Math.max(3500, base - pressureLevel * 3000 + jitter);



      this.randomEventTimer = setTimeout(() => {

        if (!this.enabled) return;

        const src = pickRandom(pool);

        const vol =

          src === SOUND_FILES.scream || src === SOUND_FILES.ambulance

            ? 0.15 + Math.random() * 0.2

            : 0.12 + Math.random() * 0.28 + pressureLevel * 0.15;

        this._play(src, { volume: Math.min(0.65, vol) });

        if (Math.random() < 0.35 && userType !== USER_TYPES.PTSD) {

          setTimeout(() => this._play(pickRandom(pool), { volume: vol * 0.7 }), 120 + Math.random() * 280);

        }

        scheduleNext();

      }, delay);

    };



    scheduleNext();

  }



  startSessionAmbient(userType, scenarioIndex = 0) {

    if (!this.enabled) return;

    this.stopAmbient();



    if (userType === USER_TYPES.PTSD) {

      const key = PTSD_SCENE_SOUNDS[scenarioIndex] ?? pickRandom(["nature", "ambulance", "nature"]);

      const src = SOUND_FILES[key] || SOUND_FILES.nature;

      this.ambient = createLoop(src, key === "nature" ? 0.18 : 0.28);

      this.ambient.play().catch(() => {});

      this.startRandomEvents(userType, 0);

      return;

    }



    if (userType === USER_TYPES.NAVY_PTSD) {

      this.ambient = createLoop(SOUND_FILES.navy, 0.1);

      this.ambient.play().catch(() => {});

      this.startRandomEvents(userType, 0);

      return;

    }



    const branchSrc = MILITARY_AMBIENT[userType];

    if (branchSrc) {

      this.ambient = createLoop(branchSrc, userType === USER_TYPES.NDA ? 0.2 : 0.26);

      this.ambient.play().catch(() => {});

    }



    if ([USER_TYPES.ARMY, USER_TYPES.NAVY, USER_TYPES.AIRFORCE].includes(userType)) {

      const gunVol = 0.1 + scenarioIndex * 0.04 + Math.random() * 0.06;

      this.gunLayer = createLoop(SOUND_FILES.gunFire, Math.min(0.45, gunVol));

      this.gunLayer.play().catch(() => {});

    }



    this.startRandomEvents(userType, 0);

  }



  setPressureVolumes(pressureLevel, scenarioIndex) {

    if (!this.enabled) return;

    const p = Math.min(1, Math.max(0, pressureLevel));

    if (this.ambient) {

      this.ambient.volume = Math.min(0.55, 0.2 + p * 0.28);

    }

    if (this.gunLayer) {

      this.gunLayer.volume = Math.min(0.55, 0.08 + scenarioIndex * 0.04 + p * 0.38);

    }

  }



  startDimming(dimLevel) {

    if (!this.enabled) return;

    if (dimLevel < 0.15) {

      this.stopDimming();

      return;

    }

    if (!this.dimming) {

      this.dimming = createLoop(SOUND_FILES.dimming, 0);

      this.dimming.play().catch(() => {});

    }

    this.dimming.volume = Math.min(0.55, dimLevel * 0.5);

  }



  startBuzzerLoop() {

    if (!this.enabled || this.buzzerTimer) return;



    const playOnce = () => {

      if (!this.enabled) return;

      this.buzzerAudio = new Audio(SOUND_FILES.buzzer);

      this.buzzerAudio.volume = 0.75 + Math.random() * 0.15;

      this.buzzerAudio.play().catch(() => {});

    };



    playOnce();

    const interval = 700 + Math.floor(Math.random() * 400);

    this.buzzerTimer = setInterval(playOnce, interval);

  }



  playChime() {

    return this._play(SOUND_FILES.chimes, { volume: 0.45 + Math.random() * 0.15 });

  }



  playGunshotBurst() {

    const n = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < n; i++) {

      setTimeout(() => this._play(SOUND_FILES.gunFire, { volume: 0.7 + Math.random() * 0.2 }), i * (90 + Math.random() * 120));

    }

  }



  playComplacencyPing() {

    return this._play(SOUND_FILES.chimes, { volume: 0.35 });

  }



  playTimeoutSting() {

    this.stopAll();

    return this._play(SOUND_FILES.buzzer, { volume: 0.95 });

  }



  async playSessionClose(userType) {

    if (!this.enabled) return;

    this.stopAll();

    const silenceMs =

      userType === USER_TYPES.ARMY ? 3000 : userType === USER_TYPES.PTSD || userType === USER_TYPES.NAVY_PTSD ? 4000 : 2000;

    await new Promise((r) => setTimeout(r, silenceMs));

    if (userType === USER_TYPES.PTSD) {

      const a = createLoop(SOUND_FILES.nature, 0.22);

      a.loop = false;

      a.play().catch(() => {});

      setTimeout(() => this.stop(a), 5000);

      return;

    }

    if (userType === USER_TYPES.NAVY_PTSD) {

      const a = createLoop(SOUND_FILES.navy, 0.18);

      a.loop = false;

      a.play().catch(() => {});

      setTimeout(() => this.stop(a), 5000);

      return;

    }

    if (userType === USER_TYPES.NAVY) {

      const a = createLoop(SOUND_FILES.nature, 0.28);

      a.loop = false;

      a.play().catch(() => {});

      setTimeout(() => this.stop(a), 3000);

      return;

    }

    await this.playChime();

  }

}


