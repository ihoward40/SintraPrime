import { Tool } from "../../types/index.js";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

export interface OsintGatherArgs {
  domain: string; // Target domain
  sources?: string; // Comma-separated list of sources (e.g., "google,bing,linkedin")
}

export class OsintTool implements Tool {
  public readonly name = "osint_gather";
  public readonly description = "Performs OSINT on a domain using theHarvester to find emails, subdomains, and hosts.";

  async execute(args: OsintGatherArgs): Promise<any> {
    if (!args.domain) {
      throw new Error("OsintTool: 'domain' argument is required.");
    }
    
    const sanitizedDomain = args.domain.replace(/[^a-zA-Z0-9.\-]/g, "");
    const sources = args.sources || 'google,bing';
    const outputFile = `/tmp/harvester_${sanitizedDomain}_${Date.now()}`;
    const command = `theHarvester -d ${sanitizedDomain} -b ${sources} -f ${outputFile}`;

    try {
      await execAsync(command, { timeout: 180000 }); // 3-minute timeout
      const reportJson = await fs.readFile(`${outputFile}.json`, 'utf-8');
      await fs.unlink(`${outputFile}.json`); // Clean up
      await fs.unlink(`${outputFile}.xml`); // Clean up
      return JSON.parse(reportJson);
    } catch (error: any) {
      console.error(`OsintTool: Execution failed for domain ${sanitizedDomain}`, error);
      throw new Error(`theHarvester failed: ${error.message}`);
    }
  }
}
