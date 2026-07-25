import { useLocation, useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";

export default function AuthLayout({ children }) {
  const location = useLocation();
  const nav      = useNavigate();
  const isLogin  = location.pathname === "/";

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">

      {/* ── Auth Header ── */}
      <header className="w-full border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">

          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => nav("/")}
          >
            <Shield className="w-5 h-5 text-blue-500" />
            <span className="text-white font-black tracking-tighter uppercase italic text-base">
              NEURO Z
            </span>
          </div>

          {/* Nav tabs */}
          <nav className="flex items-center gap-1">
            <button
              onClick={() => nav("/")}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-widest transition-all ${
                isLogin
                  ? "bg-blue-500/15 border border-blue-500/30 text-blue-400"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => nav("/signup")}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-widest transition-all ${
                !isLogin
                  ? "bg-blue-500/15 border border-blue-500/30 text-blue-400"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
              }`}
            >
              Sign Up
            </button>
          </nav>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1">
        {children}
      </main>

      {/* ── Auth Footer ── */}
      <footer className="w-full border-t border-slate-800/60 bg-slate-950/90 py-4">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-600 text-[10px] font-mono uppercase tracking-widest">
            <Shield className="w-3 h-3" />
            <span>NEURO Z — Secure Military Psychological Triage</span>
          </div>
        </div>
      </footer>

    </div>
  );
}