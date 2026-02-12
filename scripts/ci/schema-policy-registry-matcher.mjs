export function isCoveredBySnapshot(schemaPath, snapshot) {
  const actions = snapshot?.actions ?? [];
  const prefixes = snapshot?.prefixes ?? [];

  // Action coverage: schemas/<domain>/<action>.v1.json → expect action name matches
  // Example: schemas/browser/browser.operator.v1.json -> "browser.operator.v1"
  const base = schemaPath.split("/").pop() || "";
  const actionGuess = base.replace(/\.json$/i, "");

  if (actions.includes(actionGuess)) return true;
  return prefixes.some((p) => actionGuess.startsWith(p));
}
