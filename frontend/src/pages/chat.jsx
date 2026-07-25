import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, Send, Heart, Shield, Sparkles, User, ChevronRight } from "lucide-react";
import { getStoredName, isTraumaUser, getEmaUserType } from "../lib/userProfile";

const MAX_TURNS = 8;
const API = `${import.meta.env.VITE_API_BASE_URL}/mi`;

const FOCUS_OPTIONS = [
  { key: "1", label: "Motivation to Join Defence", icon: "◈", hint: "Purpose & drive" },
  { key: "2", label: "Handling Setbacks and Failures", icon: "◆", hint: "Resilience under pressure" },
  { key: "3", label: "Discipline and Routine Building", icon: "◉", hint: "Structure & habits" },
  { key: "4", label: "Fear or Self-Doubt About Selection", icon: "◇", hint: "Confidence & doubt" },
  { key: "5", label: "Long-Term Commitment and Sacrifice", icon: "◎", hint: "Sustainability & values" },
];

const FOCUS_LABELS = Object.fromEntries(FOCUS_OPTIONS.map((o) => [o.key, o.label]));

const ts = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function loadEmaContext() {
  try {
    const handoff = JSON.parse(localStorage.getItem("emaMiHandoff") || "null");
    const ema_export = JSON.parse(localStorage.getItem("emaExport") || "null");
    const user_type = getEmaUserType();
    return { handoff, ema_export, user_type };
  } catch {
    return { handoff: null, ema_export: null, user_type: getEmaUserType() };
  }
}

function MiAvatar({ size = "md", accent = "#58a6ff", trauma = false, pulse = false, className = "" }) {
  const sizes = { sm: "w-10 h-10", md: "w-12 h-12", lg: "w-20 h-20", xl: "w-32 h-32" };
  const iconSizes = { sm: 18, md: 22, lg: 32, xl: 44 };
  const Icon = trauma ? Heart : Brain;
  return (
    <div
      className={`relative shrink-0 rounded-full p-[2px] ${pulse ? "mi-avatar-pulse" : ""} ${className}`}
      style={{ background: `linear-gradient(135deg, ${accent}88, ${accent}22)` }}
    >
      <div
        className={`${sizes[size]} rounded-full flex items-center justify-center bg-[#0c1528] border border-slate-700/60`}
      >
        <Icon size={iconSizes[size]} style={{ color: accent }} strokeWidth={1.75} />
      </div>
      {pulse && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#050b18]"
          style={{ background: accent }}
          aria-hidden
        />
      )}
    </div>
  );
}

function CounselorRow({ children, accent, trauma, pulse }) {
  return (
    <div className="flex justify-start items-end gap-3 max-w-2xl w-full mi-fade-in">
      <MiAvatar size="md" accent={accent} trauma={trauma} pulse={pulse} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function TypingIndicator({ accent }) {
  return (
    <div className="flex gap-1.5 items-center py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full mi-typing-dot"
          style={{ background: accent, animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function TurnProgress({ turn, max, accent }) {
  const pct = Math.min(100, (turn / max) * 100);
  return (
    <div className="flex items-center gap-3 min-w-[140px]">
      <div className="flex-1 h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accent}99, ${accent})` }}
        />
      </div>
      <span className="text-[10px] font-mono tabular-nums text-slate-500 whitespace-nowrap">
        {turn}/{max}
      </span>
    </div>
  );
}

export default function Chat() {
  const navigate = useNavigate();
  const emaCtx = loadEmaContext();
  const displayName = getStoredName();
  const traumaProfile = isTraumaUser();

  const accent = traumaProfile ? "#f48fb1" : "#58a6ff";
  const accentSoft = traumaProfile ? "#f48fb122" : "#58a6ff22";

  const [messages, setMessages] = useState([]);
  const [apiMessages, setApiMessages] = useState([]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("boot");
  const [focusChoice, setFocusChoice] = useState("");
  const [turnCount, setTurnCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [recommendedFocus, setRecommendedFocus] = useState("");

  const apiMessagesRef = useRef([]);
  const focusChoiceRef = useRef("");
  const emaCtxRef = useRef(emaCtx);
  const bootRef = useRef(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const firstName = useMemo(() => displayName.split(/\s+/)[0] || "there", [displayName]);
  const focusLabel = FOCUS_LABELS[focusChoice] || (traumaProfile ? "Wellbeing & recovery" : "");

  useEffect(() => { apiMessagesRef.current = apiMessages; }, [apiMessages]);
  useEffect(() => { focusChoiceRef.current = focusChoice; }, [focusChoice]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => {
    if (!loading && phase !== "done" && phase !== "finishing" && phase !== "boot") {
      inputRef.current?.focus();
    }
  }, [loading, phase]);

  const token = localStorage.getItem("token");
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const pushAssistant = (content, extra = {}) =>
    setMessages((prev) => [...prev, { role: "assistant", content, time: ts(), ...extra }]);
  const pushUser = (content) =>
    setMessages((prev) => [...prev, { role: "user", content, time: ts() }]);

  const miStartBody = (focus_choice) => ({
    focus_choice,
    user_type: emaCtxRef.current.user_type,
    ema_export: emaCtxRef.current.ema_export,
  });

  const miChatBody = (messages, is_final) => ({
    messages,
    is_final,
    focus_choice: focusChoiceRef.current,
    user_type: emaCtxRef.current.user_type,
    ema_export: emaCtxRef.current.ema_export,
  });

  const startMiSession = useCallback(async (focus_choice) => {
    const res = await fetch(`${API}/start`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(miStartBody(focus_choice)),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    setApiMessages(data.messages);
    apiMessagesRef.current = data.messages;

    const fc = data.focus_choice || focus_choice;
    setFocusChoice(fc);
    focusChoiceRef.current = fc;

    pushAssistant(data.opener);
    setPhase("chat");
  }, []);

  const finishSession = async (finalMessages) => {
    try {
      const res = await fetch(`${API}/finish`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          focus_choice: focusChoiceRef.current,
          messages: finalMessages,
          user_type: emaCtxRef.current.user_type,
          ema_export: emaCtxRef.current.ema_export,
        }),
      });
      if (!res.ok) throw new Error("Finish failed");
    } catch (err) {
      console.error("finishSession error:", err);
    } finally {
      pushAssistant("Your responses have been recorded. Thank you for sharing openly today.", {
        variant: "done",
      });
      setPhase("done");
    }
  };

  const selectFocus = async (key) => {
    if (loading || phase !== "focus") return;
    const opt = FOCUS_OPTIONS.find((o) => o.key === key);
    if (!opt) return;
    pushUser(`${key}. ${opt.label}`);
    setLoading(true);
    try {
      await startMiSession(key);
    } catch {
      pushAssistant("Couldn't start that focus area — please try again.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;

    const run = async () => {
      setLoading(true);
      const trauma = isTraumaUser();
      const handoff = emaCtxRef.current.handoff;
      const rec = handoff?.primary_focus_choice;
      const summary = handoff?.context_summary;

      try {
        if (trauma) {
          pushAssistant(
            `Hello ${firstName} — I'm glad you're here.\n\nThis is a calm, supportive space. We'll draw on your wellbeing check-in (TRAM), not defence selection topics.`,
            { variant: "welcome" }
          );
          pushAssistant("When you're ready, we'll begin at a pace that feels right for you...", {
            variant: "system",
          });
          await startMiSession("trauma");
          return;
        }

        if (rec && FOCUS_LABELS[rec]) {
          setRecommendedFocus(String(rec));
          pushAssistant(
            `Hello ${firstName}. Based on your EMA check-in, I recommend we explore **${FOCUS_LABELS[rec]}** today.`,
            { variant: "welcome" }
          );
          if (summary) {
            pushAssistant(summary, { variant: "insight", label: "From your check-in" });
          }
          pushAssistant("Starting your guided session now...", { variant: "system" });
          await startMiSession(String(rec));
          return;
        }

        if (rec) setRecommendedFocus(String(rec));
        pushAssistant(
          `Hello ${firstName}. What would you like to explore in today's Motivational Interview?`,
          { variant: "welcome" }
        );
        if (summary) {
          pushAssistant(summary, { variant: "insight", label: "From your check-in" });
        }
        pushAssistant("Pick a focus area below — or type 1–5 in the chat.", {
          variant: "focus-select",
          recommended: rec ? String(rec) : "",
        });
        setPhase("focus");
      } catch {
        pushAssistant("Error starting session. Please refresh and try again.", { variant: "error" });
        setPhase("focus");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [firstName, startMiSession]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userInput = input.trim();
    setInput("");
    pushUser(userInput);

    if (phase === "focus") {
      if (!FOCUS_LABELS[userInput]) {
        pushAssistant("Tap a focus card above, or enter a number from 1 to 5.", { variant: "hint" });
        return;
      }
      setLoading(true);
      try {
        await startMiSession(userInput);
      } catch {
        pushAssistant("Error starting session. Please try again.", { variant: "error" });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (phase === "chat") {
      const newTurn = turnCount + 1;
      const isFinal = newTurn >= MAX_TURNS;
      const updated = [...apiMessagesRef.current, { role: "user", content: userInput }];
      setLoading(true);
      try {
        const res = await fetch(`${API}/chat`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(miChatBody(updated, isFinal)),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setApiMessages(data.messages);
        apiMessagesRef.current = data.messages;
        setTurnCount(newTurn);
        pushAssistant(data.reply);

        if (isFinal) {
          setPhase("finishing");
          await finishSession(data.messages);
        }
      } catch {
        pushAssistant("Error connecting to the counselor service. Please try again.", { variant: "error" });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (phase === "done" || phase === "finishing") {
      pushAssistant("This session has ended. Continue to the next assessment when you're ready.", {
        variant: "hint",
      });
    }
  };

  const handleEndSession = async () => {
    if (phase !== "chat" || loading) return;
    setPhase("finishing");
    setLoading(true);
    await finishSession(apiMessagesRef.current);
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
      e.target.style.height = "auto";
    }
  };

  const isDone = phase === "done" || phase === "finishing";
  const inputDisabled = isDone || loading || phase === "boot" || phase === "finishing";

  const handleInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  const statusText =
    loading && phase === "boot"
      ? "Preparing your session..."
      : loading
        ? "Reflecting on your words..."
        : phase === "focus"
          ? "Awaiting your focus choice"
          : phase === "chat"
            ? "In conversation"
            : phase === "done"
              ? "Session complete"
              : "Standing by";

  return (
    <div
      className="text-white flex flex-col overflow-hidden relative"
      style={{ height: "calc(100vh - 56px)", background: "#050b18" }}
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute -top-32 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: accent }}
        />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-10 bg-indigo-600" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-blue-900/30 px-6 md:px-8 py-4 flex items-center justify-between shrink-0 backdrop-blur-sm bg-[#050b18]/80">
        <div className="flex items-center gap-3">
          <MiAvatar size="sm" accent={accent} trauma={traumaProfile} pulse={loading && phase === "chat"} />
          <div>
            <div className="flex items-center gap-2">
              <span
                className="font-semibold tracking-widest text-sm uppercase"
                style={{ color: accent }}
              >
                Assessment 2 — MI
              </span>
              <Sparkles size={14} className="text-amber-400/70" />
            </div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mt-0.5">
              {traumaProfile ? "Wellbeing counselor · TRAM-linked" : "Motivational interviewing · EMA-linked"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-5 flex-wrap justify-end">
          {phase === "chat" && focusLabel && (
            <span
              className="hidden sm:inline text-xs px-3 py-1 rounded-full border max-w-[200px] truncate"
              style={{ borderColor: accent + "44", color: accent, background: accentSoft }}
              title={focusLabel}
            >
              {focusLabel}
            </span>
          )}
          {phase === "chat" && <TurnProgress turn={turnCount} max={MAX_TURNS} accent={accent} />}
          {emaCtx.handoff && (
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-emerald-400/90 border border-emerald-800/40 px-2 py-1 rounded-full">
              <Shield size={10} /> EMA linked
            </span>
          )}
          <span className="text-xs text-slate-500 hidden lg:inline">{displayName}</span>
          {phase === "chat" && (
            <button
              onClick={handleEndSession}
              className="text-xs text-red-400/90 border border-red-800/50 px-3 py-1.5 rounded-lg hover:bg-red-900/25 transition"
            >
              End early
            </button>
          )}
        </div>
      </div>

      <div className="relative z-10 flex-1 flex min-h-0">
        {/* Sidebar presence */}
        <aside className="hidden lg:flex flex-col items-center justify-end w-48 xl:w-56 shrink-0 border-r border-blue-900/20 bg-[#070f1c]/60 px-4 pb-8 pt-6">
          <MiAvatar size="xl" accent={accent} trauma={traumaProfile} pulse={loading} className="mb-4" />
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 text-center">
            {traumaProfile ? "Care counselor" : "MI counselor"}
          </p>
          <p className="text-xs text-slate-400 text-center mt-2 leading-relaxed px-1">{statusText}</p>
          {phase === "chat" && (
            <div className="mt-6 w-full space-y-2 text-[10px] text-slate-600 font-mono">
              <div className="flex justify-between">
                <span>Turns</span>
                <span style={{ color: accent }}>{turnCount}/{MAX_TURNS}</span>
              </div>
              <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(turnCount / MAX_TURNS) * 100}%`,
                    background: accent,
                  }}
                />
              </div>
            </div>
          )}
        </aside>

        {/* Messages */}
        <div className="flex-1 p-5 md:p-8 overflow-y-auto space-y-5">
          {messages.map((m, i) => {
            if (m.variant === "focus-select") {
              const rec = m.recommended || recommendedFocus;
              return (
                <CounselorRow key={i} accent={accent} trauma={traumaProfile}>
                  <div
                    className="rounded-2xl rounded-bl-md px-4 py-4 w-full border"
                    style={{ background: "#0c1528", borderColor: accent + "33" }}
                  >
                    <p className="text-sm text-blue-100/90 mb-4 leading-relaxed">{m.content}</p>
                    <div className="grid gap-2 sm:grid-cols-1">
                      {FOCUS_OPTIONS.map((opt) => {
                        const isRec = opt.key === rec;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            disabled={loading || phase !== "focus"}
                            onClick={() => selectFocus(opt.key)}
                            className="group flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
                            style={{
                              borderColor: isRec ? accent : accent + "33",
                              background: isRec ? accentSoft : "transparent",
                            }}
                          >
                            <span
                              className="text-lg w-8 h-8 flex items-center justify-center rounded-lg shrink-0"
                              style={{ color: accent, background: accent + "18" }}
                            >
                              {opt.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-100 flex items-center gap-2 flex-wrap">
                                <span className="text-slate-500 font-mono text-xs">{opt.key}.</span>
                                {opt.label}
                                {isRec && (
                                  <span
                                    className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider"
                                    style={{ color: accent, background: accent + "22" }}
                                  >
                                    Recommended
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">{opt.hint}</div>
                            </div>
                            <ChevronRight
                              size={16}
                              className="text-slate-600 group-hover:text-slate-300 shrink-0 transition-colors"
                            />
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] mt-3 text-slate-600">{m.time}</p>
                  </div>
                </CounselorRow>
              );
            }

            if (m.variant === "insight") {
              return (
                <div key={i} className="flex justify-center mi-fade-in">
                  <div
                    className="max-w-xl w-full px-4 py-3 rounded-xl border text-xs leading-relaxed text-slate-300"
                    style={{ borderColor: accent + "44", background: accentSoft }}
                  >
                    <div
                      className="text-[10px] font-mono uppercase tracking-widest mb-1.5"
                      style={{ color: accent }}
                    >
                      {m.label || "Insight"}
                    </div>
                    {m.content}
                  </div>
                </div>
              );
            }

            if (m.variant === "welcome") {
              return (
                <CounselorRow key={i} accent={accent} trauma={traumaProfile}>
                  <div
                    className="rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed border"
                    style={{
                      background: `linear-gradient(135deg, ${accentSoft}, #0c1528)`,
                      borderColor: accent + "44",
                      color: "#e2e8f0",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={14} style={{ color: accent }} />
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                        Session opening
                      </span>
                    </div>
                    {m.content.split("**").map((part, j) =>
                      j % 2 === 1 ? (
                        <strong key={j} style={{ color: accent }}>
                          {part}
                        </strong>
                      ) : (
                        <span key={j}>{part}</span>
                      )
                    )}
                    <p className="text-[10px] mt-2 text-slate-600">{m.time}</p>
                  </div>
                </CounselorRow>
              );
            }

            if (m.variant === "system") {
              return (
                <div key={i} className="flex justify-center mi-fade-in">
                  <p className="text-[11px] text-slate-500 font-mono tracking-wide px-3 py-1 rounded-full border border-slate-800/80 bg-slate-900/30">
                    {m.content}
                  </p>
                </div>
              );
            }

            if (m.variant === "hint") {
              return (
                <div key={i} className="flex justify-center mi-fade-in">
                  <p className="text-xs text-slate-500 italic">{m.content}</p>
                </div>
              );
            }

            if (m.variant === "error") {
              return (
                <div key={i} className="flex justify-center mi-fade-in">
                  <div className="bg-red-900/15 border border-red-700/30 text-red-400 px-4 py-2 rounded-xl text-xs">
                    {m.content}
                  </div>
                </div>
              );
            }

            if (m.variant === "done") {
              return (
                <div key={i} className="mi-fade-in">
                  <CounselorRow accent={accent} trauma={traumaProfile}>
                    <div className="bg-[#0a1f10] border border-emerald-800/40 text-emerald-100 rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed">
                      {m.content}
                      <p className="text-[10px] mt-2 text-emerald-700">{m.time}</p>
                    </div>
                  </CounselorRow>
                  <div className="flex justify-center mt-8 gap-3 flex-wrap">
                    <button
                      onClick={() => navigate("/bae")}
                      className="group flex items-center gap-2 text-white text-sm font-semibold px-8 py-3 rounded-xl transition hover:scale-[1.02] active:scale-[0.98]"
                      style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
                    >
                      Continue to Assessment 3
                      <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            }

            if (m.role === "user") {
              return (
                <div key={i} className="flex justify-end items-end gap-2 mi-fade-in">
                  <div className="max-w-xl">
                    <div
                      className="px-4 py-3 rounded-2xl rounded-br-md text-sm leading-relaxed whitespace-pre-line shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, ${accent}cc, ${accent}99)`,
                        boxShadow: `0 8px 24px ${accent}22`,
                      }}
                    >
                      {m.content}
                    </div>
                    <p className="text-[10px] text-slate-600 text-right mt-1 pr-1">{m.time}</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                    <User size={16} className="text-slate-400" />
                  </div>
                </div>
              );
            }

            return (
              <CounselorRow key={i} accent={accent} trauma={traumaProfile}>
                <div className="bg-[#0c1528] border border-blue-900/40 text-blue-100 rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed whitespace-pre-line shadow-sm">
                  {m.content}
                  <p className="text-[10px] mt-2 text-slate-600">{m.time}</p>
                </div>
              </CounselorRow>
            );
          })}

          {loading && (
            <CounselorRow accent={accent} trauma={traumaProfile} pulse>
              <div className="bg-[#0c1528] border border-blue-900/40 px-4 py-3 rounded-2xl rounded-bl-md">
                <TypingIndicator accent={accent} />
                <p className="text-[11px] text-slate-500 mt-2">
                  {phase === "boot" ? "Setting up your session" : "Counselor is reflecting"}
                </p>
              </div>
            </CounselorRow>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="relative z-10 border-t border-blue-900/30 p-5 md:p-6 shrink-0 backdrop-blur-sm bg-[#050b18]/90">
        <div className="flex gap-3 justify-center max-w-3xl mx-auto w-full">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={
              isDone
                ? "Session complete."
                : phase === "boot"
                  ? "Preparing your session..."
                  : phase === "focus"
                    ? "Or type 1–5 to choose a focus..."
                    : "Share your thoughts — press Enter to send"
            }
            disabled={inputDisabled}
            rows={1}
            className="flex-1 bg-[#0c1528] rounded-xl px-4 py-3 text-sm outline-none border transition-all placeholder-slate-600 disabled:opacity-40 disabled:cursor-not-allowed resize-none overflow-hidden leading-relaxed"
            style={{ borderColor: accent + "44" }}
            onFocus={(e) => { e.target.style.borderColor = accent; }}
            onBlur={(e) => { e.target.style.borderColor = accent + "44"; }}
          />
          <button
            onClick={sendMessage}
            disabled={inputDisabled || !input.trim()}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{ background: input.trim() && !inputDisabled ? accent : "#1e293b", color: "#fff" }}
          >
            <Send size={16} />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
        {phase === "chat" && !isDone && (
          <p className="text-center text-[10px] text-slate-600 mt-3 font-mono">
            {MAX_TURNS - turnCount} reflection{MAX_TURNS - turnCount !== 1 ? "s" : ""} remaining · Shift+Enter for new line
          </p>
        )}
      </div>

      <style>{`
        @keyframes mi-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .mi-fade-in { animation: mi-fade-in 0.35s ease-out forwards; }
        @keyframes mi-typing {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        .mi-typing-dot { animation: mi-typing 1.2s ease-in-out infinite; }
        @keyframes mi-avatar-pulse-ring {
          0% { box-shadow: 0 0 0 0 ${accent}55; }
          70% { box-shadow: 0 0 0 8px ${accent}00; }
          100% { box-shadow: 0 0 0 0 ${accent}00; }
        }
        .mi-avatar-pulse { animation: mi-avatar-pulse-ring 2s ease-out infinite; }
      `}</style>
    </div>
  );
}
