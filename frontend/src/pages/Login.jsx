import { useState, useEffect } from "react";
import axios from "../api/axios";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Shield, User, KeyRound, ChevronRight,
  AlertTriangle, CheckCircle
} from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { applyRoleToSession } from "../lib/userProfile";

const MODULES = [
  { name: "EMA",  desc: "Emotional & Motivational Assessment" },
  { name: "MI",   desc: "Motivational Interviewing Chat" },
  { name: "BAE",  desc: "Behavioural Activation Engine" },
  { name: "CBDT", desc: "Cognitive Behavioural Distortion Tracker" },
  { name: "OC",   desc: "Officer Command Scenarios" },
];

export default function Login() {
  const [email,            setEmail]            = useState("");
  const [password,         setPassword]         = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError,        setAuthError]        = useState("");
  const [successMsg,       setSuccessMsg]       = useState("");
  const nav      = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMsg(location.state.successMessage);
      const t = setTimeout(() => setSuccessMsg(""), 5000);
      return () => clearTimeout(t);
    }
  }, [location.state]);

  const submit = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthError("");
    try {
      const res = await axios.post("/auth/login", { email, password });
      localStorage.setItem("token",      res.data.token);
      localStorage.setItem("operatorId", res.data.operatorId);
      localStorage.setItem("name",       res.data.name || "");
      applyRoleToSession(res.data.role || "");
      nav("/consent");
    } catch (error) {
      setAuthError(error.response?.data?.message || "Authentication failed");
      setIsAuthenticating(false);
    }
  };

  return (
    <AuthLayout>
      <div className="min-h-[calc(100vh-112px)] flex relative overflow-hidden bg-slate-950">

        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10 pointer-events-none" />

        {/* ── Left content panel ── */}
        <div className="hidden lg:flex flex-col justify-center flex-1 px-16 py-12 relative">

          <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="mb-3 flex items-center gap-2">
            <div className="w-8 h-px bg-blue-500" />
            <span className="text-blue-500 text-[10px] font-mono uppercase tracking-widest">
              Classified Intelligence Platform
            </span>
          </div>
          <h2 className="text-5xl font-black tracking-tighter text-white uppercase italic leading-none mb-4">
            Psychological<br />
            <span className="text-blue-500">Triage</span><br />
            Command
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm mb-10">
            AI-driven mental health assessment platform built for military personnel.
            Identify, evaluate, and support operators with precision-grade psychological intelligence.
          </p>

          {/* Module list */}
          <div className="max-w-sm">
            <div className="text-slate-600 text-[10px] font-mono uppercase tracking-widest mb-3">Assessment Modules</div>
            <div className="space-y-2">
              {MODULES.map(({ name, desc }) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-[10px] font-mono font-bold text-blue-500 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded w-12 text-center">{name}</span>
                  <span className="text-slate-500 text-xs">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px bg-slate-800 my-12" />

        {/* ── Right: Login form ── */}
        <div className="flex flex-col justify-center flex-1 lg:max-w-lg px-8 lg:px-16 py-12">

          {/* Success toast */}
          {successMsg && (
            <div className="flex items-center gap-3 px-4 py-3 mb-6 bg-emerald-900/50 border border-emerald-500/30 rounded-xl">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-emerald-300 text-xs font-mono uppercase tracking-wide">{successMsg}</span>
              <button onClick={() => setSuccessMsg("")} className="ml-auto text-emerald-500 text-base leading-none">×</button>
            </div>
          )}

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <Shield className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <h3 className="text-white font-black uppercase italic tracking-tight text-xl">Operator Login</h3>
                <p className="text-slate-500 text-xs font-mono uppercase tracking-wider">Authenticate to continue</p>
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-3">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-500 transition-colors">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm font-mono"
                  placeholder="Operator ID / Email"
                />
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-500 transition-colors">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  type="password" required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm font-mono"
                  placeholder="Access Code"
                />
              </div>
            </div>

            {authError && (
              <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-tight">{authError}</span>
              </div>
            )}

            <button
              type="submit" disabled={isAuthenticating}
              className="w-full flex justify-center items-center py-3 px-4 rounded-lg text-sm font-bold uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isAuthenticating ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span className="font-mono text-xs">Authenticating...</span>
                </div>
              ) : (
                <>
                  Start Assessment
                  <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between">
            <span className="text-slate-600 text-[10px]">
              No account?{" "}
              <a href="/signup" className="text-blue-400 hover:text-blue-300 underline">Register here</a>
            </span>
          </div>
        </div>

      </div>
    </AuthLayout>
  );
}