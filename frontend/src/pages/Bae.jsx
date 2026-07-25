import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Send, User } from "lucide-react";
import { getStoredName, isTraumaUser } from "../lib/userProfile";
import { apiFetch } from "../lib/apiFetch";

const API = `${import.meta.env.VITE_API_BASE_URL}/bae`;

const ts = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const PHASE_LABEL = {
  init:       "Initialising",
  setup:      "Session Setup",
  tat_intro:  "TAT — Instructions",
  tat:        "TAT — Thematic Apperception Test",
  wat_intro:  "WAT — Instructions",
  wat:        "WAT — Word Association Test",
  srt_intro:  "SRT — Instructions",
  srt:        "SRT — Situation Reaction Test",
  sdt_intro:  "SDT — Instructions",
  sdt:        "SDT — Self Description Test",
  ba_intro:   "BA  — Instructions",
  ba:         "BA  — Behavioural Activation",
  done:       "Assessment Complete"
};

export default function Bae() {
  const navigate  = useNavigate();
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [phase,      setPhase]      = useState("setup");
  const [progress,   setProgress]   = useState("");

  const [sessionId,  setSessionId]  = useState(null);
  const sessionIdRef = useRef(null);
  const [setupStep,  setSetupStep]  = useState("boot");
  const [setupData,  setSetupData]  = useState({ name: getStoredName(), target: "", attempt: "" });

  const [tatPicture, setTatPicture] = useState(1);
  const [useImages,  setUseImages]  = useState(true);
  const useImagesRef = useRef(true);
  const [tatScene,   setTatScene]   = useState(null);

  const [watWords,   setWatWords]   = useState([]);
  const [watIndex,   setWatIndex]   = useState(0);
  const [watBatch,   setWatBatch]   = useState([]);

  const [srtList,    setSrtList]    = useState([]);
  const [srtIndex,   setSrtIndex]   = useState(0);

  const [sdtList,    setSdtList]    = useState([]);
  const [sdtIndex,   setSdtIndex]   = useState(0);

  const [baList,     setBaList]     = useState([]);
  const [baIndex,    setBaIndex]    = useState(0);
  const [baBatch,    setBaBatch]    = useState([]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (!loading && phase !== "done") inputRef.current?.focus();
  }, [loading, phase, tatScene, watIndex, srtIndex, sdtIndex, baIndex]);

  const pushBot = (text, extra = {}) =>
    setMessages(prev => [...prev, { role: "bot", text, time: ts(), ...extra }]);

  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const boot = async () => {
      const participantName = getStoredName();
      const trauma = isTraumaUser();
      const target = trauma ? "Personal Wellbeing Check-In" : "Service Assessment";
      const attempt = "1";
      setSetupData({ name: participantName, target, attempt });
      pushBot(
        trauma
          ? `Hello ${participantName.split(/\s+/)[0]}.\n\nThis is a wellbeing-oriented BAE session — not a defence selection battery. Your detailed results will be available to your clinician in the admin panel only.`
          : `Hello ${participantName.split(/\s+/)[0]}.\n\nYour BAE session is ready. Detailed scores are saved for your evaluator — you will only see progress prompts here.`
      );
      setLoading(true);
      try {
        const data = await apiPost("/session/start", {
          name: participantName,
          target,
          attempt,
        });
        setSessionId(data.session_id);
        sessionIdRef.current = data.session_id;
        pushBot(
          `Session created.\n\nYou will complete 5 assessments:\n` +
          `  1. TAT  2. WAT  3. SRT  4. SDT  5. BA\n\n` +
          `Type  yes  to use TAT images, or  skip  for text-only descriptions.`
        );
        setPhase("tat_upload");
      } catch (e) {
        pushBot(`Error creating session: ${e.message || "check backend and ml-services are running."}`);
      } finally {
        setLoading(false);
      }
    };
    boot();
  }, []);

  const pushUser = (text) =>
    setMessages(prev => [...prev, { role: "user", text, time: ts() }]);

  /** Scores and assessor notes are for admin reports only — not shown to the user. */
  const pushRecorded = () => {
    pushBot("Response recorded. Continue when ready.", { variant: "recorded" });
  };

  const token = localStorage.getItem("token");
  const authH = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };

  const apiPost = (path, body) =>
    apiFetch(`${API}${path}`, { method: "POST", headers: authH, body: JSON.stringify(body) });

  const apiGet = (path) =>
    apiFetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });

  const traumaProfile = isTraumaUser();
  const accent = traumaProfile ? "#f48fb1" : "#58a6ff";

  const phaseSteps = useMemo(
    () => ["TAT", "WAT", "SRT", "SDT", "BA"],
    []
  );
  const activeStepIndex = useMemo(() => {
    if (phase.startsWith("tat")) return 0;
    if (phase.startsWith("wat")) return 1;
    if (phase.startsWith("srt")) return 2;
    if (phase.startsWith("sdt")) return 3;
    if (phase.startsWith("ba")) return 4;
    if (phase === "done") return 5;
    return -1;
  }, [phase]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const val = input.trim();
    setInput("");
    pushUser(val);

    if (phase === "tat_upload") {
      if (val.toLowerCase() === "yes") {
        setUseImages(true); useImagesRef.current = true;
        setPhase("tat_intro");
        pushBot("Images enabled.\n\nType  start  to begin TAT.");
      } else if (val.toLowerCase() === "skip") {
        setUseImages(false); useImagesRef.current = false;
        setPhase("tat_intro");
        pushBot("Text descriptions only.\n\nType  start  to begin TAT.");
      } else {
        pushBot("Please type  yes  to use images or  skip  for text descriptions only.");
      }
      return;
    }

    if (phase === "tat_intro") {
      if (val.toLowerCase() !== "start") { pushBot("Type  start  to begin TAT."); return; }
      pushBot(
        `TAT — THEMATIC APPERCEPTION TEST\n\n` +
        `You will see 12 picture descriptions. For each, write a DRAMATIC story covering:\n` +
        `  1. Current Situation\n  2. Preceding Events\n  3. Thoughts & Feelings\n  4. Outcome\n\n` +
        `Make your story as dramatic as possible. Press Enter to submit each story.\n\nLoading Picture 1...`
      );
      setPhase("tat"); setTatPicture(1); setProgress("1 / 12");
      await loadTatScene(1, sessionIdRef.current, useImagesRef.current);
      return;
    }

    if (phase === "tat") {
      setLoading(true);
      try {
        const data = await apiPost("/tat/submit", { session_id: sessionIdRef.current, picture: tatPicture, story: val });
        pushRecorded();
        const next = tatPicture + 1;
        if (next <= 12) {
          setTatPicture(next); setProgress(`${next} / 12`);
          await loadTatScene(next, sessionIdRef.current, useImagesRef.current);
        } else {
          pushBot("✅ TAT Complete.\n\nType  start  to begin WAT — Word Association Test.");
          setPhase("wat_intro"); setProgress("");
        }
      } catch (e) { pushBot("Error submitting story. Please try again.");
      } finally { setLoading(false); }
      return;
    }

    if (phase === "wat_intro") {
      if (val.toLowerCase() !== "start") { pushBot("Type  start  to begin WAT."); return; }
      setLoading(true);
      try {
        const data = await apiGet("/wat/words?mode=full");
        setWatWords(data.words); setWatIndex(0); setWatBatch([]);
        setPhase("wat"); setProgress("1 / " + data.words.length);
        pushBot(`WAT — WORD ASSOCIATION TEST\n\nWrite the FIRST complete sentence that comes to mind for each word.\nBe fast — speed reveals your patterns.\n\nWORD 1 / ${data.words.length}:  ${data.words[0].toUpperCase()}`);
      } catch (e) { pushBot("Error loading WAT words. Please try again.");
      } finally { setLoading(false); }
      return;
    }

    if (phase === "wat") {
      const newBatch = [...watBatch, { word: watWords[watIndex], response: val }];
      setWatBatch(newBatch);
      const next = watIndex + 1;
      if (next < watWords.length) {
        setWatIndex(next); setProgress(`${next + 1} / ${watWords.length}`);
        pushBot(`WORD ${next + 1} / ${watWords.length}:  ${watWords[next].toUpperCase()}`);
      } else {
        setLoading(true);
        try {
          const data = await apiPost("/wat/submit", { session_id: sessionIdRef.current, responses: newBatch });
          const wa = data.assessment;
          pushRecorded();
          pushBot("✅ WAT Complete.\n\nType  start  to begin SRT — Situation Reaction Test.");
          setPhase("srt_intro"); setProgress("");
        } catch (e) { pushBot("Error submitting WAT. Please try again.");
        } finally { setLoading(false); }
      }
      return;
    }

    if (phase === "srt_intro") {
      if (val.toLowerCase() !== "start") { pushBot("Type  start  to begin SRT."); return; }
      setLoading(true);
      try {
        const data = await apiGet("/srt/situations?mode=full");
        setSrtList(data.situations); setSrtIndex(0);
        setPhase("srt"); setProgress("1 / " + data.situations.length);
        const s = data.situations[0];
        pushBot(`SRT — SITUATION REACTION TEST\n\nWrite what YOU would ACTUALLY do. Start with "I would..."\n\nSITUATION 1 / ${data.situations.length}  [${s.olq.toUpperCase()}]\n\n${s.s}`);
      } catch (e) { pushBot("Error loading SRT. Please try again.");
      } finally { setLoading(false); }
      return;
    }

    if (phase === "srt") {
      setLoading(true);
      try {
        const sit  = srtList[srtIndex];
        const data = await apiPost("/srt/submit", { session_id: sessionIdRef.current, situation_id: sit.id, response: val });
        pushRecorded();
        const next = srtIndex + 1;
        if (next < srtList.length) {
          setSrtIndex(next); setProgress(`${next + 1} / ${srtList.length}`);
          const ns = srtList[next];
          pushBot(`SITUATION ${next + 1} / ${srtList.length}  [${ns.olq.toUpperCase()}]\n\n${ns.s}`);
        } else {
          pushBot("✅ SRT Complete.\n\nType  start  to begin SDT — Self Description Test.");
          setPhase("sdt_intro"); setProgress("");
        }
      } catch (e) { pushBot("Error submitting response. Please try again.");
      } finally { setLoading(false); }
      return;
    }

    if (phase === "sdt_intro") {
      if (val.toLowerCase() !== "start") { pushBot("Type  start  to begin SDT."); return; }
      setLoading(true);
      try {
        const data = await apiGet("/sdt/perspectives");
        setSdtList(data.perspectives); setSdtIndex(0);
        setPhase("sdt"); setProgress("1 / " + data.perspectives.length);
        const p = data.perspectives[0];
        pushBot(`SDT — SELF DESCRIPTION TEST\n\nAim for 80–120 words. Honesty over idealism.\n\nPERSPECTIVE 1 / ${data.perspectives.length} — ${p.perspective.toUpperCase()}\n\n${p.prompt}`);
      } catch (e) { pushBot("Error loading SDT. Please try again.");
      } finally { setLoading(false); }
      return;
    }

    if (phase === "sdt") {
      setLoading(true);
      try {
        const p    = sdtList[sdtIndex];
        const data = await apiPost("/sdt/submit", { session_id: sessionIdRef.current, perspective_id: p.id, response: val });
        pushRecorded();
        const next = sdtIndex + 1;
        if (next < sdtList.length) {
          setSdtIndex(next); setProgress(`${next + 1} / ${sdtList.length}`);
          const np = sdtList[next];
          pushBot(`PERSPECTIVE ${next + 1} / ${sdtList.length} — ${np.perspective.toUpperCase()}\n\n${np.prompt}`);
        } else {
          pushBot("✅ SDT Complete.\n\nType  start  to begin BA — Behavioural Activation Assessment.");
          setPhase("ba_intro"); setProgress("");
        }
      } catch (e) { pushBot("Error submitting response. Please try again.");
      } finally { setLoading(false); }
      return;
    }

    if (phase === "ba_intro") {
      if (val.toLowerCase() !== "start") { pushBot("Type  start  to begin BA."); return; }
      setLoading(true);
      try {
        const data = await apiGet("/ba/patterns");
        setBaList(data.patterns); setBaIndex(0); setBaBatch([]);
        setPhase("ba"); setProgress("1 / " + data.patterns.length);
        const b = data.patterns[0];
        pushBot(`BA — BEHAVIOURAL ACTIVATION ASSESSMENT\n\nAnswer honestly — not how you wish you behaved.\n\nPATTERN A — ${b.pattern.toUpperCase()}\n\n${b.q}`);
      } catch (e) { pushBot("Error loading BA. Please try again.");
      } finally { setLoading(false); }
      return;
    }

    if (phase === "ba") {
      const b        = baList[baIndex];
      const newBatch = [...baBatch, { id: b.id, pattern: b.pattern, question: b.q, response: val }];
      setBaBatch(newBatch);
      const next = baIndex + 1;
      if (next < baList.length) {
        setBaIndex(next); setProgress(`${next + 1} / ${baList.length}`);
        const nb = baList[next];
        pushBot(`PATTERN ${nb.id} — ${nb.pattern.toUpperCase()}\n\n${nb.q}`);
      } else {
        setLoading(true);
        try {
          await apiPost("/ba/submit", { session_id: sessionIdRef.current, responses: newBatch });
          const fin = await apiPost("/session/finish", { session_id: sessionIdRef.current });
          pushBot("✅ All assessments complete.\n\nGenerating your report...");
          setPhase("done"); setProgress("");
          try {
            await fetch(`${API}/session/report?session_id=${sessionIdRef.current}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            pushBot("✅ Report saved successfully. Thank you for completing the BAE assessment.");
          } catch { pushBot("Your response has been recorded. Thank you."); }
        } catch (e) { pushBot("Error finishing session. Please try again.");
        } finally { setLoading(false); }
      }
      return;
    }

    if (phase === "done") pushBot("This session has ended. Your results have been saved.");
  };

  const loadTatScene = async (n, sid, showImg = true) => {
    try {
      const data = await apiGet(`/tat/scene/${n}?session_id=${sid}`);
      setTatScene(data);
      pushBot(
        `PICTURE ${n} / 12\n\n${data.description}\n\nWrite your DRAMATIC story covering all 4 elements:\n` +
        `1. Current Situation  2. Preceding Events  3. Thoughts & Feelings  4. Outcome`,
        { image_b64: showImg ? data.image_b64 : null }
      );
    } catch (e) { pushBot(`Error loading picture ${n}. Please type your story anyway.`); }
  };

const handleKeyDown = (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
    // Reset height after send
    e.target.style.height = "auto";
  }
};

  const isDone     = phase === "done";
  const phaseLabel = PHASE_LABEL[phase] || phase;

  const handleInput = (e) => {
  setInput(e.target.value);
  e.target.style.height = "auto";
  e.target.style.height = e.target.scrollHeight + "px";
};

  return (
    <div className="bg-[#050b18] text-white flex flex-col overflow-hidden relative" style={{ height: "calc(100vh - 56px)" }}>
      <div className="pointer-events-none absolute -top-24 left-1/3 w-72 h-72 rounded-full blur-3xl opacity-10" style={{ background: accent }} />

      <div className="relative z-10 border-b border-blue-900/30 px-6 md:px-8 py-4 shrink-0 backdrop-blur-sm bg-[#050b18]/85">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: accent + "22" }}>
              <ClipboardList size={20} style={{ color: accent }} />
            </div>
            <div>
              <span className="font-semibold tracking-widest text-sm uppercase block" style={{ color: accent }}>
                Assessment 3 — BAE
              </span>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                {traumaProfile ? "Wellbeing battery" : "Behavioural assessment engine"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="text-slate-400">{phaseLabel}</span>
            {progress && (
              <span
                className="border px-3 py-1 rounded-full font-mono tabular-nums"
                style={{ borderColor: accent + "55", color: accent, background: accent + "18" }}
              >
                {progress}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {phaseSteps.map((label, idx) => {
            const done = activeStepIndex > idx;
            const active = activeStepIndex === idx;
            return (
              <span
                key={label}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md border transition-colors"
                style={{
                  borderColor: active || done ? accent + "66" : "#334155",
                  color: active ? accent : done ? "#94a3b8" : "#475569",
                  background: active ? accent + "18" : "transparent",
                }}
              >
                {label}
              </span>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 flex-1 p-6 md:p-8 overflow-y-auto space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex items-end gap-2 bae-fade-in ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role !== "user" && (
              <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center border border-slate-700" style={{ background: accent + "18" }}>
                <ClipboardList size={16} style={{ color: accent }} />
              </div>
            )}
            <div
              className={`px-4 py-3 rounded-2xl max-w-xl whitespace-pre-line text-sm leading-relaxed shadow-sm
              ${m.role === "user"
                ? "rounded-br-md text-white"
                : m.variant === "recorded"
                  ? "bg-[#0a1f10] border border-emerald-800/40 text-emerald-100/90 rounded-bl-md"
                  : "bg-[#0c1528] border border-blue-900/40 text-blue-100 rounded-bl-md"}`}
              style={m.role === "user" ? { background: `linear-gradient(135deg, ${accent}cc, ${accent}99)` } : undefined}
            >
              {m.image_b64 && (
                <img
                  src={`data:image/jpeg;base64,${m.image_b64}`}
                  alt="TAT"
                  className="rounded-xl mb-3 max-w-full max-h-64 object-contain border border-blue-900/30"
                />
              )}
              {m.text}
              <div className="text-[10px] mt-2 opacity-30">{m.time}</div>
            </div>
            {m.role === "user" && (
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                <User size={16} className="text-slate-400" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start items-end gap-2">
            <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center border border-slate-700" style={{ background: accent + "18" }}>
              <ClipboardList size={16} style={{ color: accent }} className="animate-pulse" />
            </div>
            <div className="bg-[#0c1528] border border-blue-900/40 px-4 py-3 rounded-2xl rounded-bl-md text-slate-400 text-sm">
              Processing...
            </div>
          </div>
        )}

        {isDone && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => navigate("/cbdt")}
              className="text-white text-sm font-semibold px-8 py-3 rounded-xl transition hover:scale-[1.01]"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}
            >
              Continue to Assessment 4 — CBDT
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="relative z-10 border-t border-blue-900/30 p-5 md:p-6 shrink-0 backdrop-blur-sm bg-[#050b18]/90">
        <div className="flex gap-3 justify-center max-w-3xl mx-auto w-full">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={isDone ? "Session complete." : "Type your response — Enter to send"}
            disabled={isDone || loading}
            rows={1}
            className="flex-1 bg-[#0c1528] rounded-xl px-4 py-3 text-sm outline-none border transition-all placeholder-slate-600 disabled:opacity-40 resize-none overflow-hidden leading-relaxed"
            style={{ borderColor: accent + "44" }}
          />
          <button
            onClick={sendMessage}
            disabled={isDone || loading}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-40"
            style={{ background: accent }}
          >
            <Send size={16} />
            Send
          </button>
        </div>
      </div>

      <style>{`.bae-fade-in { animation: bae-fade-in 0.3s ease-out; } @keyframes bae-fade-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}