import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Send } from "lucide-react";
import { getStoredName, cbdtModeFromProfile, isTraumaUser } from "../lib/userProfile";
import { apiFetch } from "../lib/apiFetch";

const API = `${import.meta.env.VITE_API_BASE_URL}/cbdt`;
const VANGUARD_AVATAR = "/vanguard_character.png";

const ts = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function VanguardAvatar({ size = "md", accentColor = "#58a6ff", pulse = false, className = "" }) {
  const sizes = {
    sm: "w-10 h-10",
    md: "w-12 h-12",
    lg: "w-28 h-28",
    xl: "w-40 h-40",
  };
  return (
    <div
      className={`relative shrink-0 rounded-full p-0.5 ${pulse ? "animate-pulse" : ""} ${className}`}
      style={{ background: `linear-gradient(135deg, ${accentColor}66, ${accentColor}22)` }}
    >
      <img
        src={VANGUARD_AVATAR}
        alt="Vanguard"
        className={`${sizes[size]} rounded-full object-cover object-top bg-[#0c1528] border border-slate-700/80`}
      />
      {pulse && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#050b18] bg-blue-400"
          aria-hidden
        />
      )}
    </div>
  );
}

function BotMessageRow({ children, accentColor = "#58a6ff", pulse = false }) {
  return (
    <div className="flex justify-start items-end gap-3 max-w-2xl w-full">
      <VanguardAvatar size="md" accentColor={accentColor} pulse={pulse} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

const MODES = [
  {
    key:   "nda",
    label: "NDA / Defence Cadet",
    sub:   "Vanguard-1 · Tri-Service Protocol",
    icon:  "◈",
    color: "#58a6ff",
  },
  {
    key:   "army",
    label: "Indian Army",
    sub:   "Vanguard-Army · CBT + DBT Integration",
    icon:  "◆",
    color: "#39d353",
  },
  {
    key:   "navy",
    label: "Indian Navy",
    sub:   "Vanguard-Navy · Sea Duty & Isolation Protocol",
    icon:  "◉",
    color: "#4fc3f7",
  },
  {
    key:   "air_force",
    label: "Indian Air Force",
    sub:   "Vanguard-Air · High-Consequence Performance Protocol",
    icon:  "◇",
    color: "#b39ddb",
  },
  {
    key:   "terror_survivor",
    label: "Terror Attack Survivor",
    sub:   "Vanguard-Care · TF-CBT Trauma Protocol",
    icon:  "◎",
    color: "#f48fb1",
  },
];

export default function CBDT() {
  const navigate  = useNavigate();
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [step,      setStep]      = useState("boot");
  const [name,      setName]      = useState(() => getStoredName());
  const [sessionId, setSessionId] = useState(null);
  const [turn,      setTurn]      = useState(0);
  const [riskFlags, setRiskFlags] = useState([]);
  const [modeKey,   setModeKey]   = useState(null);
  const sessionIdRef = useRef(null);
  const token = localStorage.getItem("token");
  const authH = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };

  const startSession = useCallback(async (participantName, mode) => {
    const data = await apiFetch(`${API}/session/start`, {
      method: "POST",
      headers: authH,
      body: JSON.stringify({ name: participantName, mode }),
    });
    setSessionId(data.session_id);
    sessionIdRef.current = data.session_id;
    setMessages(prev => {
      const filtered = prev.filter(x => x.variant !== "loading");
      return [...filtered, { role: "bot", text: data.opener, time: ts() }];
    });
    setStep("session");
    setTimeout(() => inputRef.current?.focus(), 100);
    return data;
  }, [token]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (!loading && step !== "done" && step !== "boot" && step !== "starting") {
      inputRef.current?.focus();
    }
  }, [loading, step]);

  const pushBot = (text, extra = {}) =>
    setMessages(prev => [...prev, { role: "bot", text, time: ts(), ...extra }]);
  const pushUser = (text) =>
    setMessages(prev => [...prev, { role: "user", text, time: ts() }]);

  const initRef = useRef(false);
  const runBoot = useCallback(async () => {
    const participantName = getStoredName();
    const mode = cbdtModeFromProfile();
    setName(participantName);
    setModeKey(mode);
    pushBot(`Hello ${participantName.split(/\s+/)[0]}.\n\nVanguard is ready for your session.`);
    pushBot("Initialising session...", { variant: "loading" });
    setStep("starting");
    try {
      await startSession(participantName, mode);
    } catch (e) {
      const msg = e.message || "Could not connect to Vanguard.";
      setMessages(prev => {
        const filtered = prev.filter(x => x.variant !== "loading");
        return [
          ...filtered,
          {
            role: "bot",
            text: `Session could not start.\n\n${msg}\n\nEnsure ml-services (port 5001) and user backend (port 5000) are running, then tap Retry.`,
            time: ts(),
            variant: "error",
          },
        ];
      });
      setStep("error");
    }
  }, [startSession]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    runBoot();
  }, [runBoot]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const val = input.trim();
    setInput("");
    pushUser(val);

    if (step === "session") {
      if (!sessionIdRef.current) {
        pushBot("No active session. Use Retry below to connect again.", { variant: "error" });
        return;
      }
      setLoading(true);
      try {
        const data = await apiFetch(`${API}/session/chat`, {
          method: "POST",
          headers: authH,
          body: JSON.stringify({ session_id: sessionIdRef.current, message: val }),
        });
        pushBot(data.reply);
        setTurn(data.turn);
        if (data.risk_flags?.length) setRiskFlags(f => [...f, ...data.risk_flags]);

        if (data.is_final) {
          await apiFetch(`${API}/session/finish`, {
            method: "POST",
            headers: authH,
            body: JSON.stringify({ session_id: sessionIdRef.current }),
          });
          pushBot("✅ Session complete. Your psychological profile has been saved.", { variant: "done" });
          setStep("done");
        }
      } catch (e) {
        pushBot(e.message || "Could not reach Vanguard. Check that ml-services is running on port 5001.", {
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleModeSelect = async (key) => {
    const m = MODES.find(x => x.key === key);
    setModeKey(key);
    pushUser(`${m.icon} ${m.label}`);
    pushBot("Initialising session...", { variant: "loading" });
    setStep("starting");

    try {
      await startSession(name, key);
    } catch (e) {
      setMessages(prev => {
        const filtered = prev.filter(x => x.variant !== "loading");
        return [
          ...filtered,
          { role: "bot", text: "Failed to start session: " + e.message, time: ts(), variant: "error" },
        ];
      });
      setStep("error");
    }
  };

const handleKeyDown = (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
    // Reset height after send
    e.target.style.height = "auto";
  }
};

  const isDone  = step === "done";
  const canChat = step === "session" && !!sessionIdRef.current;
  const modeObj = MODES.find(m => m.key === modeKey) || (isTraumaUser() ? MODES.find(m => m.key === "terror_survivor") : MODES[0]);

  // Derive accent colour for progress indicator
  const accentColor = modeObj?.color ?? "#58a6ff";

  const handleInput = (e) => {
  setInput(e.target.value);
  e.target.style.height = "auto";
  e.target.style.height = e.target.scrollHeight + "px";
};
  return (
    <div className="bg-[#050b18] text-white flex flex-col overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>

      {/* ── Internal Header ── */}
      <div className="border-b border-blue-900/30 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <VanguardAvatar size="sm" accentColor={accentColor} pulse={loading} />
          <div>
            <span className="text-blue-400 font-semibold tracking-widest text-sm uppercase block">
              Assessment 3 — CBDT
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Vanguard · Live session
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {modeObj && (
            <span style={{ color: modeObj.color }} className="font-medium">
              {modeObj.label}
            </span>
          )}
          {(step === "session" || step === "done") && (
            <span
              className="border px-3 py-1 rounded-full"
              style={{ borderColor: accentColor + "55", color: accentColor, background: accentColor + "18" }}
            >
              Turn {turn} / 7
            </span>
          )}
          {riskFlags.length > 0 && (
            <span className="bg-red-900/30 border border-red-700/40 px-3 py-1 rounded-full text-red-400">
              ⚠ {riskFlags.length} Flag{riskFlags.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* ── Messages + Vanguard presence ── */}
      <div className="flex-1 flex min-h-0">
        <aside className="hidden lg:flex flex-col items-center justify-end w-52 xl:w-60 shrink-0 border-r border-blue-900/20 bg-[#070f1c]/80 px-4 pb-8 pt-6">
          <VanguardAvatar size="xl" accentColor={accentColor} pulse={loading} className="mb-4" />
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 text-center">
            Vanguard
          </p>
          <p className="text-xs text-slate-400 text-center mt-1 leading-relaxed">
            {loading ? "Processing..." : step === "session" ? "In conversation with you" : "Standing by"}
          </p>
        </aside>

        <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-4">
        {messages.map((m, i) => {

          // Mode selector bubble
          if (m.variant === "mode-select") return (
            <BotMessageRow key={i} accentColor={accentColor}>
              <div className="bg-[#0c1528] border border-blue-900/40 text-blue-100 rounded-2xl rounded-bl-sm px-4 py-3 w-full">
                <p className="text-sm leading-relaxed whitespace-pre-line mb-4">{m.text}</p>
                <div className="flex flex-col gap-2">
                  {MODES.map(mode => (
                    <button
                      key={mode.key}
                      onClick={() => step === "mode" && handleModeSelect(mode.key)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all hover:bg-white/5"
                      style={{ borderColor: mode.color + "44", color: "#e2e8f0" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = mode.color}
                      onMouseLeave={e => e.currentTarget.style.borderColor = mode.color + "44"}
                    >
                      <span style={{ color: mode.color, fontSize: 18 }}>{mode.icon}</span>
                      <div>
                        <div className="text-sm font-semibold">{mode.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 tracking-widest uppercase">
                          {mode.sub}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="text-[10px] mt-3 opacity-30">{m.time}</div>
              </div>
            </BotMessageRow>
          );

          // Loading bubble
          if (m.variant === "loading") return (
            <BotMessageRow key={i} accentColor={accentColor} pulse>
              <div className="bg-[#0c1528] border border-blue-900/40 px-4 py-3 rounded-2xl rounded-bl-sm text-blue-400 text-sm animate-pulse">
                Initialising...
              </div>
            </BotMessageRow>
          );

          // Done bubble
          if (m.variant === "done") return (
            <div key={i}>
              <BotMessageRow accentColor={accentColor}>
                <div className="bg-[#0a1f10] border border-green-800/50 text-green-100 rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-line">
                  {m.text}
                  <div className="text-[10px] mt-2 opacity-30">{m.time}</div>
                </div>
              </BotMessageRow>
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => navigate("/oc", { state: { fromCbdt: true } })}
                  className="bg-blue-600 hover:bg-blue-500 transition text-white text-sm font-semibold px-8 py-3 rounded-xl"
                >
                  Move to Assessment 4
                </button>
              </div>
            </div>
          );

          // Error bubble
          if (m.variant === "error") return (
            <div key={i} className="flex flex-col items-center gap-3">
              <div className="bg-red-900/10 border border-red-700/30 text-red-300 px-4 py-3 rounded-xl text-xs max-w-lg whitespace-pre-line text-center">
                {m.text}
              </div>
              {step === "error" && i === messages.length - 1 && (
                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    pushBot("Retrying connection...", { variant: "loading" });
                    try {
                      await startSession(getStoredName(), cbdtModeFromProfile());
                    } catch (e) {
                      pushBot(`Still unable to connect: ${e.message}`, { variant: "error" });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="text-sm font-semibold px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 transition"
                >
                  Retry connection
                </button>
              )}
            </div>
          );

          // User bubble
          if (m.role === "user") return (
            <div key={i} className="flex justify-end">
              <div className="bg-blue-700/70 text-white rounded-2xl rounded-br-sm px-4 py-3 max-w-xl text-sm leading-relaxed whitespace-pre-line">
                {m.text}
              </div>
            </div>
          );

          // Bot bubble (default)
          return (
            <BotMessageRow key={i} accentColor={accentColor}>
              <div className="bg-[#0c1528] border border-blue-900/40 text-blue-100 rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-line">
                {m.text}
                <div className="text-[10px] mt-2 opacity-30">{m.time}</div>
              </div>
            </BotMessageRow>
          );
        })}

        {loading && step === "session" && (
          <BotMessageRow accentColor={accentColor} pulse>
            <div className="bg-[#0c1528] border border-blue-900/40 px-4 py-3 rounded-2xl rounded-bl-sm text-blue-400 text-sm">
              <span className="inline-flex gap-1 items-center">
                <span className="animate-pulse">Analysing</span>
                <span className="animate-bounce">.</span>
                <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
              </span>
            </div>
          </BotMessageRow>
        )}

        <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input ── */}
      <div className="border-t border-blue-900/30 p-6 shrink-0">
        <div className="flex gap-3 justify-center items-end max-w-3xl mx-auto w-full">
          <VanguardAvatar size="sm" accentColor={accentColor} pulse={loading} className="hidden sm:block mb-1" />
          <textarea
  ref={inputRef}
  value={input}
  onChange={handleInput}
  onKeyDown={handleKeyDown}
  placeholder={
              isDone
                ? "Session complete."
                : step === "error"
                  ? "Fix connection with Retry above"
                  : !canChat
                    ? "Waiting for session..."
                    : "Type your response..."
            }
  disabled={isDone || loading || !canChat}
  rows={1}
  className="w-full max-w-2xl bg-[#1b2435] rounded-xl px-4 py-3 text-sm outline-none
             border border-blue-900/40 focus:border-blue-500 transition-all
             placeholder-blue-900 disabled:opacity-40 disabled:cursor-not-allowed
             resize-none overflow-hidden leading-relaxed"
/>
          <button
            onClick={sendMessage}
            disabled={isDone || loading || !canChat}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 transition px-6 py-3 rounded-xl text-sm
                       font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={16} />
            Send
          </button>
        </div>
      </div>

    </div>
  );
}