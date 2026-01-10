async function sha256Hex(blob) {
  const buf = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

function normalizeHex(s) {
  return String(s || '').trim().toLowerCase();
}

function isSha256Hex(s) {
  return /^[0-9a-f]{64}$/.test(normalizeHex(s));
}

function el(id) {
  return document.getElementById(id);
}

function setResult(kind, lines) {
  const box = el('result');
  const cls = kind === 'good' ? 'good' : kind === 'bad' ? 'bad' : 'warn';
  box.innerHTML = `
    <div class="${cls}" style="font-weight:700; margin-bottom:6px;">${lines[0]}</div>
    <pre class="kv">${lines.slice(1).join('\n')}</pre>
  `;
}

async function loadManifest() {
  const meta = el('manifestMeta');
  const out = el('manifest');
  out.textContent = '';
  meta.textContent = '';

  let data;
  try {
    const res = await fetch('./index.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (e) {
    meta.textContent = `Failed to load index.json: ${e?.message || e}`;
    return { version: null, artifacts: [] };
  }

  const version = data?.version || null;
  const generatedAt = data?.generated_at || null;
  const artifacts = Array.isArray(data?.artifacts) ? data.artifacts : [];

  meta.textContent = `version=${version ?? '(unknown)'}; artifacts=${artifacts.length}; generated_at=${generatedAt ?? '(unknown)'}`;

  for (const a of artifacts) {
    const sha = normalizeHex(a?.sha256);
    const url = String(a?.url || '').trim();
    const fileName = String(a?.file_name || a?.id || '').trim();
    const createdAt = String(a?.created_at || '').trim();

    const div = document.createElement('div');
    div.className = 'item';

    const link = url ? `<a href="${url}" target="_blank" rel="noreferrer">${fileName || url}</a>` : `${fileName || '(no url)'}`;

    div.innerHTML = `
      <div style="font-weight:700; margin-bottom:6px;">${link}</div>
      <pre class="kv">sha256=${sha || '(missing)'}\ncreated_at=${createdAt || '(missing)'}\nnotes=${String(a?.notes || '').trim() || '(none)'}</pre>
    `;

    out.appendChild(div);
  }

  return { version, generatedAt, artifacts };
}

async function main() {
  const verifyBtn = el('verifyBtn');
  const refreshBtn = el('refreshBtn');

  let manifest = await loadManifest();

  refreshBtn.addEventListener('click', async () => {
    manifest = await loadManifest();
  });

  verifyBtn.addEventListener('click', async () => {
    const expected = normalizeHex(el('expectedHash').value);
    const file = el('fileInput').files?.[0] || null;

    if (!file) {
      setResult('warn', ['Missing file', 'Choose a file to verify.']);
      return;
    }

    if (expected && !isSha256Hex(expected)) {
      setResult('warn', ['Invalid expected hash', 'Expected 64 hex characters.']);
      return;
    }

    verifyBtn.disabled = true;
    setResult('warn', ['Computing SHA-256…', `file=${file.name}`, `size=${file.size} bytes`]);

    try {
      const actual = await sha256Hex(file);

      const matchesExpected = expected ? actual === expected : null;
      const matchedManifest = manifest.artifacts.find((a) => normalizeHex(a?.sha256) === actual) || null;

      if (matchesExpected === true) {
        setResult('good', ['Match', `sha256=${actual}`, expected ? `expected=${expected}` : '', matchedManifest ? `manifest_hit=${matchedManifest.file_name || matchedManifest.id || '(unnamed)'}` : 'manifest_hit=(none)'].filter(Boolean));
        return;
      }

      if (matchesExpected === false) {
        setResult('bad', ['Mismatch', `sha256=${actual}`, `expected=${expected}`, matchedManifest ? `manifest_hit=${matchedManifest.file_name || matchedManifest.id || '(unnamed)'}` : 'manifest_hit=(none)']);
        return;
      }

      // No expected hash supplied; still report whether it matches the published manifest.
      if (matchedManifest) {
        setResult('good', ['Verified against manifest', `sha256=${actual}`, `manifest_hit=${matchedManifest.file_name || matchedManifest.id || '(unnamed)'}`]);
      } else {
        setResult('warn', ['Computed (not in manifest)', `sha256=${actual}`, 'If this file should be public, add it to index.json (append-only).']);
      }
    } catch (e) {
      setResult('bad', ['Error', String(e?.message || e)]);
    } finally {
      verifyBtn.disabled = false;
    }
  });
}

main();
