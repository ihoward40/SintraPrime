function isPlainObject(x) {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

export function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (isPlainObject(value)) {
    const out = {};
    const keys = Object.keys(value).sort();
    for (const k of keys) out[k] = canonicalize(value[k]);
    return out;
  }
  return value;
}

export function canonicalStringify(value) {
  return JSON.stringify(canonicalize(value));
}
