import { useNavigate, useLocation } from "react-router-dom";
import { Shield, LogOut, ChevronRight } from "lucide-react";

// Pages where header must NOT appear
const HIDDEN_ON = ["/", "/signup"];

// Label shown next to NEURA X for each route
const PAGE_TITLES = {
  "/consent": "Consent",
  "/ema":     "EMA Assessment",
  "/chat":    "MI Session",
  "/bae":     "BAE Assessment",
  "/cbdt":    "CBDT Assessment",
  "/oc":      "OC Assessment",
};

export default function Header() {
  const nav      = useNavigate();
  const location = useLocation();

  // Hide on auth pages
  if (HIDDEN_ON.includes(location.pathname)) return null;

  const operatorId = localStorage.getItem("operatorId") || "Operator";
  const pageTitle  = PAGE_TITLES[location.pathname] || "";

  const handleEndSession = () => {
    [
      "token", "operatorId", "name", "userRole",
      "emaCompleted", "emaUserType", "emaMiHandoff", "emaResult", "emaExport",
    ].forEach((k) => localStorage.removeItem(k));
    nav("/");
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 shadow-lg shadow-black/30">
      <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between">

        {/* ── Left: logo + page breadcrumb ── */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            <span className="text-white font-black tracking-tighter uppercase italic text-base">
              NEURO Z
            </span>
          </div>

          {pageTitle && (
            <div className="flex items-center gap-2">
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="text-slate-500 text-[10px] font-mono uppercase tracking-widest">
                {pageTitle}
              </span>
            </div>
          )}
        </div>

        {/* ── Right: operator ID + end session ── */}
        <div className="flex items-center gap-4">

          {/* Operator badge */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <span className="text-blue-400 text-xs font-bold uppercase">
                {operatorId[0]}
              </span>
            </div>
            <span className="text-slate-400 text-xs font-mono hidden sm:block">
              {operatorId}
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-slate-800" />

          {/* End Session button */}
          <button
            onClick={handleEndSession}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-red-400 bg-red-500/5 border border-red-500/20 hover:bg-red-500/15 hover:border-red-500/40 transition-all text-[10px] font-mono font-bold uppercase tracking-widest"
          >
            <LogOut className="w-3 h-3" />
            <span>End Session</span>
          </button>

        </div>
      </div>
    </header>
  );
}