import "dotenv/config";
import dotenv from "dotenv";
import path from "node:path";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStripeWebhook } from "../stripe-webhook";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { setupWebSocket } from "./websocket";
import { intelligenceWebSocket } from "../lib/intelligence-websocket";
import { probeSintraInfraHealthFromWebappOrigin } from "../lib/sintraInfraHealth";

// Best-effort: load env files without overriding already-set shell vars.
// Precedence (highest first): webapp/.env(.local) → repo-root .env(.local).
dotenv.config({ path: path.resolve(import.meta.dirname, "../../.env"), override: false });
dotenv.config({ path: path.resolve(import.meta.dirname, "../../.env.local"), override: false });
dotenv.config({ path: path.resolve(import.meta.dirname, "../../../.env"), override: false });
dotenv.config({ path: path.resolve(import.meta.dirname, "../../../.env.local"), override: false });

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Run database migrations on startup
  try {
    const { migrate } = await import("drizzle-orm/mysql2/migrator");
    const db = (await import("../db.ts")).default;
    console.log("Running database migrations...");
    await migrate(db, { migrationsFolder: "./webapp/drizzle" });
    console.log("Database migrations completed successfully");
  } catch (error) {
    console.warn("Database migration warning (non-blocking):", error);
    // Don't block server startup if migrations fail
  }
  
  // Initialize WebSocket servers
  setupWebSocket(server);
  intelligenceWebSocket.initialize(server);
  
  // Start web monitoring service
  const { startWebMonitoring } = await import("../lib/webSnapshotService");
  startWebMonitoring();
  // Stripe webhook must be registered BEFORE json body parser
  registerStripeWebhook(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
   // Register email ingest route
  const emailIngestRouter = (await import("../routes/emailIngest")).default;
  app.use("/api/email", emailIngestRouter);
  
  // Register audio ingest route
  const audioIngestRouter = (await import("../routes/audioIngest")).default;
  app.use("/api/audio", audioIngestRouter); // Voice transcription endpoint

  // Iframe header preflight (XFO + CSP frame-ancestors)
  const iframePreflightRouter = (await import("../routes/iframePreflight")).default;
  app.use("/api", iframePreflightRouter);

  // Simple infra health endpoint (non-tRPC) for easy curl/smoke tests
  app.get("/api/sintraInfra/health", async (req, res) => {
    try {
      const webappOrigin = `http://${req.get("host")}`;
      const result = await probeSintraInfraHealthFromWebappOrigin({ webappOrigin, timeoutMsPerService: 2500 });
      res.status(200).json(result);
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });
  const multer = (await import("multer")).default;
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 16 * 1024 * 1024 } }); // 16MB limit
  
  app.post("/api/voice-transcribe", upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }
      
      const { transcribeAudio } = await import("./voiceTranscription");
      
      // Upload audio to S3 first
      const { storagePut } = await import("../storage");
      const audioKey = `voice-transcriptions/${Date.now()}-${req.file.originalname}`;
      const { url: audioUrl } = await storagePut(audioKey, req.file.buffer, req.file.mimetype);
      
      // Transcribe using Whisper API
      const result = await transcribeAudio({
        audioUrl,
        language: "en",
      });
      
      if ("error" in result) {
        return res.status(500).json({ error: result.error });
      }
      
      // Type narrowing: result is WhisperResponse here
      const whisperResult = result as { text: string; language: string };
      res.json({ text: whisperResult.text, language: whisperResult.language });
    } catch (error) {
      console.error("Voice transcription error:", error);
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });
  
  // AI Chat endpoint
  app.post("/api/ai-chat", async (req, res) => {
    try {
      const { invokeLLM } = await import("./llm");
      const { parseMentions, resolveMentions } = await import("./mentions");
      const { message, context, userId } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      
      // Build system prompt with context if provided
      let systemPrompt = "You are a legal AI assistant for SintraPrime, a legal warfare platform. Help users with legal research, case analysis, document drafting, and strategic legal advice. Be professional, accurate, and cite relevant legal principles when applicable.";
      
      if (context) {
        systemPrompt += `\n\n${context}`;
      }
      
      // Parse and resolve @mentions
      if (userId) {
        const mentions = parseMentions(message);
        if (mentions.length > 0) {
          const mentionContext = await resolveMentions(mentions, userId);
          systemPrompt += mentionContext;
        }
      }
      
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: message,
          },
        ],
      });
      
      const assistantMessage = response.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";
      res.json({ response: assistantMessage });
    } catch (error) {
      console.error("AI Chat error:", error);
      res.status(500).json({ error: "Failed to process AI request" });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    
    // Start alert monitoring (check every 5 minutes)
    import('../lib/alertMonitoring').then(({ startAlertMonitoring }) => {
      startAlertMonitoring(5);
    }).catch(console.error);
    
    // Start report scheduler (check every 60 minutes)
    import('../lib/reportScheduler').then(({ startReportScheduler }) => {
      startReportScheduler(60);
    }).catch(console.error);
  });
}

startServer().catch(console.error);
