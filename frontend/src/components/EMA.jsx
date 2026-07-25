import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ChevronRight, Heart, Shield, Sparkles } from "lucide-react";
import { getEmaUserType, getStoredName, isTraumaUser, syncEmaTypeWithRole } from "../lib/userProfile";
import { apiFetch } from "../lib/apiFetch";

const API = `${import.meta.env.VITE_API_BASE_URL}`;

const SCALE_DEFENCE = [
  { value: 1, label: "Strongly disagree", short: "1" },
  { value: 2, label: "Disagree", short: "2" },
  { value: 3, label: "Neutral", short: "3" },
  { value: 4, label: "Agree", short: "4" },
  { value: 5, label: "Strongly agree", short: "5" },
];

const SCALE_TRAM = [
  { value: 1, label: "Not at all", short: "1" },
  { value: 2, label: "A little", short: "2" },
  { value: 3, label: "Somewhat", short: "3" },
  { value: 4, label: "Quite a bit", short: "4" },
  { value: 5, label: "Extremely", short: "5" },
];

export default function EMA() {
  const navigate = useNavigate();
  const traumaProfile = isTraumaUser();
  const accent = traumaProfile ? "#f48fb1" : "#58a6ff";
  const accentSoft = traumaProfile ? "#f48fb118" : "#58a6ff18";

  const [meta, setMeta] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [phase, setPhase] = useState("loading");
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const userType = getEmaUserType();

  const token = localStorage.getItem("token");
  const displayName = getStoredName();
  const firstName = displayName.split(/\s+/)[0] || "there";

  const scaleOptions = traumaProfile ? SCALE_TRAM : SCALE_DEFENCE;

  useEffect(() => {
    syncEmaTypeWithRole();
    if (!token) {
      setLoadError("Please sign in to start the assessment.");
      setPhase("error");
      return;
    }
    setPhase("loading");
    setLoadError(null);
    const qs = new URLSearchParams({ user_type: userType });
    apiFetch(`${API}/ema/questions?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((data) => {
        const list = [];
        Object.keys(data.sections).forEach((section) => {
          data.sections[section].forEach((q) => {
            list.push({
              section,
              sectionLabel:
                data.sections_display?.[section] ||
                section.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
              question: q,
            });
          });
        });
        setMeta(data);
        setQuestions(list);
        setAnswers([]);
        setCurrent(0);
        setPhase("intro");
      })
      .catch((err) => {
        let msg = err.message || "Failed to load assessment";
        if (err.status === 401) {
          msg = "Session expired. Please log in again.";
        }
        setLoadError(msg);
        setPhase("error");
      });
  }, [token, userType]);

  const progressPct = questions.length
    ? Math.round(((current + (answers[current] ? 1 : 0)) / questions.length) * 100)
    : 0;

  const sectionBreak = useMemo(() => {
    if (!questions[current]) return false;
    if (current === 0) return true;
    return questions[current].section !== questions[current - 1].section;
  }, [questions, current]);

  const handleAnswer = (value) => {
    const updated = [...answers];
    updated[current] = value;
    setAnswers(updated);
  };

  const nextQuestion = () => {
    if (!answers[current]) return;
    if (current < questions.length - 1) {
      setCurrent(current + 1);
    } else {
      submitAssessment();
    }
  };

  const prevQuestion = () => {
    if (current > 0) setCurrent(current - 1);
  };

  const submitAssessment = async () => {
    const grouped = {};
    questions.forEach((q, index) => {
      if (!grouped[q.section]) grouped[q.section] = [];
      grouped[q.section].push(answers[index]);
    });

    setSubmitting(true);
    try {
      const data = await apiFetch(`${API}/ema/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_type: userType, answers: grouped }),
      });

      localStorage.setItem("emaResult", JSON.stringify(data));
      localStorage.setItem("emaCompleted", "true");
      localStorage.setItem("emaUserType", data.user_type || userType);
      if (data.mi_handoff) localStorage.setItem("emaMiHandoff", JSON.stringify(data.mi_handoff));
      if (data.ema_export) localStorage.setItem("emaExport", JSON.stringify(data.ema_export));

      navigate("/chat");
    } catch (err) {
      setLoadError(err.message || "Submission failed");
      setPhase("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === "loading") {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-[#050b18] text-white flex flex-col items-center justify-center gap-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ background: `radial-gradient(circle at 30% 20%, ${accent}, transparent 50%)` }} />
        <div className="relative flex flex-col items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center ema-pulse-ring"
            style={{ background: accentSoft, border: `1px solid ${accent}44` }}
          >
            {traumaProfile ? <Heart size={28} style={{ color: accent }} /> : <Activity size={28} style={{ color: accent }} />}
          </div>
          <p className="text-sm text-slate-400 font-mono tracking-widest uppercase">Loading check-in</p>
          <div className="w-48 h-1 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full w-1/3 rounded-full ema-shimmer" style={{ background: accent }} />
          </div>
        </div>
        <style>{`
          .ema-shimmer { animation: ema-shimmer 1.2s ease-in-out infinite; }
          @keyframes ema-shimmer { 0%,100% { transform: translateX(-100%); opacity: 0.5; } 50% { transform: translateX(200%); opacity: 1; } }
          .ema-pulse-ring { animation: ema-pulse 2s ease-in-out infinite; }
          @keyframes ema-pulse { 0%,100% { box-shadow: 0 0 0 0 ${accent}44; } 50% { box-shadow: 0 0 24px 4px ${accent}22; } }
        `}</style>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-[#050b18] text-white flex items-center justify-center p-8">
        <div className="max-w-md text-center border border-red-800/40 bg-red-950/20 rounded-2xl p-8">
          <p className="text-red-300 text-sm mb-4">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (phase === "intro" && meta) {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-[#050b18] text-white flex items-center justify-center p-6 relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-24 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-15"
          style={{ background: accent }}
        />
        <div
          className="max-w-2xl w-full rounded-2xl border p-8 md:p-10 relative z-10 ema-fade-in"
          style={{ borderColor: accent + "44", background: "linear-gradient(160deg, #0c1528 0%, #050b18 100%)" }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: accentSoft }}
            >
              {traumaProfile ? <Heart size={24} style={{ color: accent }} /> : <Shield size={24} style={{ color: accent }} />}
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                Assessment 1 — EMA
              </p>
              <h1 className="text-xl font-semibold" style={{ color: accent }}>
                {meta.label || meta.display_name}
              </h1>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line mb-2">
            Hello {firstName}.
          </p>
          <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-line mb-8">
            {meta.intro_message}
          </p>

          <div className="grid grid-cols-2 gap-3 mb-8 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
              <span className="text-slate-500 block mb-1">Questions</span>
              <span className="text-lg font-semibold text-slate-200">{questions.length}</span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
              <span className="text-slate-500 block mb-1">Model</span>
              <span className="text-lg font-semibold" style={{ color: accent }}>
                {meta.model}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 mb-6 font-mono">{meta.scale_label}</p>

          <button
            onClick={() => setPhase("questions")}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition hover:scale-[1.01] active:scale-[0.99]"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}
          >
            Begin check-in
            <ChevronRight size={18} />
          </button>
        </div>
        <style>{`.ema-fade-in { animation: ema-fade-in 0.4s ease-out; } @keyframes ema-fade-in { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>
      </div>
    );
  }

  const q = questions[current];
  const isLast = current === questions.length - 1;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#050b18] text-white flex flex-col relative overflow-hidden">
      <div
        className="pointer-events-none absolute -top-32 right-0 w-80 h-80 rounded-full blur-3xl opacity-10"
        style={{ background: accent }}
      />

      {/* Top bar */}
      <div className="relative z-10 border-b border-blue-900/30 px-6 md:px-10 py-4 shrink-0 backdrop-blur-sm bg-[#050b18]/85">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Sparkles size={16} style={{ color: accent }} />
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                {meta?.model} · {displayName}
              </p>
              <p className="text-sm font-medium text-slate-200">
                Question {current + 1} of {questions.length}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500">{progressPct}%</span>
        </div>
        <div className="max-w-3xl mx-auto mt-3 h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((current + 1) / questions.length) * 100}%`, background: accent }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10 relative z-10">
        <div
          key={current}
          className="max-w-3xl w-full rounded-2xl border p-6 md:p-10 ema-fade-in"
          style={{ borderColor: accent + "33", background: "#0c1528" }}
        >
          {sectionBreak && (
            <div
              className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full mb-5"
              style={{ color: accent, background: accentSoft, border: `1px solid ${accent}44` }}
            >
              {q.sectionLabel}
            </div>
          )}

          <p className="text-lg md:text-xl leading-relaxed text-slate-100 mb-8">{q.question}</p>

          <div className="grid gap-2 sm:grid-cols-5 mb-8">
            {scaleOptions.map((opt) => {
              const selected = answers[current] === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleAnswer(opt.value)}
                  className="flex flex-col items-center gap-2 p-3 md:p-4 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    borderColor: selected ? accent : "#334155",
                    background: selected ? accentSoft : "transparent",
                    boxShadow: selected ? `0 0 20px ${accent}22` : "none",
                  }}
                >
                  <span
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{
                      background: selected ? accent : "#1e293b",
                      color: selected ? "#fff" : "#94a3b8",
                    }}
                  >
                    {opt.short}
                  </span>
                  <span className="text-[10px] md:text-xs text-center text-slate-400 leading-tight">
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={prevQuestion}
              disabled={current === 0}
              className="px-5 py-3 rounded-xl border border-slate-700 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-30 transition"
            >
              Back
            </button>
            <button
              type="button"
              onClick={nextQuestion}
              disabled={!answers[current] || submitting}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-40"
              style={{ background: answers[current] ? accent : "#1e293b" }}
            >
              {submitting ? "Submitting..." : isLast ? "Complete check-in" : "Next question"}
              {!submitting && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </div>

      <style>{`.ema-fade-in { animation: ema-fade-in 0.35s ease-out; } @keyframes ema-fade-in { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
