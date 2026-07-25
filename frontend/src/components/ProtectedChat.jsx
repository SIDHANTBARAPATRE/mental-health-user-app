import { Navigate } from "react-router-dom";

/** Require login before EMA and other pre-assessment routes. */
export function ProtectedAuth({ children }) {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/" replace state={{ message: "Please sign in to continue." }} />;
  }
  return children;
}

export default function ProtectedChat({ children }) {

  const emaDone = localStorage.getItem("emaCompleted");

  if(!emaDone){
    return <Navigate to="/ema" />;
  }

  return children;
}