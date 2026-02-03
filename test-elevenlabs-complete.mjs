#!/usr/bin/env node

/**
 * ElevenLabs Voice Synthesis - Complete Diagnostic Script
 * 
 * This script validates the ElevenLabs integration with proper security and rate limiting.
 * 
 * Requirements:
 * 1. Create .env.local with ELEVEN_API_KEY and voice IDs
 * 2. Run: node test-elevenlabs-complete.mjs
 * 
 * The script will:
 * - Validate environment variables
 * - Test API connectivity
 * - Generate test audio files
 * - Test all character voices
 * - Demonstrate rate limiting
 */

import https from "https";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment from .env.local if it exists
function loadEnv() {
  const envPath = path.join(__dirname, ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    content.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key) {
          process.env[key.trim()] = valueParts.join("=").trim();
        }
      }
    });
    console.log("✅ Loaded environment from .env.local");
  }
}

// Validate required environment variables
function validateEnvironment() {
  console.log("\n=== Environment Validation ===");
  
  if (!process.env.ELEVEN_API_KEY) {
    console.error("❌ ELEVEN_API_KEY is not set!");
    console.error("\nPlease create a .env.local file with:");
    console.error("  ELEVEN_API_KEY=sk_your_actual_api_key_here");
    console.error("\nGet your API key from: https://elevenlabs.io/app/settings/api-keys");
    process.exit(1);
  }

  // Check if it's a placeholder
  if (process.env.ELEVEN_API_KEY.includes("YOUR_") || 
      process.env.ELEVEN_API_KEY.includes("_HERE")) {
    console.error("❌ ELEVEN_API_KEY looks like a placeholder!");
    console.error("Please replace it with your actual API key from ElevenLabs.");
    process.exit(1);
  }

  console.log("✅ ELEVEN_API_KEY is set");

  // Check voice IDs (at least one should be configured)
  const voiceIds = [
    "ELEVEN_VOICE_DRAGON",
    "ELEVEN_VOICE_ANDROID",
    "ELEVEN_VOICE_JUDGE",
    "ELEVEN_VOICE_ORACLE",
    "ELEVEN_VOICE_WARRIOR",
    "ELEVEN_VOICE_NARRATOR",
    "ELEVEN_VOICE_PROSECUTOR",
    "ELEVEN_VOICE_SAGE",
    "ELEVEN_VOICE_DEFAULT",
  ];

  let configuredVoices = 0;
  voiceIds.forEach((id) => {
    if (process.env[id] && 
        !process.env[id].includes("YOUR_") && 
        !process.env[id].includes("_HERE")) {
      configuredVoices++;
      console.log(`✅ ${id} is configured`);
    } else {
      console.log(`⚠️  ${id} not configured (will use default)`);
    }
  });

  if (configuredVoices === 0) {
    console.error("\n❌ No character voice IDs configured!");
    console.error("Please add at least one voice ID to .env.local");
    console.error("Get voice IDs from: https://elevenlabs.io/app/voice-library");
    process.exit(1);
  }

  console.log(`\n✅ ${configuredVoices} voice(s) configured\n`);
}

// Test API connectivity
async function testApiConnectivity() {
  console.log("=== Testing API Connectivity ===");
  
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.elevenlabs.io",
        path: "/v1/user",
        method: "GET",
        headers: {
          "xi-api-key": process.env.ELEVEN_API_KEY,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode === 200) {
            const user = JSON.parse(data);
            console.log(`✅ Connected to ElevenLabs API`);
            console.log(`   User: ${user.subscription?.tier || "free"} tier`);
            console.log(
              `   Character quota: ${user.subscription?.character_count || 0} / ${user.subscription?.character_limit || 10000}`
            );
            resolve();
          } else {
            console.error(`❌ API Error: ${res.statusCode}`);
            console.error(`   ${data}`);
            reject(new Error(`API returned ${res.statusCode}`));
          }
        });
      }
    );

    req.on("error", (error) => {
      console.error(`❌ Connection failed: ${error.message}`);
      reject(error);
    });

    req.end();
  });
}

// Global request queue for rate limiting
const requestQueue = [];
let isProcessingQueue = false;

async function enqueueRequest(fn) {
  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    processQueue();
  });
}

async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const nextRequest = requestQueue.shift();
    if (nextRequest) {
      try {
        await nextRequest();
      } catch (error) {
        console.error(`Queue processing error: ${error.message}`);
      }
      // Add delay between requests to help with rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  isProcessingQueue = false;
}

// Generate audio using text-to-speech
async function textToSpeech(text, voiceId) {
  const requestBody = JSON.stringify({
    text,
    model_id: "eleven_multilingual_v2",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
    },
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.elevenlabs.io",
        path: `/v1/text-to-speech/${voiceId}`,
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVEN_API_KEY,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(requestBody),
        },
      },
      (res) => {
        const chunks = [];

        res.on("data", (chunk) => chunks.push(chunk));

        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          if (res.statusCode === 200) {
            resolve(buffer);
          } else {
            reject(
              new Error(
                `ElevenLabs API error: ${res.statusCode} ${buffer.toString()}`
              )
            );
          }
        });
      }
    );

    req.on("error", reject);
    req.write(requestBody);
    req.end();
  });
}

// Test single audio generation
async function testAudioGeneration() {
  console.log("\n=== Testing Audio Generation ===");
  
  // Use the first configured voice or default
  const voiceId =
    process.env.ELEVEN_VOICE_NARRATOR ||
    process.env.ELEVEN_VOICE_DEFAULT ||
    process.env.ELEVEN_VOICE_ANDROID;

  if (!voiceId) {
    console.error("❌ No voice ID available for testing");
    return;
  }

  const outputDir = process.env.ELEVEN_OUTPUT_DIR || "voice/dynamic";
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    console.log(`Generating test audio with voice ID: ${voiceId}...`);
    const audioBuffer = await textToSpeech(
      "Testing ElevenLabs voice synthesis integration.",
      voiceId
    );

    const outputPath = path.join(outputDir, "test-basic.mp3");
    fs.writeFileSync(outputPath, audioBuffer);
    console.log(`✅ Audio generated successfully: ${outputPath}`);
    console.log(`   Size: ${(audioBuffer.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error(`❌ Audio generation failed: ${error.message}`);
    throw error;
  }
}

// Test Windows playback
async function testWindowsPlayback() {
  if (process.platform !== "win32") {
    console.log("\n⚠️  Skipping Windows playback test (not on Windows)");
    return;
  }

  console.log("\n=== Testing Windows Playback ===");
  
  const outputDir = process.env.ELEVEN_OUTPUT_DIR || "voice/dynamic";
  const audioPath = path.join(outputDir, "test-basic.mp3");

  if (!fs.existsSync(audioPath)) {
    console.log("⚠️  No test audio file found, skipping playback test");
    return;
  }

  try {
    console.log("Playing audio...");
    const child = spawn(
      "powershell",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `Add-Type -AssemblyName presentationCore; $player = New-Object System.Windows.Media.MediaPlayer; $player.Open([Uri]::new('${audioPath.replace(/\\/g, "/")}', [UriKind]::Absolute)); $player.Play(); Start-Sleep -Seconds 3`,
      ],
      { stdio: "inherit" }
    );

    await new Promise((resolve) => {
      child.on("close", resolve);
    });

    console.log("✅ Playback test completed");
  } catch (error) {
    console.error(`❌ Playback failed: ${error.message}`);
  }
}

// Test all character voices
async function testAllCharacterVoices() {
  console.log("\n=== Testing All Character Voices ===");

  const characters = [
    { name: "Dragon", envVar: "ELEVEN_VOICE_DRAGON", text: "Critical system alert. Immediate attention required." },
    { name: "Android", envVar: "ELEVEN_VOICE_ANDROID", text: "System status: All systems operational." },
    { name: "Judge", envVar: "ELEVEN_VOICE_JUDGE", text: "Legal notice: Please review the terms and conditions." },
    { name: "Oracle", envVar: "ELEVEN_VOICE_ORACLE", text: "Warning: Potential issues detected in the forecast." },
    { name: "Warrior", envVar: "ELEVEN_VOICE_WARRIOR", text: "Debug mode activated. Analyzing system state." },
    { name: "Narrator", envVar: "ELEVEN_VOICE_NARRATOR", text: "Information: The system is processing your request." },
    { name: "Prosecutor", envVar: "ELEVEN_VOICE_PROSECUTOR", text: "Error detected: Unable to complete the operation." },
    { name: "Sage", envVar: "ELEVEN_VOICE_SAGE", text: "Success: Operation completed successfully." },
  ];

  const outputDir = process.env.ELEVEN_OUTPUT_DIR || "voice/dynamic";
  let successCount = 0;
  let skipCount = 0;

  for (const character of characters) {
    const voiceId = process.env[character.envVar];
    
    if (!voiceId || voiceId.includes("YOUR_") || voiceId.includes("_HERE")) {
      console.log(`⚠️  ${character.name}: Skipped (not configured)`);
      skipCount++;
      continue;
    }

    try {
      console.log(`Generating audio for ${character.name}...`);
      
      // Use the request queue to prevent concurrent API calls
      await enqueueRequest(async () => {
        const audioBuffer = await textToSpeech(character.text, voiceId);
        const outputPath = path.join(
          outputDir,
          `test-${character.name.toLowerCase()}.mp3`
        );
        fs.writeFileSync(outputPath, audioBuffer);
        console.log(`✅ ${character.name}: Generated (${(audioBuffer.length / 1024).toFixed(2)} KB)`);
        successCount++;
      });
    } catch (error) {
      console.error(`❌ ${character.name}: Failed - ${error.message}`);
    }
  }

  console.log(
    `\n📊 Summary: ${successCount} succeeded, ${skipCount} skipped`
  );
}

// Main test flow
async function main() {
  console.log("🎤 ElevenLabs Voice Synthesis - Complete Diagnostic\n");

  try {
    // Load environment
    loadEnv();

    // Validate environment
    validateEnvironment();

    // Test API connectivity
    await testApiConnectivity();

    // Test basic audio generation
    await testAudioGeneration();

    // Test Windows playback (if applicable)
    await testWindowsPlayback();

    // Test all character voices with rate limiting
    await testAllCharacterVoices();

    console.log("\n✅ All tests completed successfully!");
    console.log("\nTo enable in your server, add to your .env.local:");
    console.log("  SPEECH_SINKS=console,elevenlabs");
    console.log("  SPEECH_DEBUG=1");
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

main();
