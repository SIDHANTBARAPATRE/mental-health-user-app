import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Consent() {

  const navigate = useNavigate();

  const [checks, setChecks] = useState({
    c1:false,
    c2:false,
    c3:false,
    c4:false
  });

  const handleCheck = (key) => {
    setChecks({
      ...checks,
      [key]: !checks[key]
    });
  };

  const handleStart = () => {

    const allChecked =
      checks.c1 &&
      checks.c2 &&
      checks.c3 &&
      checks.c4;

    if(!allChecked){
      alert("Please accept all consent conditions.");
      return;
    }

    localStorage.setItem("consent", "true");

    navigate("/ema");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050b18] via-[#070f24] to-black text-white flex flex-col">

      {/* Top Bar */}

      <div className="flex-1 flex items-center justify-center">

        <div className="max-w-xl w-full px-8 text-center">

          <h1 className="text-3xl font-bold mb-4">
            Mental Readiness Consent
          </h1>

          <p className="text-gray-400 leading-relaxed mb-6">
            Sentinel uses advanced NLP to analyze emotional patterns and cognitive markers
            through natural conversation. Your responses generate a Dynamic Persona Vector (DPV)
            for real-time resilience tracking.
          </p>

          {/* Consent Box */}
          <div className="bg-[#0b1226] border border-blue-900/40 rounded-xl p-6 text-left space-y-4 text-sm">

            <label className="flex gap-3">
              <input
                type="checkbox"
                checked={checks.c1}
                onChange={()=>handleCheck("c1")}
                className="accent-blue-500 mt-1"
              />
              <span>Your interaction data will be anonymized and encrypted.</span>
            </label>

            <label className="flex gap-3">
              <input
                type="checkbox"
                checked={checks.c2}
                onChange={()=>handleCheck("c2")}
                className="accent-blue-500 mt-1"
              />
              <span>Psychological scoring will occur in real time.</span>
            </label>

            <label className="flex gap-3">
              <input
                type="checkbox"
                checked={checks.c3}
                onChange={()=>handleCheck("c3")}
                className="accent-blue-500 mt-1"
              />
              <span>No personally identifiable information is stored.</span>
            </label>

            <label className="flex gap-3">
              <input
                type="checkbox"
                checked={checks.c4}
                onChange={()=>handleCheck("c4")}
                className="accent-blue-500 mt-1"
              />
              <span>I voluntarily participate in this assessment.</span>
            </label>

          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-3 gap-4 mt-6 text-xs">

            <div className="bg-[#0b1226] p-4 rounded border border-blue-900/30">
              ⚡ REAL-TIME SCORING
            </div>

            <div className="bg-[#0b1226] p-4 rounded border border-blue-900/30">
              🧠 MICRO-INTERVENTIONS
            </div>

            <div className="bg-[#0b1226] p-4 rounded border border-blue-900/30">
              🔒 ANONYMOUS
            </div>

          </div>

          {/* Button */}
          <button
            onClick={handleStart}
            className="mt-8 w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold tracking-wide"
          >
            INITIATE ASSESSMENT →
          </button>

        </div>
      </div>
    </div>
  );
}