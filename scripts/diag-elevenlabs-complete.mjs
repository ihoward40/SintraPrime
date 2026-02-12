// Complete ElevenLabs Diagnostic & Test Script (safe: no embedded secrets)
//
// Usage:
//   set ELEVEN_API_KEY=...            (PowerShell: $env:ELEVEN_API_KEY='...')
//   set ELEVEN_VOICE_DEFAULT=...      (optional; will prompt/list voices if missing)
//   node test-elevenlabs-complete.mjs
//
// This script:
// 1) Verifies API connectivity
// 2) Verifies configured voice IDs exist (if provided)
// 3) Generates a test MP3
// 4) Optionally opens it on Windows for playback
// 5) Optionally generates one MP3 per configured character voice

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const CONFIG = {
  apiKey: process.env.ELEVEN_API_KEY,
  voices: {
    // Optional: set these via env (recommended). If unset, verification/generation will skip.
    dragon: process.env.ELEVEN_VOICE_DRAGON,
    android: process.env.ELEVEN_VOICE_ANDROID,
    judge: process.env.ELEVEN_VOICE_JUDGE,
    oracle: process.env.ELEVEN_VOICE_ORACLE,
    warrior: process.env.ELEVEN_VOICE_WARRIOR,
    narrator: process.env.ELEVEN_VOICE_NARRATOR,
    prosecutor: process.env.ELEVEN_VOICE_PROSECUTOR,
    sage: process.env.ELEVEN_VOICE_SAGE,
    default: process.env.ELEVEN_VOICE_DEFAULT,
  },
  outputDir: process.env.ELEVEN_OUTPUT_DIR || join(process.cwd(), 'runs', 'speech-elevenlabs-diag'),
  testText: process.env.ELEVEN_TEST_TEXT || 'SintraPrime voice synthesis test successful.',
  modelId: process.env.ELEVEN_MODEL_ID || 'eleven_multilingual_v2',
};

function requireApiKey() {
  if (!CONFIG.apiKey) {
    console.log('[skip] ELEVEN_API_KEY is not set (skipping ElevenLabs diagnostics)');
    console.log('       PowerShell: $env:ELEVEN_API_KEY = "..."');
    console.log('       bash/zsh:   export ELEVEN_API_KEY="..."');
    process.exit(0);
  }
}

async function fetchJson(url, headers) {
  const response = await fetch(url, { headers });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { response, text, json };
}

async function testApiConnectivity() {
  console.log('\n=== TEST 1: API Connectivity ===');
  requireApiKey();

  const { response, text, json } = await fetchJson('https://api.elevenlabs.io/v1/voices', {
    'xi-api-key': CONFIG.apiKey,
  });

  if (!response.ok) {
    console.error(`❌ API Error: ${response.status} ${response.statusText}`);
    console.error(text.slice(0, 1200));
    return { ok: false, voices: [] };
  }

  const voices = Array.isArray(json?.voices) ? json.voices : [];
  console.log(`✅ API Connected! Found ${voices.length} voices`);
  return { ok: true, voices };
}

async function verifyVoiceIds(voices) {
  console.log('\n=== TEST 1b: Voice Verification ===');

  const configured = Object.entries(CONFIG.voices)
    .filter(([, id]) => typeof id === 'string' && id.trim().length > 0);

  if (!configured.length) {
    console.log('ℹ️  No ELEVEN_VOICE_* env vars set; skipping verification.');
    console.log('   Tip: set ELEVEN_VOICE_DEFAULT to one of your voice IDs.');
    return true;
  }

  const available = new Set(voices.map((v) => v.voice_id));

  let allOk = true;
  for (const [name, id] of configured) {
    const ok = available.has(id);
    allOk = allOk && ok;
    console.log(`  ${ok ? '✅' : '❌'} ${name}: ${id}${ok ? '' : ' (NOT FOUND IN ACCOUNT)'}`);
  }

  return allOk;
}

async function ensureOutputDir() {
  if (!existsSync(CONFIG.outputDir)) {
    await mkdir(CONFIG.outputDir, { recursive: true });
    console.log(`📁 Created output directory: ${CONFIG.outputDir}`);
  }
}

async function ttsToMp3({ voiceId, text }) {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': CONFIG.apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: CONFIG.modelId,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`TTS failed: ${response.status} ${response.statusText}: ${errText.slice(0, 500)}`);
  }

  const audioBuffer = await response.arrayBuffer();
  return Buffer.from(audioBuffer);
}

async function testAudioGeneration(voices) {
  console.log('\n=== TEST 2: Audio File Generation ===');
  requireApiKey();
  await ensureOutputDir();

  const voiceId = CONFIG.voices.default || voices?.[0]?.voice_id;
  if (!voiceId) {
    console.error('❌ No voice available to test with.');
    console.error('   Set ELEVEN_VOICE_DEFAULT, or ensure your account has voices.');
    return { ok: false, filePath: null };
  }

  const outputPath = join(CONFIG.outputDir, 'test_connectivity.mp3');

  try {
    console.log(`🎤 Generating audio with voice: ${voiceId}`);
    const audio = await ttsToMp3({ voiceId, text: CONFIG.testText });
    await writeFile(outputPath, audio);
    console.log(`✅ Audio file generated: ${outputPath}`);
    console.log(`📊 File size: ${audio.length} bytes`);
    return { ok: true, filePath: outputPath };
  } catch (error) {
    console.error('❌ Audio Generation Failed:', error?.message || String(error));
    return { ok: false, filePath: null };
  }
}

async function testPlayback(filePath) {
  console.log('\n=== TEST 3: Windows Playback (open default player) ===');

  if (!filePath || !existsSync(filePath)) {
    console.error('❌ Test file not found. Skipping playback test.');
    return false;
  }

  if (process.platform !== 'win32') {
    console.log('ℹ️  Non-Windows platform detected; skipping Windows playback step.');
    return true;
  }

  try {
    const { spawn } = await import('node:child_process');

    console.log('🔊 Opening audio file with default Windows handler...');
    const player = spawn('powershell', ['-NoProfile', '-Command', `Start-Process "${filePath}"`], {
      stdio: 'ignore',
      windowsHide: true,
    });

    await new Promise((resolve, reject) => {
      player.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))));
      player.on('error', reject);
    });

    console.log('✅ Playback initiated successfully (file opened).');
    return true;
  } catch (error) {
    console.error('❌ Playback Test Failed:', error?.message || String(error));
    return false;
  }
}

async function testAllCharacters() {
  console.log('\n=== TEST 4: Character Voice Generation (optional) ===');
  await ensureOutputDir();

  const entries = Object.entries(CONFIG.voices)
    .filter(([name]) => name !== 'default')
    .filter(([, id]) => typeof id === 'string' && id.trim().length > 0);

  if (!entries.length) {
    console.log('ℹ️  No character voices configured via ELEVEN_VOICE_*; skipping.');
    return true;
  }

  const results = [];
  for (const [name, voiceId] of entries) {
    const text = `This is ${name} speaking from SintraPrime.`;
    const outputPath = join(CONFIG.outputDir, `character_${name}.mp3`);

    try {
      process.stdout.write(`🎭 Generating ${name}... `);
      const audio = await ttsToMp3({ voiceId, text });
      await writeFile(outputPath, audio);
      console.log('✅');
      results.push({ name, success: true });
    } catch (error) {
      console.log('❌');
      console.error(`  ${name} failed:`, error?.message || String(error));
      results.push({ name, success: false });
    }

    // gentle pacing to avoid rate limits
    await new Promise((r) => setTimeout(r, 250));
  }

  const ok = results.every((r) => r.success);
  const successful = results.filter((r) => r.success).length;
  console.log(`\n📊 Summary: ${successful}/${results.length} voices generated successfully`);
  return ok;
}

async function runDiagnostics() {
  console.log('🔍 SintraPrime ElevenLabs Diagnostic Suite');
  console.log('==========================================');

  const results = [];

  const connectivity = await testApiConnectivity();
  results.push({ name: 'API Connectivity', success: connectivity.ok });

  const voiceVerifyOk = connectivity.ok ? await verifyVoiceIds(connectivity.voices) : false;
  results.push({ name: 'Voice Verification', success: voiceVerifyOk });

  const audio = connectivity.ok ? await testAudioGeneration(connectivity.voices) : { ok: false, filePath: null };
  results.push({ name: 'Audio Generation', success: audio.ok });

  const playbackOk = audio.ok ? await testPlayback(audio.filePath) : false;
  results.push({ name: 'Playback (Windows open)', success: playbackOk });

  const allCharsOk = connectivity.ok ? await testAllCharacters() : false;
  results.push({ name: 'All Characters (optional)', success: allCharsOk });

  console.log('\n' + '='.repeat(60));
  console.log('DIAGNOSTIC SUMMARY');
  console.log('='.repeat(60));

  for (const { name, success } of results) {
    console.log(`${success ? '✅' : '❌'} ${name}`);
  }

  const allPassed = results.every((r) => r.success);
  console.log('='.repeat(60));

  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED! ElevenLabs synthesis looks functional.');
    console.log(`📂 Output: ${CONFIG.outputDir}`);
  } else {
    console.log('⚠️  Some tests failed. Review logs above.');
    console.log('\nCommon issues:');
    console.log('  1) Missing/invalid ELEVEN_API_KEY');
    console.log('  2) Voice IDs don’t belong to this account');
    console.log('  3) Rate limits (retry after a few minutes)');
    console.log('  4) Network/proxy issues');
  }

  console.log('='.repeat(60));
  process.exit(allPassed ? 0 : 1);
}

runDiagnostics().catch((err) => {
  console.error('💥 Diagnostic crashed:', err?.message || String(err));
  process.exit(1);
});
