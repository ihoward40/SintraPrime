import { buildOmniPlan } from "./omniSkillEngine.js";
import { listSkills, getCapabilityMatrixMeta } from "./capabilityMatrix.js";

export function planForIntent(payload) {
  return buildOmniPlan(payload);
}

export function listAllCapabilities(filter) {
  return listSkills(filter || {});
}

export function capabilityMeta() {
  return getCapabilityMatrixMeta();
}
