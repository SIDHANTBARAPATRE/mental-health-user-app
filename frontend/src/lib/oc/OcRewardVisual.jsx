import { USER_TYPES } from "./ocConfig";

export default function OcRewardVisual({ userType, completedCount, totalScenarios, accentColor }) {
  if (completedCount <= 0) return null;

  const dots = Array.from({ length: totalScenarios }, (_, i) => i < completedCount);

  if (userType === USER_TYPES.NDA) {
    return (
      <div className="flex gap-2 justify-center my-4">
        {dots.map((filled, i) => (
          <div
            key={i}
            className="w-3 h-3 rotate-45 border transition-all duration-500"
            style={{
              background: filled ? accentColor : "transparent",
              borderColor: filled ? accentColor : "#334155",
              boxShadow: filled ? `0 0 8px ${accentColor}` : "none",
            }}
          />
        ))}
      </div>
    );
  }

  if (userType === USER_TYPES.ARMY || userType === USER_TYPES.AIRFORCE) {
    return (
      <div className="flex gap-1.5 justify-center my-4">
        {dots.map((filled, i) => (
          <div
            key={i}
            className="w-2 h-6 rounded-sm transition-all"
            style={{ background: filled ? accentColor : "#1e293b", opacity: filled ? 1 : 0.4 }}
          />
        ))}
        <span className="text-[10px] font-mono text-slate-500 ml-2 self-center uppercase tracking-widest">
          {completedCount}/{totalScenarios}
        </span>
      </div>
    );
  }

  if (userType === USER_TYPES.NAVY) {
    return (
      <div className="text-center my-4">
        <div className="flex gap-2 justify-center mb-2">
          {dots.map((filled, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full border transition-all"
              style={{
                background: filled ? accentColor : "transparent",
                borderColor: filled ? accentColor : "#334155",
                boxShadow: filled ? `0 0 10px ${accentColor}` : "none",
              }}
            />
          ))}
        </div>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          Watch cycle · {completedCount} logged
        </span>
      </div>
    );
  }

  // PTSD types — horizon progress
  return (
    <div className="my-6 px-2">
      <div className="relative h-1 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{ width: `${(completedCount / totalScenarios) * 100}%`, background: accentColor }}
        />
      </div>
      <p className="text-[10px] text-slate-500 text-center mt-2 font-mono uppercase tracking-widest">
        {completedCount} of {totalScenarios} complete
      </p>
    </div>
  );
}
