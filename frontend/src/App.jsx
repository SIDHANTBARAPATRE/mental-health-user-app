import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Consent from "./pages/Consent";
import Chat from "./pages/chat";
import Bae from "./pages/Bae";
import EMA from "./components/EMA";
import CBDT from "./pages/CBDT";
import Oc from "./pages/Oc";
import ProtectedChat, { ProtectedAuth } from "./components/ProtectedChat";

export default function App() {
  return (
    <BrowserRouter>

      {/* Universal header — hides itself on "/" and "/signup" automatically */}
      <Header />

      <Routes>
        <Route path="/"        element={<Login />} />
        <Route path="/signup"  element={<Signup />} />
        <Route path="/consent" element={<Consent />} />

        {/* EMA Assessment — requires login; ML service must be on :5001 */}
        <Route path="/ema" element={<ProtectedAuth><EMA /></ProtectedAuth>} />

        {/* Protected routes */}
        <Route path="/chat" element={<ProtectedChat><Chat /></ProtectedChat>} />
        <Route path="/bae"  element={<ProtectedChat><Bae /></ProtectedChat>} />
        <Route path="/cbdt" element={<ProtectedChat><CBDT /></ProtectedChat>} />
        <Route path="/oc"   element={<ProtectedChat><Oc /></ProtectedChat>} />
      </Routes>

    </BrowserRouter>
  );
}