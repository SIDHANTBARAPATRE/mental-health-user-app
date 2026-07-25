/** OC overlays — positive (+R) vs negative (−P) distinct visual language. */

const VARIANT_STYLES = {
  reward: {
    border: "border-emerald-500/60",
    bg: "bg-gradient-to-br from-emerald-950/95 via-[#0a1f10]/95 to-[#0c1528]/95",
    text: "text-emerald-50",
    glow: "shadow-[0_0_40px_rgba(52,211,153,0.35)]",
    anim: "animate-oc-reward-in",
    icon: "✦",
  },
  ack: {
    border: "border-emerald-600/50",
    bg: "bg-[#0a1f10]/95",
    text: "text-emerald-100",
    glow: "shadow-[0_0_28px_rgba(52,211,153,0.25)]",
    anim: "animate-oc-reward-in",
    icon: "✓",
  },
  neutral: {
    border: "border-blue-900/50",
    bg: "bg-[#0c1528]/95",
    text: "text-blue-100",
    glow: "shadow-xl",
    anim: "animate-oc-slide-down",
    icon: "◈",
  },
  warn: {
    border: "border-amber-600/60",
    bg: "bg-gradient-to-b from-amber-950/90 to-[#1a1208]/95",
    text: "text-amber-100",
    glow: "shadow-[0_0_24px_rgba(245,158,11,0.2)]",
    anim: "animate-oc-warn-pulse",
    icon: "⚠",
  },
  punish: {
    border: "border-red-600/70",
    bg: "bg-gradient-to-b from-red-950/95 via-black/90 to-[#0a0505]/98",
    text: "text-red-200",
    glow: "shadow-[0_0_48px_rgba(220,38,38,0.45)]",
    anim: "animate-oc-punish-shake",
    icon: "▲",
  },
  care: {
    border: "border-pink-400/40",
    bg: "bg-gradient-to-br from-[#1a1020]/95 to-[#0c1528]/95",
    text: "text-pink-100",
    glow: "shadow-[0_0_32px_rgba(244,143,177,0.2)]",
    anim: "animate-oc-reward-in",
    icon: "◎",
  },
};

function variantFor(v) {
  if (v === "punish" || v === "warn") return VARIANT_STYLES[v];
  if (v === "ack" || v === "reward") return VARIANT_STYLES[v === "ack" ? "ack" : "reward"];
  if (v === "care") return VARIANT_STYLES.care;
  return VARIANT_STYLES.neutral;
}

export function OcPopupBanner({ lines, variant = "neutral", accentColor = "#58a6ff", className = "" }) {
  const s = variantFor(variant);
  const isNegative = variant === "punish" || variant === "warn";
  const position = isNegative ? "bottom-28" : "top-24";

  return (
    <>
      <div
        className={`fixed left-1/2 -translate-x-1/2 z-40 max-w-lg w-[calc(100%-2rem)] px-5 py-4 rounded-xl border-2 backdrop-blur-md ${s.bg} ${s.border} ${s.glow} ${s.anim} ${className} ${position}`}
        role="alert"
        aria-live={isNegative ? "assertive" : "polite"}
      >
        <div className="flex items-start gap-3">
          <span
            className={`text-lg shrink-0 mt-0.5 ${isNegative ? "text-red-400 animate-pulse" : "text-emerald-400"}`}
            style={!isNegative && variant !== "care" ? { color: accentColor } : undefined}
          >
            {s.icon}
          </span>
          <div className="flex-1">
            {lines.map((line, i) => (
              <p
                key={i}
                className={`text-center whitespace-pre-line ${s.text} ${
                  i === 0
                    ? isNegative
                      ? "text-sm font-black tracking-widest uppercase"
                      : "text-sm font-semibold tracking-wide"
                    : "text-xs mt-1.5 opacity-90"
                }`}
                style={
                  i === 0 && !isNegative && variant !== "care"
                    ? { color: accentColor }
                    : undefined
                }
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes oc-reward-in {
          0% { opacity: 0; transform: translate(-50%, -12px) scale(0.92); }
          60% { transform: translate(-50%, 4px) scale(1.02); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        @keyframes oc-punish-shake {
          0%,100% { opacity: 1; transform: translate(-50%, 0); }
          15% { transform: translate(calc(-50% - 6px), 0); }
          30% { transform: translate(calc(-50% + 6px), 0); }
          45% { transform: translate(calc(-50% - 4px), 0); }
        }
        @keyframes oc-warn-pulse {
          0%,100% { opacity: 1; }
          50% { opacity: 0.85; filter: brightness(1.15); }
        }
        @keyframes oc-slide-down {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-oc-reward-in { animation: oc-reward-in 0.55s ease-out forwards; }
        .animate-oc-punish-shake { animation: oc-punish-shake 0.5s ease-in-out; }
        .animate-oc-warn-pulse { animation: oc-warn-pulse 1.2s ease-in-out infinite; }
        .animate-oc-slide-down { animation: oc-slide-down 0.4s ease-out forwards; }
      `}</style>
    </>
  );
}

export function OcFullScreenMessage({ title, body, sub, accentColor, onContinue, continueLabel = "Continue" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050b18]/95 backdrop-blur-sm p-6">
      <div className="max-w-md w-full bg-[#0c1528] border border-blue-900/40 rounded-2xl p-8 text-center animate-oc-reward-in">
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-4">{title}</p>
        <p className="text-lg text-slate-100 whitespace-pre-line leading-relaxed mb-2">{body}</p>
        {sub && <p className="text-sm text-slate-400 whitespace-pre-line mb-8">{sub}</p>}
        <button
          type="button"
          onClick={onContinue}
          className="w-full bg-blue-600 hover:bg-blue-500 transition text-white text-sm font-semibold py-3 rounded-xl"
          style={{ boxShadow: `0 0 24px ${accentColor}33` }}
        >
          {continueLabel}
        </button>
      </div>
    </div>
  );
}

/** Full black screen when military timer expires — scenario force-closed. */
export function OcBlackoutOverlay({ message, subMessage }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 animate-oc-blackout">
      <p className="text-red-500 font-mono text-sm tracking-[0.4em] uppercase animate-pulse mb-4">
        {message || "WINDOW CLOSED"}
      </p>
      {subMessage && (
        <p className="text-slate-600 text-xs font-mono text-center max-w-sm">{subMessage}</p>
      )}
      <style>{`
        @keyframes oc-blackout {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-oc-blackout { animation: oc-blackout 0.8s ease-in forwards; }
      `}</style>
    </div>
  );
}
