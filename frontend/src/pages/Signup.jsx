import { useState } from "react";
import axios from "../api/axios";
import { useNavigate } from "react-router-dom";
import {
  Shield, User, Mail, KeyRound, ChevronRight,
  AlertTriangle, ShieldCheck, FileText, BarChart2,
  MessageSquare, ChevronDown
} from "lucide-react";
import AuthLayout from "../components/AuthLayout";

const STEPS = [
  { icon: FileText,      title: "Register",           desc: "Create your secure operator account with a unique ID." },
  { icon: ShieldCheck,   title: "Consent & Verify",   desc: "Review and acknowledge the assessment protocol terms." },
  { icon: BarChart2,     title: "EMA Assessment",      desc: "Complete the Emotional & Motivational Assessment baseline." },
  { icon: MessageSquare, title: "Deep Modules",        desc: "Engage with MI, BAE, CBDT, and OC assessments." },
];

const ROLE_OPTIONS = [
  { value: "cadet",       label: "Cadets",                      desc: "Military academy trainee or officer candidate" },
  { value: "army_men",    label: "Army Men",                    desc: "Active duty, veteran, or any armed forces service member" },
  { value: "ptsd_victim", label: "PTSD / Terror-Attack Victim", desc: "Civilian or military survivor requiring trauma support" },
];

export default function Signup() {
  const [name,       setName]       = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [role,       setRole]       = useState("");
  const [error,      setError]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!operatorId || !email || !password || !role) {
      setError("All fields are required.");
      return;
    }
    try {
      setLoading(true);
      await axios.post("/auth/signup", { name, operatorId, email, password, role });
      nav("/", { state: { successMessage: "Registered successfully. Please login." } });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="min-h-[calc(100vh-112px)] flex relative overflow-hidden bg-slate-950">

        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10 pointer-events-none" />

        {/* ── Left content panel ── */}
        <div className="hidden lg:flex flex-col justify-center flex-1 px-16 py-12 relative">

          <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-emerald-600/8 rounded-full blur-3xl pointer-events-none" />

          <div className="mb-3 flex items-center gap-2">
            <div className="w-8 h-px bg-emerald-500" />
            <span className="text-emerald-500 text-[10px] font-mono uppercase tracking-widest">
              Operator Onboarding
            </span>
          </div>
          <h2 className="text-5xl font-black tracking-tighter text-white uppercase italic leading-none mb-4">
            Join the<br />
            <span className="text-emerald-500">Assessment</span><br />
            Network
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm mb-10">
            Register as a certified operator to access NEURO Z's full suite of
            military-grade psychological triage tools — built for precision, speed, and confidentiality.
          </p>

          {/* Onboarding steps */}
          <div className="max-w-sm mb-10">
            <div className="text-slate-600 text-[10px] font-mono uppercase tracking-widest mb-4">How it works</div>
            <div className="space-y-4">
              {STEPS.map(({ icon: Icon, title, desc }, i) => (
                <div key={title} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-emerald-500" />
                    </div>
                    {i < STEPS.length - 1 && <div className="w-px flex-1 bg-slate-800 mt-1" />}
                  </div>
                  <div className="pb-4">
                    <div className="text-white text-sm font-bold">{title}</div>
                    <div className="text-slate-500 text-xs mt-0.5 leading-relaxed">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px bg-slate-800 my-12" />

        {/* ── Right: Signup form ── */}
        <div className="flex flex-col justify-center flex-1 lg:max-w-lg px-8 lg:px-16 py-12">

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <Shield className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-white font-black uppercase italic tracking-tight text-xl">Create Account</h3>
                <p className="text-slate-500 text-xs font-mono uppercase tracking-wider">Register as a new operator</p>
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-3">

              {/* Full Name — new field */}
              <div>
                <label className="text-slate-500 text-[10px] font-mono uppercase tracking-widest block mb-1.5">
                  Full Name <span className="text-slate-600">(optional)</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-500 transition-colors">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all text-sm font-mono"
                    placeholder="e.g. Rajan Mehta"
                  />
                </div>
              </div>

              {/* Operator ID */}
              <div>
                <label className="text-slate-500 text-[10px] font-mono uppercase tracking-widest block mb-1.5">Operator ID</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-500 transition-colors">
                    <Shield className="h-4 w-4" />
                  </div>
                  <input
                    type="text" required value={operatorId}
                    onChange={(e) => setOperatorId(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all text-sm font-mono"
                    placeholder="Your assigned operator ID"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-slate-500 text-[10px] font-mono uppercase tracking-widest block mb-1.5">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-500 transition-colors">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all text-sm font-mono"
                    placeholder="operator@domain.mil"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-slate-500 text-[10px] font-mono uppercase tracking-widest block mb-1.5">Access Code</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-500 transition-colors">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    type="password" required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all text-sm font-mono"
                    placeholder="Enter password"
                  />
                </div>
              </div>

              {/* Role Dropdown */}
              <div>
                <label className="text-slate-500 text-[10px] font-mono uppercase tracking-widest block mb-1.5">
                  Personnel Category
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-500 transition-colors">
                    <Shield className="h-4 w-4" />
                  </div>
                  <select
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="block w-full pl-10 pr-8 py-3 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all text-sm font-mono appearance-none cursor-pointer"
                  >
                    <option value="" disabled className="text-slate-500 bg-slate-900">
                      — Select category —
                    </option>
                    {ROLE_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value} className="bg-slate-900 text-slate-200">
                        {label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>

                {/* Contextual hint */}
                {role && (
                  <p className="mt-1.5 text-[10px] font-mono text-emerald-600/80 pl-1">
                    ↳ {ROLE_OPTIONS.find(r => r.value === role)?.desc}
                  </p>
                )}
              </div>

            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-tight">{error}</span>
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 rounded-lg text-sm font-bold uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span className="font-mono text-xs">Registering...</span>
                </div>
              ) : (
                <>
                  Register
                  <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between">
            <span className="text-slate-600 text-[10px]">
              Have an account?{" "}
              <a href="/" className="text-emerald-400 hover:text-emerald-300 underline">Sign in</a>
            </span>
          </div>
        </div>

      </div>
    </AuthLayout>
  );
}