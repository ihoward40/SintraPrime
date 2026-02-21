// src/adapters/telephony/voiceAdapter.ts
// Governed voice/call adapter for SintraPrime.
// Handles outbound calls, incoming call webhooks, IVR menus,
// call recording, and real-time transcription streaming.
// Supports Telnyx (TeXML) and Twilio (TwiML) as providers.

import * as crypto from "crypto";
import type {
  GovernedTelephonyAdapter,
  TelephonyConfig,
  TelephonyProvider,
  SmsMessage,
  SmsResult,
  IncomingSms,
  CallRequest,
  CallResult,
  IncomingCall,
  IvrMenu,
  IvrOption,
} from "./types.js";

export interface VoiceAdapterDeps {
  /** Function to record a receipt in the immutable ledger */
  recordReceipt: (receipt: any) => Promise<void>;
  /** Function to check policy gates */
  checkPolicy: (action: string, params: any) => Promise<{ allowed: boolean; reason?: string }>;
}

export class VoiceAdapter implements GovernedTelephonyAdapter {
  readonly provider: TelephonyProvider;
  private config: TelephonyConfig;
  private deps: VoiceAdapterDeps;

  constructor(config: TelephonyConfig, deps: VoiceAdapterDeps) {
    this.provider = config.provider;
    this.config = config;
    this.deps = deps;
  }

  /**
   * Make an outbound voice call with governance (receipt + policy check).
   */
  async makeCall(request: CallRequest): Promise<CallResult> {
    const from = request.from || this.config.fromNumber;

    // 1. Generate receipt
    const receipt = {
      adapter: "VoiceAdapter",
      action: "makeCall",
      timestamp: new Date().toISOString(),
      params: { to: request.to, from, record: request.record },
      hash: crypto
        .createHash("sha256")
        .update(JSON.stringify({ to: request.to, from }))
        .digest("hex"),
    };

    await this.deps.recordReceipt(receipt);

    // 2. Check policy gates
    const policyResult = await this.deps.checkPolicy("voice.call", {
      to: request.to,
      from,
    });

    if (!policyResult.allowed) {
      return {
        success: false,
        error: `Policy violation: ${policyResult.reason}`,
      };
    }

    // 3. Execute via provider
    try {
      switch (this.provider) {
        case "telnyx":
          return await this.callViaTelnyx(request, from);
        case "twilio":
          return await this.callViaTwilio(request, from);
        default:
          return { success: false, error: `Unsupported provider: ${this.provider}` };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Make a call via Telnyx Call Control API.
   */
  private async callViaTelnyx(request: CallRequest, from: string): Promise<CallResult> {
    const callControlUrl = request.callControlUrl ||
      `${this.config.webhookBaseUrl}/telephony/voice/telnyx/answer`;

    const response = await fetch("https://api.telnyx.com/v2/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: request.to,
        from,
        connection_id: process.env.TELNYX_CONNECTION_ID || "",
        webhook_url: callControlUrl,
        timeout_secs: request.timeout || 30,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { success: false, error: `Telnyx error: ${response.status} ${errorBody}` };
    }

    const data: any = await response.json();
    return {
      success: true,
      callId: data.data?.call_session_id,
      callControlId: data.data?.call_control_id,
    };
  }

  /**
   * Make a call via Twilio REST API.
   */
  private async callViaTwilio(request: CallRequest, from: string): Promise<CallResult> {
    const accountSid = this.config.apiKey;
    const authToken = this.config.apiSecret || "";

    const twimlUrl = request.callControlUrl ||
      `${this.config.webhookBaseUrl}/telephony/voice/twilio/answer`;

    const params = new URLSearchParams();
    params.append("From", from);
    params.append("To", request.to);
    params.append("Url", twimlUrl);
    if (request.record) {
      params.append("Record", "true");
    }
    if (request.timeout) {
      params.append("Timeout", String(request.timeout));
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      return { success: false, error: `Twilio error: ${response.status} ${errorBody}` };
    }

    const data: any = await response.json();
    return { success: true, callId: data.sid };
  }

  /**
   * Generate TeXML/TwiML for an IVR menu.
   */
  generateIvrXml(menu: IvrMenu): string {
    if (this.provider === "telnyx" || this.provider === "twilio") {
      // TeXML and TwiML share the same XML structure for basic IVR
      const optionsText = menu.options
        .map((opt) => `Press ${opt.digit} for ${opt.label}.`)
        .join(" ");

      const gatherAction = `${this.config.webhookBaseUrl}/telephony/voice/ivr-selection`;

      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${gatherAction}" method="POST" numDigits="1" timeout="10">
    <Say>${menu.greeting} ${optionsText}</Say>
  </Gather>
  <Say>${menu.timeoutMessage || "We didn't receive any input. Goodbye!"}</Say>
</Response>`;
    }

    return "";
  }

  /**
   * Handle IVR digit selection and return appropriate TeXML/TwiML.
   */
  handleIvrSelection(digits: string, menu: IvrMenu): string {
    const option = menu.options.find((o) => o.digit === digits);

    if (option) {
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>You selected: ${option.label}. Processing your request.</Say>
</Response>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${menu.invalidInputMessage || "Invalid selection. Goodbye."}</Say>
</Response>`;
  }

  /**
   * Parse an incoming call webhook payload.
   */
  parseIncomingCall(
    headers: Record<string, string>,
    body: any
  ): IncomingCall | null {
    switch (this.provider) {
      case "telnyx":
        return this.parseTelnyxCall(body);
      case "twilio":
        return this.parseTwilioCall(body);
      default:
        return null;
    }
  }

  private parseTelnyxCall(body: any): IncomingCall | null {
    const event = body.data;
    if (!event) return null;

    const payload = event.payload;
    return {
      from: payload.from || "",
      to: payload.to || "",
      callId: payload.call_session_id || "",
      callControlId: payload.call_control_id || "",
      direction: payload.direction || "inbound",
      timestamp: payload.occurred_at || new Date().toISOString(),
      rawPayload: body,
    };
  }

  private parseTwilioCall(body: any): IncomingCall | null {
    if (!body.CallSid) return null;

    return {
      from: body.From || "",
      to: body.To || "",
      callId: body.CallSid,
      callControlId: body.CallSid,
      direction: body.Direction === "outbound-api" ? "outbound" : "inbound",
      timestamp: new Date().toISOString(),
      rawPayload: body,
    };
  }

  /**
   * Generate XML to start call recording.
   */
  generateRecordingXml(): string {
    const recordingCallback = `${this.config.webhookBaseUrl}/telephony/voice/recording-complete`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Record action="${recordingCallback}" method="POST" maxLength="3600" />
</Response>`;
  }

  /**
   * Generate XML to stream audio to a WebSocket for real-time transcription.
   */
  generateTranscriptionStreamXml(transcriptionWsUrl: string): string {
    if (this.provider === "twilio") {
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="${transcriptionWsUrl}" />
  </Start>
  <Say>This call is being transcribed for quality assurance.</Say>
  <Pause length="3600" />
</Response>`;
    }

    // Telnyx uses Call Control API for streaming, not TeXML
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>This call is being transcribed for quality assurance.</Say>
  <Pause length="3600" />
</Response>`;
  }

  // SMS methods are stubs — SmsAdapter handles these
  async sendSms(_message: SmsMessage): Promise<SmsResult> {
    return { success: false, error: "Use SmsAdapter for SMS operations" };
  }

  parseIncomingSms(
    _headers: Record<string, string>,
    _body: any
  ): IncomingSms | null {
    return null;
  }
}
