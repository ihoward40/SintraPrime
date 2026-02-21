import { Tool } from "../../types/index.js";
import axios from "axios";

export interface MetasploitExploitArgs {
  module: string; // e.g., "exploit/unix/ftp/vsftpd_234_backdoor"
  rhosts: string; // Target host(s)
  rport?: number; // Target port
  payload?: string; // e.g., "cmd/unix/interact"
  additionalOptions?: Record<string, string>;
}

export class MetasploitAdapter implements Tool {
  public readonly name = "metasploit_exploit";
  public readonly description = "HIGH-RISK: Executes a Metasploit exploit module. REQUIRES explicit human approval from the PolicyGate.";

  private rpcUrl: string;
  private authToken: string | null = null;

  constructor(config: { host?: string; port?: number; user: string; password: string; ssl?: boolean }) {
    const host = config.host || "127.0.0.1";
    const port = config.port || 55553;
    const protocol = config.ssl ? 'https' : 'http';
    this.rpcUrl = `${protocol}://${host}:${port}/api/`;
    this.authenticate(config.user, config.password);
  }

  private async authenticate(user: string, pass: string): Promise<void> {
    try {
      const response = await axios.post(this.rpcUrl, {
        jsonrpc: "1.0",
        id: 1,
        method: "auth.login",
        params: [user, pass],
      });
      if (response.data.result?.token) {
        this.authToken = response.data.result.token;
      } else {
        throw new Error('Authentication failed, no token received.');
      }
    } catch (error: any) {
      console.error("MetasploitAdapter: Authentication failed.", error.message);
      this.authToken = null;
    }
  }

  async execute(args: MetasploitExploitArgs): Promise<any> {
    if (!this.authToken) {
      throw new Error("MetasploitAdapter: Not authenticated. Check credentials and msfrpcd status.");
    }

    // 1. Create a console
    const consoleRes = await this.callMsfRpc("console.create");
    const consoleId = consoleRes.id;

    // 2. Build and run commands
    const commands = [
      `use ${args.module}`,
      `set RHOSTS ${args.rhosts}`,
      args.rport ? `set RPORT ${args.rport}` : null,
      args.payload ? `set PAYLOAD ${args.payload}` : null,
      ...(Object.entries(args.additionalOptions || {}).map(([k, v]) => `set ${k} ${v}`)),
      "run -z", // Run the exploit in the background
    ].filter(Boolean).join("\n");

    await this.callMsfRpc("console.write", [consoleId, commands]);

    // 3. Wait and read output
    await new Promise(resolve => setTimeout(resolve, 15000)); // Wait for exploit to run
    const outputRes = await this.callMsfRpc("console.read", [consoleId]);

    // 4. Destroy the console
    await this.callMsfRpc("console.destroy", [consoleId]);

    return { 
      module: args.module, 
      target: args.rhosts, 
      output: outputRes.data 
    };
  }

  private async callMsfRpc(method: string, params: any[] = []): Promise<any> {
    const response = await axios.post(this.rpcUrl, {
      jsonrpc: "1.0",
      id: 1,
      method,
      params: [this.authToken, ...params],
    });
    if (response.data.error) {
      throw new Error(`Metasploit RPC Error: ${response.data.error.message}`);
    }
    return response.data.result;
  }
}
