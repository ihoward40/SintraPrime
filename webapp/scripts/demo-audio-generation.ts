/**
 * Demo: Audio Overview Generation
 * 
 * This script demonstrates the end-to-end workflow for generating
 * podcast-style audio overviews from research documents using NotebookLM.
 * 
 * Run with: npx tsx scripts/demo-audio-generation.ts
 */

import { readFileSync } from "fs";
import { createResearchCollection, createResearchDocument } from "../server/db";
import { audioOverviewService } from "../server/lib/audio-overview-service";

async function main() {
  console.log("🎙️  NotebookLM Audio Overview Generation Demo");
  console.log("=" .repeat(60));
  console.log();

  // Step 1: Create a research collection
  console.log("Step 1: Creating research collection...");
  const collection = await createResearchCollection({
    userId: 1, // Demo user
    name: "Legal AI Research Collection",
    description: "Exploring the impact of AI on legal practice and emerging legal tech trends",
  });
  console.log(`✓ Collection created (ID: ${collection.id})`);
  console.log();

  // Step 2: Load sample documents
  console.log("Step 2: Loading sample documents...");
  const doc1Path = "/home/ubuntu/sintraprime/demo-documents/legal-ai-overview.txt";
  const doc2Path = "/home/ubuntu/sintraprime/demo-documents/legal-tech-trends-2026.txt";
  
  const doc1Content = readFileSync(doc1Path, "utf-8");
  const doc2Content = readFileSync(doc2Path, "utf-8");
  
  console.log(`✓ Loaded: legal-ai-overview.txt (${doc1Content.length} chars)`);
  console.log(`✓ Loaded: legal-tech-trends-2026.txt (${doc2Content.length} chars)`);
  console.log();

  // Step 3: Add documents to collection
  console.log("Step 3: Adding documents to collection...");
  const document1 = await createResearchDocument({
    collectionId: collection.id,
    fileName: "legal-ai-overview.txt",
    fileUrl: "file:///demo/legal-ai-overview.txt",
    fileType: "txt",
    fileSize: doc1Content.length,
    mimeType: "text/plain",
    extractedText: doc1Content,
    summary: "Overview of AI applications in legal practice",
    keyTopics: ["AI in law", "document review", "legal research", "ethics"],
  });
  
  const document2 = await createResearchDocument({
    collectionId: collection.id,
    fileName: "legal-tech-trends-2026.txt",
    fileUrl: "file:///demo/legal-tech-trends-2026.txt",
    fileType: "txt",
    fileSize: doc2Content.length,
    mimeType: "text/plain",
    extractedText: doc2Content,
    summary: "Analysis of legal technology trends and market dynamics",
    keyTopics: ["legal tech", "CLM", "predictive analytics", "market trends"],
  });
  
  console.log(`✓ Document 1 added (ID: ${document1.id})`);
  console.log(`✓ Document 2 added (ID: ${document2.id})`);
  console.log();

  // Step 4: Generate audio overview
  console.log("Step 4: Generating podcast-style audio overview...");
  console.log("This may take 30-60 seconds...");
  console.log();
  
  const focusAreas = [
    "AI applications in legal practice",
    "Market trends and adoption patterns",
    "Challenges and future outlook"
  ];
  
  try {
    const audioResult = await audioOverviewService.generateOverview(
      [
        { fileName: document1.fileName, content: doc1Content },
        { fileName: document2.fileName, content: doc2Content },
      ],
      1, // userId
      collection.id,
      focusAreas
    );
    
    console.log("✅ Audio overview generated successfully!");
    console.log();
    console.log("Results:");
    console.log("-".repeat(60));
    console.log(`Audio URL: ${audioResult.audioUrl}`);
    console.log(`Duration: ${Math.floor(audioResult.duration / 60)}:${(audioResult.duration % 60).toString().padStart(2, "0")}`);
    console.log(`Focus Areas: ${audioResult.focusAreas.join(", ")}`);
    console.log();
    console.log("Transcript Preview:");
    console.log("-".repeat(60));
    console.log(audioResult.transcript.substring(0, 500) + "...");
    console.log();
    console.log("🎧 You can now play this audio file in the NotebookLM interface!");
    console.log();
    
  } catch (error) {
    console.error("❌ Audio generation failed:");
    console.error(error);
    process.exit(1);
  }

  console.log("=" .repeat(60));
  console.log("✅ Demo completed successfully!");
  console.log();
  console.log("Next steps:");
  console.log("1. Open NotebookLM in the browser");
  console.log("2. Navigate to the 'Legal AI Research Collection'");
  console.log("3. Click 'Audio Overviews' tab to listen");
  console.log("4. Try generating more overviews with different focus areas");
}

main().catch(console.error);
