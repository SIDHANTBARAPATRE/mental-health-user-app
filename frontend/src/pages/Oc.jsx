import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  getOcScenarios,
  getOcInstructions,
  USER_TYPES,
  USER_TYPE_CONFIG,
  OC_SHELL,
  BRIEF_COLLAPSE_AT,
  BUZZER_THRESHOLD_SEC,
  TIMER_PROFILE,
  isPtsdType,
  normalizeOcUserType,
  computeVignetteDim,
  getTimerBarColor,
  getEffectiveTimeLimit,
  hasActiveTimer,
} from "../lib/oc/ocConfig";
import { resolveDefaultOcUserType } from "../lib/userProfile";
import { OcAudioEngine } from "../lib/oc/ocAudio";
import { OcPopupBanner, OcFullScreenMessage, OcBlackoutOverlay } from "../lib/oc/OcPopups";
import { OcKeystrokeTracker } from "../lib/oc/ocKeystrokeMetrics";
import OcRewardVisual from "../lib/oc/OcRewardVisual";

function buildSessionMetrics(answers) {
  if (!answers?.length) return {};
  const m = answers.map((a) => a.keystrokeMetrics).filter(Boolean);
  const avgThinking =
    m.length ? Math.round(m.reduce((s, x) => s + (x.thinkingIndex || 0), 0) / m.length) : 0;
  const timeouts = answers.filter((a) => a.timedOut).length;
  return {
    scenarioCount: answers.length,
    timedOutCount: timeouts,
    avgThinkingIndex: avgThinking,
    avgRevisionRatio: m.length
      ? Math.round(m.reduce((s, x) => s + (x.revisionRatio || 0), 0) / m.length)
      : 0,
    notes: m.map((x) => x.cognitiveNote).filter(Boolean),
  };
}

const formatTime = (s) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

function resolveInitialOcType(propUserType) {
  return normalizeOcUserType(propUserType || resolveDefaultOcUserType());
}

export default function Oc({ userType: propUserType }) {
  const location = useLocation();
  const initialType = resolveInitialOcType(propUserType);
  const [userType, setUserType] = useState(initialType);
  const [phase, setPhase] = useState(initialType ? "intro" : "selectType");
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [briefExpanded, setBriefExpanded] = useState(true);

  const [activePopup, setActivePopup] = useState(null);
  const [ackOverlay, setAckOverlay] = useState(null);
  const [buzzerActive, setBuzzerActive] = useState(false);
  const [redPulse, setRedPulse] = useState(false);
  const [showMidpointCare, setShowMidpointCare] = useState(false);
  const [blackout, setBlackout] = useState(false);

  const answersRef = useRef([]);
  const keystrokeRef = useRef(new OcKeystrokeTracker());
  const hasSavedRef = useRef(false);
  const audioRef = useRef(new OcAudioEngine());
  const timerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const freezeFiredRef = useRef(false);
  const rivalFiredRef = useRef(false);
  const timerWarnFiredRef = useRef({ w60: false, w80: false, w90: false });
  const submittedRef = useRef(false);

  // Re-sync when navigating directly to /oc (URL bar) so type is never stale/invalid
  useEffect(() => {
    const resolved = resolveInitialOcType(propUserType);
    if (!resolved) return;
    setUserType((prev) => (prev === resolved ? prev : resolved));
    setPhase((prev) => {
      if (prev === "selectType") return "intro";
      if (!["intro", "briefing", "active", "pause", "complete"].includes(prev)) return "intro";
      return prev;
    });
  }, [location.pathname, propUserType]);

  const cfg = userType ? USER_TYPE_CONFIG[userType] : null;
  const scenarios = userType ? getOcScenarios(userType) : [];
  const instructions = userType ? getOcInstructions(userType) : [];
  const scenario = scenarios[scenarioIndex];

  const resetToIntro = useCallback(() => {
    setScenarioIndex(0);
    setAnswers([]);
    answersRef.current = [];
    setPhase("intro");
  }, []);

  useEffect(() => {
    if (!userType || !cfg || !scenarios.length) return;
    if (["briefing", "active", "pause"].includes(phase) && !scenario) {
      resetToIntro();
    }
  }, [userType, cfg, scenarios.length, phase, scenario, resetToIntro]);
  const ptsd = userType && isPtsdType(userType);
  const timerActive = userType && scenario && hasActiveTimer(userType, scenario);
  const timerProf = TIMER_PROFILE[userType] || TIMER_PROFILE.NDA;
  const effectiveTimeLimit = timerActive
    ? getEffectiveTimeLimit(scenario, userType)
    : 0;
  const buzzerThreshold = timerProf.buzzerAt ?? 15;

  const pressureLevel =
    timerActive && effectiveTimeLimit > 0 ? 1 - timeLeft / effectiveTimeLimit : 0;

  const dimLevel = computeVignetteDim(scenarioIndex, pressureLevel, cfg?.hasPressureAccumulation);
  const briefCollapsed =
    timerActive && cfg?.hasPressureAccumulation && pressureLevel >= (BRIEF_COLLAPSE_AT[scenarioIndex] ?? 0.65);

  const accent = cfg?.accentColor ?? "#58a6ff";
  const timerColor = getTimerBarColor(pressureLevel, accent);

  // ── Save ───────────────────────────────────────────────────────────────────
  const saveToMongo = useCallback(
    async (finalAnswers) => {
      if (hasSavedRef.current) return;
      hasSavedRef.current = true;
      setSaveStatus("saving");
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/oc/save`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            answers: finalAnswers,
            userType,
            sessionMetrics: buildSessionMetrics(finalAnswers),
          }),
        });
        if (!res.ok) throw new Error("Save failed");
        setSaveStatus("saved");
      } catch (err) {
        console.error("Failed to save assessment:", err);
        hasSavedRef.current = false;
        setSaveStatus("error");
      }
    },
    [userType]
  );

  const resetScenarioTriggers = () => {
    freezeFiredRef.current = false;
    rivalFiredRef.current = false;
    timerWarnFiredRef.current = { w60: false, w80: false, w90: false };
    submittedRef.current = false;
    lastActivityRef.current = Date.now();
    setActivePopup(null);
    setBuzzerActive(false);
    setRedPulse(false);
    audioRef.current.stopBuzzer();
  };

  const enableAudio = () => {
    audioRef.current.enable();
    setSoundEnabled(true);
  };

  const startScenario = () => {
    resetScenarioTriggers();
    keystrokeRef.current.reset();
    setBlackout(false);
    setBriefExpanded(true);
    setTimeLeft(effectiveTimeLimit);
    setAnswer("");
    setPhase("active");
    if (soundEnabled) {
      audioRef.current.startSessionAmbient(userType, scenarioIndex);
    }
  };

  const handleSubmit = useCallback(
    (timedOut = false) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      clearInterval(timerRef.current);
      audioRef.current.stopBuzzer();
      audioRef.current.stopAmbient();
      setBuzzerActive(false);
      setRedPulse(false);
      setBlackout(false);

      const timeUsed = timerActive ? Math.max(0, effectiveTimeLimit - timeLeft) : 0;
      const finalAnswer = timedOut && !answer.trim() ? "[NO RESPONSE — TIME EXPIRED]" : answer;
      const metrics = keystrokeRef.current.summarize(finalAnswer, timeUsed, timedOut);

      if (soundEnabled && !timedOut) audioRef.current.playChime();

      const pop = cfg?.popups;
      const ackLines =
        typeof pop?.ack === "function"
          ? [pop.ack(scenarioIndex + 1, scenarios.length)]
          : [pop?.ack ?? "Logged."];
      setAckOverlay({ lines: ackLines, variant: ptsd ? "care" : "reward" });
      setTimeout(() => setAckOverlay(null), 3000);

      const newEntry = {
        scenarioId: scenario.id,
        title: scenario.title,
        answer: finalAnswer,
        timedOut,
        timeUsed,
        timeLimit: effectiveTimeLimit,
        keystrokeMetrics: metrics,
      };
      const updated = [...answersRef.current, newEntry];
      answersRef.current = updated;
      setAnswers(updated);
      setPhase("pause");
    },
    [scenario, answer, effectiveTimeLimit, timeLeft, cfg, scenarioIndex, soundEnabled, userType, timerActive, ptsd]
  );

  const handleTimeout = useCallback(() => {
    if (submittedRef.current) return;
    clearInterval(timerRef.current);
    audioRef.current.stopBuzzer();
    if (soundEnabled) audioRef.current.playTimeoutSting();
    setBlackout(true);
    setBuzzerActive(false);
    const msg = ptsd
      ? "Time for this scene has ended."
      : "WINDOW CLOSED — TIME EXPIRED";
    const sub = ptsd
      ? "Your partial response will be saved. You can continue when ready."
      : "Scenario terminated. No further input accepted.";
    setTimeout(() => {
      handleSubmit(true);
    }, 2800);
  }, [handleSubmit, soundEnabled, ptsd]);

  const nextScenario = () => {
    const next = scenarioIndex + 1;
    if (next >= scenarios.length) {
      if (soundEnabled) audioRef.current.playSessionClose(userType);
      saveToMongo(answersRef.current);
      setPhase("complete");
    } else {
      if (cfg?.midpointCare && next === 2) {
        setShowMidpointCare(true);
        return;
      }
      setScenarioIndex(next);
      setPhase("briefing");
    }
  };

  // ── Timer tick ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "active" || !timerActive || effectiveTimeLimit <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        const next = t - 1;
        const pl = 1 - next / effectiveTimeLimit;

        if (soundEnabled) {
          audioRef.current.setPressureVolumes(pl, scenarioIndex);
          if (cfg?.hasPressureAccumulation) {
            audioRef.current.startDimming(computeVignetteDim(scenarioIndex, pl, true));
          }
        }

        const pop = cfg.popups;
        if (!ptsd) {
          if (pl >= 0.6 && !timerWarnFiredRef.current.w60) {
            timerWarnFiredRef.current.w60 = true;
            setActivePopup({ lines: [pop.timer60], variant: "warn" });
            setTimeout(() => setActivePopup(null), 4000);
          }
          if (pl >= 0.8 && !timerWarnFiredRef.current.w80) {
            timerWarnFiredRef.current.w80 = true;
            setActivePopup({ lines: [pop.timer80], variant: "warn" });
            setTimeout(() => setActivePopup(null), 4000);
          }
          if (pl >= 0.9 && !timerWarnFiredRef.current.w90) {
            timerWarnFiredRef.current.w90 = true;
            setActivePopup({ lines: [pop.timer90], variant: "punish" });
          }

          const idleMs = Date.now() - lastActivityRef.current;
          if (
            pl >= 0.75 &&
            !submittedRef.current &&
            idleMs > 45000 &&
            !freezeFiredRef.current &&
            pop.freeze
          ) {
            freezeFiredRef.current = true;
            setActivePopup({ lines: pop.freeze, variant: "punish" });
            if (soundEnabled) audioRef.current.playGunshotBurst();
            setRedPulse(true);
            setTimeout(() => setRedPulse(false), 500);
          }

          if (
            !rivalFiredRef.current &&
            scenarioIndex === cfg.rivalScenarioIndex &&
            pl >= 0.55
          ) {
            rivalFiredRef.current = true;
            const lines = cfg.crewLine
              ? [cfg.crewLine]
              : cfg.rivalName && pop.rival
                ? [pop.rival(cfg.rivalName)]
                : null;
            if (lines) {
              setActivePopup({ lines, variant: "punish" });
              setTimeout(() => setActivePopup(null), 8000);
            }
          }

          if (buzzerThreshold > 0 && next <= buzzerThreshold && !submittedRef.current) {
            setBuzzerActive(true);
            if (soundEnabled && !audioRef.current.buzzerTimer) {
              audioRef.current.startBuzzerLoop();
            }
          }
        } else if (pl >= 0.85 && !timerWarnFiredRef.current.w90) {
          timerWarnFiredRef.current.w90 = true;
          setActivePopup({
            lines: ["When you're ready, you can complete this scene — no rush."],
            variant: "care",
          });
          setTimeout(() => setActivePopup(null), 5000);
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [
    phase,
    cfg,
    effectiveTimeLimit,
    scenarioIndex,
    soundEnabled,
    handleTimeout,
    userType,
    timerActive,
    buzzerThreshold,
    ptsd,
  ]);

  // Red pulse animation while buzzer active
  useEffect(() => {
    if (!buzzerActive) return;
    const id = setInterval(() => setRedPulse((p) => !p), 400);
    return () => clearInterval(id);
  }, [buzzerActive]);

  // Cleanup audio on unmount
  useEffect(() => () => audioRef.current.stopAll(), []);

  // ═══ SELECT TYPE ═══════════════════════════════════════════════════════════
  if (phase === "selectType") {
    return (
      <div className={OC_SHELL.page} style={OC_SHELL.pageHeight}>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full text-center">
            <p className={OC_SHELL.label}>Operant Conditioning Module</p>
            <h1 className="text-3xl font-bold text-white mt-2 mb-2">Select Profile</h1>
            <p className="text-slate-500 text-sm mb-10">Session-level conditioning · scenario-agnostic cues</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(USER_TYPE_CONFIG).map(([key, c]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setUserType(normalizeOcUserType(key) || key);
                    resetToIntro();
                  }}
                  className="flex items-center gap-3 px-4 py-4 rounded-xl border text-left transition-all hover:bg-white/5 bg-[#0c1528]"
                  style={{ borderColor: `${c.accentColor}44` }}
                >
                  <span style={{ color: c.accentColor, fontSize: 20 }}>{c.icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-slate-200">{c.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest">
                      {c.hasTimer ? "Timed session" : "Open pace · Step out available"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══ MIDPOINT CARE (PTSD) ══════════════════════════════════════════════════
  if (showMidpointCare && cfg) {
    const lines = cfg.popups.bodyCheck ?? cfg.popups.dissociation;
    return (
      <div className={OC_SHELL.page} style={OC_SHELL.pageHeight}>
        <OcFullScreenMessage
          title="Midpoint"
          body={lines.join("\n")}
          accentColor={accent}
          onContinue={() => {
            setShowMidpointCare(false);
            setScenarioIndex(2);
            setPhase("briefing");
          }}
          continueLabel={userType === USER_TYPES.NAVY_PTSD ? "Continue the watch" : "I'm here — continue"}
        />
      </div>
    );
  }

  // Invalid type or missing scenarios — recover instead of crashing (blank screen)
  if (userType && (!cfg || !scenarios.length)) {
    return (
      <div className={OC_SHELL.page} style={OC_SHELL.pageHeight}>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className={`${OC_SHELL.panel} max-w-md w-full p-8 text-center`}>
            <p className={OC_SHELL.label}>OC Module</p>
            <h2 className="text-xl font-bold text-white mt-2 mb-3">Profile not loaded</h2>
            <p className="text-slate-400 text-sm mb-6">
              Your session type could not be resolved. Choose a profile to continue.
            </p>
            <button
              type="button"
              className={OC_SHELL.btnPrimary}
              onClick={() => {
                setUserType(null);
                setPhase("selectType");
              }}
            >
              Select profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══ INTRO ═════════════════════════════════════════════════════════════════
  if (phase === "intro" && cfg) {
    return (
      <div className={OC_SHELL.page} style={OC_SHELL.pageHeight}>
        <div className="border-b border-blue-900/30 px-8 py-4 shrink-0">
          <span className={OC_SHELL.title}>Assessment 4 — OC</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
          <div className={`${OC_SHELL.panel} max-w-xl w-full p-8`}>
            <p className={OC_SHELL.label} style={{ color: accent }}>
              {cfg.label}
            </p>
            <h2 className="text-2xl font-bold text-white mt-2 mb-4">Under Pressure</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 whitespace-pre-line">
              {ptsd
                ? "Four reflective scenes with a gentle 2-minute guide per scene. Audio is atmospheric — never punitive. You may step out at any time."
                : "Four scenarios in one session arc. Countdown windows differ by branch; pressure, buzzer, and screen dim build until time expires or you transmit."}
            </p>
            <ul className="text-xs text-slate-500 space-y-2 mb-8 font-mono">
              {ptsd ? (
                <>
                  <li>· Gentle scene timer (2 min) — no buzzer</li>
                  <li>· Scene ambience: nature / contextual audio</li>
                  <li>· Midpoint body check after scene 2</li>
                </>
              ) : (
                <>
                  <li>· Timer bar + vignette dimming across session</li>
                  <li>· Buzzer under {BUZZER_THRESHOLD_SEC}s remaining</li>
                  <li>· Branch audio + gunfire layer by service</li>
                </>
              )}
            </ul>
            <div className="flex flex-col sm:flex-row gap-3">
              <button type="button" className={OC_SHELL.btnPrimary} onClick={() => { enableAudio(); setPhase("briefing"); }}>
                Begin with sound
              </button>
              <button type="button" className={OC_SHELL.btnGhost} onClick={() => setPhase("briefing")}>
                Begin without sound
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══ BRIEFING ══════════════════════════════════════════════════════════════
  if (phase === "briefing" && scenario && cfg) {
    const content = (
      <div className="max-w-3xl mx-auto p-8 pb-16">
        <p className={OC_SHELL.label}>
          {ptsd ? `Scene ${scenarioIndex + 1} of ${scenarios.length}` : `Scenario ${scenarioIndex + 1} of ${scenarios.length}`}
        </p>
        <h2 className="text-xl font-bold text-white mt-2">{scenario.title}</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">{scenario.subtitle}</p>
        <OcRewardVisual
          userType={userType}
          completedCount={scenarioIndex}
          totalScenarios={scenarios.length}
          accentColor={accent}
        />
        <div className={`${OC_SHELL.panel} p-6 mb-6 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto`}>
          {scenario.content}
        </div>
        <div className="mb-8 space-y-2">
          {instructions.map((inst, i) => (
            <p key={i} className="text-xs text-slate-500">
              <span style={{ color: accent }}>{i + 1}. </span>
              {inst}
            </p>
          ))}
        </div>
        {timerActive && (
          <p className="text-[10px] font-mono text-slate-500 mb-6 uppercase tracking-widest">
            {timerProf.label}: {formatTime(effectiveTimeLimit)}
            {ptsd ? " (soft limit)" : ""}
          </p>
        )}
        <div className="flex gap-3 flex-wrap">
          <button type="button" className={OC_SHELL.btnPrimary} onClick={startScenario}>
            {ptsd ? "Begin this scene" : "Open window — respond now"}
          </button>
          {cfg?.exitButton && (
            <button type="button" className={OC_SHELL.btnGhost} onClick={() => setPhase("complete")}>
              Step out
            </button>
          )}
        </div>
      </div>
    );

    return (
      <div className={OC_SHELL.page} style={OC_SHELL.pageHeight}>
        <div className="border-b border-blue-900/30 px-8 py-4 shrink-0 flex justify-between">
          <span className={OC_SHELL.title}>Assessment 4 — OC</span>
          <span className="text-xs" style={{ color: accent }}>{cfg.label}</span>
        </div>
        <div className="flex-1 overflow-y-auto">{content}</div>
      </div>
    );
  }

  // ═══ ACTIVE ════════════════════════════════════════════════════════════════
  if (phase === "active" && scenario && cfg) {
    const showBrief = !briefCollapsed || briefExpanded;

    return (
      <div
        className={OC_SHELL.page}
        style={{
          ...OC_SHELL.pageHeight,
          filter: `brightness(${1 - dimLevel * 0.65})`,
          transition: "filter 0.6s ease",
        }}
      >
        <div className="border-b border-blue-900/30 px-6 py-3 shrink-0 flex justify-between items-center bg-[#070f1c] z-10 relative">
          <span className={OC_SHELL.title}>Assessment 4 — OC</span>
          <div className="text-right">
            <p className="text-[9px] font-mono uppercase text-slate-600">{timerProf.label}</p>
            <span className="font-mono text-lg font-bold tabular-nums" style={{ color: timerColor }}>
              {timerActive ? formatTime(timeLeft) : cfg.label}
            </span>
          </div>
        </div>

        {blackout && (
          <OcBlackoutOverlay
            message={ptsd ? "SCENE TIME ENDED" : "WINDOW CLOSED"}
            subMessage={
              ptsd
                ? "Saving what you wrote. Next scene when ready."
                : "Scenario closed — response locked."
            }
          />
        )}

        <div className="flex-1 overflow-y-auto relative z-[1]">
          {cfg?.hasPressureAccumulation && (
            <div
              className="pointer-events-none fixed inset-0 z-[5]"
              style={{
                background: `radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,${dimLevel * 0.92}) 100%)`,
              }}
            />
          )}
          {buzzerActive && (
            <div
              className="pointer-events-none fixed inset-0 z-[6]"
              style={{ background: redPulse ? "rgba(220,38,38,0.25)" : "rgba(220,38,38,0.08)" }}
            />
          )}
          {timerActive && (
            <div className="sticky top-0 h-1.5 bg-slate-900 z-20">
              <div
                className="h-full transition-all duration-1000"
                style={{ width: `${(1 - pressureLevel) * 100}%`, background: timerColor }}
              />
            </div>
          )}

          {ackOverlay && (
            <OcPopupBanner
              lines={ackOverlay.lines || ackOverlay}
              variant={ackOverlay.variant || "reward"}
              accentColor={accent}
              className="top-20"
            />
          )}
          {activePopup && (
            <OcPopupBanner
              lines={activePopup.lines}
              variant={activePopup.variant}
              accentColor={accent}
            />
          )}

          <div className="max-w-3xl mx-auto p-6 pb-24 relative z-[2]">
            <p className={OC_SHELL.label}>{scenario.title}</p>

            {showBrief ? (
              <details open className="mb-4">
                <summary className="text-[10px] font-mono uppercase text-slate-500 cursor-pointer mb-2">
                  Scenario brief
                </summary>
                <div className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed border-l-2 border-blue-900/50 pl-4 max-h-40 overflow-y-auto">
                  {scenario.content}
                </div>
              </details>
            ) : (
              <button
                type="button"
                className="text-[10px] text-slate-500 underline mb-4"
                onClick={() => setBriefExpanded(true)}
              >
                [Expand brief]
              </button>
            )}

            <div className="text-[10px] text-slate-500 mb-3 space-y-1">
              {instructions.map((inst, i) => (
                <div key={i}>
                  <span style={{ color: accent }}>{i + 1}. </span>
                  {inst}
                </div>
              ))}
            </div>

            <textarea
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                lastActivityRef.current = Date.now();
              }}
              onKeyDown={(e) => keystrokeRef.current.recordKeyEvent(e)}
              className={OC_SHELL.textarea}
              rows={12}
              placeholder="Write your response..."
              autoFocus
              spellCheck={false}
            />

            <div className="flex justify-between items-center mt-4 flex-wrap gap-3">
              <span className="text-[10px] font-mono text-slate-500">
                {answer.trim()
                  ? `${answer.split(/\s+/).filter(Boolean).length} words · ${keystrokeRef.current.keystrokes} keys`
                  : "Awaiting input"}
              </span>
              <div className="flex gap-2">
                {cfg?.exitButton && (
                  <button type="button" className={OC_SHELL.btnGhost} onClick={() => setPhase("complete")}>
                    Step out
                  </button>
                )}
                <button
                  type="button"
                  className={OC_SHELL.btnPrimary}
                  disabled={!answer.trim()}
                  onClick={() => handleSubmit(false)}
                >
                  {ptsd ? "Complete scene" : "Transmit response"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══ PAUSE ═════════════════════════════════════════════════════════════════
  if (phase === "pause" && cfg) {
    const last = answers[answers.length - 1];
    const isLast = scenarioIndex >= scenarios.length - 1;
    return (
      <div className={OC_SHELL.page} style={OC_SHELL.pageHeight}>
        <div className="border-b border-blue-900/30 px-8 py-4 shrink-0">
          <span className={OC_SHELL.title}>Assessment 4 — OC</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
          <div className={`${OC_SHELL.panel} max-w-lg w-full p-8 text-center`}>
            <OcPopupBanner
              lines={
                typeof cfg.popups.ack === "function"
                  ? [cfg.popups.ack(scenarioIndex + 1, scenarios.length)]
                  : [cfg.popups.ack]
              }
              variant={ptsd ? "care" : "reward"}
              accentColor={accent}
              className="relative !top-0 !left-0 !translate-x-0 mb-6 !max-w-none !w-full"
            />
            <OcRewardVisual
              userType={userType}
              completedCount={scenarioIndex + 1}
              totalScenarios={scenarios.length}
              accentColor={accent}
            />
            <p className="text-xs text-slate-500 mb-4">{last?.title}</p>
            <p className="text-xs text-slate-600 line-clamp-4 mb-8">{last?.answer?.slice(0, 200)}...</p>
            {!isLast ? (
              <button type="button" className={OC_SHELL.btnPrimary} onClick={nextScenario}>
                {ptsd ? `Continue to scene ${scenarioIndex + 2}` : `Proceed to scenario ${scenarioIndex + 2}`}
              </button>
            ) : (
              <button type="button" className={OC_SHELL.btnPrimary} onClick={nextScenario}>
                View summary
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══ COMPLETE ══════════════════════════════════════════════════════════════
  if (phase === "complete" && cfg) {
    const allDone = answers.length === scenarios.length;
    return (
      <div className={OC_SHELL.page} style={OC_SHELL.pageHeight}>
        <div className="border-b border-blue-900/30 px-8 py-4 shrink-0">
          <span className={OC_SHELL.title}>Assessment 4 — OC</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className={`${OC_SHELL.panel} max-w-lg w-full p-8 text-center`}>
            <p className={OC_SHELL.label}>Session complete</p>
            <h2 className="text-2xl font-bold text-white mt-3 mb-2">
              {allDone ? cfg.popups.sessionClose : cfg.popups.return?.(1) ?? "Session ended"}
            </h2>
            <p className="text-sm text-slate-400 whitespace-pre-line mb-6">
              {allDone
                ? cfg.popups.sessionCloseSub
                : typeof cfg.popups.return === "string"
                  ? cfg.popups.return
                  : "You can return when ready."}
            </p>
            <OcRewardVisual
              userType={userType}
              completedCount={answers.length}
              totalScenarios={scenarios.length}
              accentColor={accent}
            />
            {saveStatus === "saving" && <p className="text-xs text-slate-500">Saving...</p>}
            {saveStatus === "saved" && <p className="text-xs text-emerald-500">Transmission complete.</p>}
            {saveStatus === "error" && <p className="text-xs text-red-400">Save failed. Contact evaluator.</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={OC_SHELL.page} style={OC_SHELL.pageHeight}>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className={`${OC_SHELL.panel} max-w-md w-full p-8 text-center`}>
          <p className={OC_SHELL.label}>OC Module</p>
          <h2 className="text-xl font-bold text-white mt-2 mb-3">Start assessment</h2>
          <p className="text-slate-400 text-sm mb-6">
            {initialType
              ? "Reloading your profile…"
              : "Select your operator profile to begin the operant conditioning session."}
          </p>
          <button
            type="button"
            className={OC_SHELL.btnPrimary}
            onClick={() => {
              const resolved = resolveInitialOcType(propUserType);
              if (resolved) {
                setUserType(resolved);
                resetToIntro();
              } else {
                setPhase("selectType");
              }
            }}
          >
            {initialType ? "Continue" : "Select profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
