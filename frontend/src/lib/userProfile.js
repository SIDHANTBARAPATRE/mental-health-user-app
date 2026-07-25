/** Maps signup/admin role and EMA user_type to assessment modules. */

export const ROLE_TO_EMA_USER_TYPE = {
  cadet:       "nda",
  army_men:    "army",
  ptsd_victim: "terror_survivor",
};

export const EMA_TO_OC_USER_TYPE = {
  nda:             "NDA",
  army:            "ARMY",
  navy:            "NAVY",
  air_force:       "AIRFORCE",
  terror_survivor: "PTSD",
};

const SESSION_EMA_KEYS = [
  "emaCompleted",
  "emaUserType",
  "emaMiHandoff",
  "emaResult",
  "emaExport",
];

/** Remove assessment cache so a new login does not inherit another user's EMA path. */
export function clearSessionAssessmentCache() {
  SESSION_EMA_KEYS.forEach((k) => localStorage.removeItem(k));
}

/** Apply account role after login — role always drives EMA model (DPBM vs TRAM). */
export function applyRoleToSession(role) {
  clearSessionAssessmentCache();
  localStorage.setItem("userRole", role || "");
  localStorage.setItem("emaUserType", roleToEmaUserType(role));
}

export function getStoredName() {
  const name = localStorage.getItem("name")?.trim();
  if (name) return name;
  return localStorage.getItem("operatorId") || "there";
}

export function getUserRole() {
  return localStorage.getItem("userRole") || "";
}

/** EMA user_type for API calls — always from account role, never stale cache. */
export function getEmaUserType() {
  return roleToEmaUserType(getUserRole());
}

export function isTraumaUser() {
  return getUserRole() === "ptsd_victim";
}

/** Fix stale emaUserType / handoff when defence role still has TRAM cache. */
export function syncEmaTypeWithRole() {
  const role = getUserRole();
  if (!role) return;
  localStorage.setItem("emaUserType", roleToEmaUserType(role));
  if (role !== "ptsd_victim") {
    localStorage.removeItem("emaMiHandoff");
  }
}

export function roleToEmaUserType(role) {
  return ROLE_TO_EMA_USER_TYPE[role] || "nda";
}

export function resolveDefaultOcUserType() {
  const ema = getEmaUserType();
  if (EMA_TO_OC_USER_TYPE[ema]) return EMA_TO_OC_USER_TYPE[ema];
  const role = getUserRole();
  if (role === "ptsd_victim") return "PTSD";
  if (role === "cadet") return "NDA";
  if (role === "army_men") return "ARMY";
  return "NDA";
}

export function cbdtModeFromProfile() {
  return getEmaUserType();
}
