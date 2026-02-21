import { Tool } from "../../types/index.js";
import { exec } from "child_process";
import { promisify } from "util";
import { parseStringPromise } from "xml2js";

const execAsync = promisify(exec);

export interface NmapScanArgs {
  target: string; // IP address, CIDR range, or hostname
  options?: string; // Additional Nmap command-line options
}

export class NmapAdapter implements Tool {
  public readonly name = "nmap_scan";
  public readonly description = "Performs a network scan using Nmap to discover hosts, open ports, services, and OS versions.";

  async execute(args: NmapScanArgs): Promise<any> {
    if (!args.target) {
      throw new Error("NmapAdapter: 'target' argument is required.");
    }

    // Sanitize target to prevent command injection
    const sanitizedTarget = args.target.replace(/[^a-zA-Z0-9.\-\/]/g, "");
    const command = `nmap ${args.options || ''} -oX - ${sanitizedTarget}`;

    try {
      const { stdout } = await execAsync(command, { timeout: 300000 }); // 5-minute timeout
      const jsonResult = await parseStringPromise(stdout);
      return this.formatResult(jsonResult);
    } catch (error: any) {
      console.error(`NmapAdapter: Execution failed for target ${sanitizedTarget}`, error);
      throw new Error(`Nmap scan failed: ${error.message}`);
    }
  }

  private formatResult(nmapData: any): any {
    if (!nmapData.nmaprun.host) {
      return { hosts: [] };
    }

    const hosts = nmapData.nmaprun.host.map((h: any) => {
      const address = h.address[0].$.addr;
      const status = h.status[0].$.state;
      const ports = h.ports[0].port?.map((p: any) => ({
        port: parseInt(p.$.portid, 10),
        protocol: p.$.protocol,
        state: p.state[0].$.state,
        service: p.service?.[0].$.name,
        product: p.service?.[0].$.product,
        version: p.service?.[0].$.version,
      })) || [];

      return { address, status, ports };
    });

    return { hosts };
  }
}
