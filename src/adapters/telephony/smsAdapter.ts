// src/adapters/telephony/smsAdapter.ts
// Governed SMS adapter for SintraPrime.
// Implements the GovernedAdapter pattern: every SMS operation generates
// a signed receipt before execution and is subject to PolicyGate checks.
// Supports Telnyx (recommended) and Twilio as providers.

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
} from "./types.js";

export interface SmsAdapterDeps {
  /** Function to record a receipt in the immutable ledger */
  recordReceipt: (receipt: any) => Promise<void>;
  /** Function to check policy gates */
  checkPolicy: (action: string, params: any) => Promise<{ allowed: boolean; reason?: string }>;
}

export class SmsAdapter implements GovernedTelephonyAdapter {
  readonly provider: TelephonyProvider;
  private config: TelephonyConfig;
  private deps: SmsAdapterDeps;

  constructor(config: TelephonyConfig, deps: SmsAdapterDeps) {
    this.provider = config.provider;
    this.config = config;
    this.deps = deps;
  }

  /**
   * Send an SMS message with governance (receipt + policy check).
   */
  async sendSms(message: SmsMessage): Promise<SmsResult> {
    const from = message.from || this.config.fromNumber;

    // 1. Generate receipt
    const receipt = {
      adapter: "SmsAdapter",
      action: "sendSms",
      timestamp: new Date().toISOString(),
      params: { to: message.to, from, textLength: message.text.length },
      hash: crypto
        .createHash("sha256")
        .update(JSON.stringify({ to: message.to, from, text: message.text }))
        .digest("hex"),
    };

    await this.deps.recordReceipt(receipt);

    // 2. Check policy gates
    const policyResult = await this.deps.checkPolicy("sms.send", {
      to: message.to,
      from,
      textLength: message.text.length,
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
          return await this.sendViaTelnyx(message, from);
        case "twilio":
          return await this.sendViaTwilio(message, from);
        default:
          return await this.sendViaGenericApi(message, from);
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SMS via Telnyx API.
   */
  private async sendViaTelnyx(message: SmsMessage, from: string): Promise<SmsResult> {
    const response = await fetch("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: message.to,
        text: message.text,
        media_urls: message.mediaUrls,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { success: false, error: `Telnyx error: ${response.status} ${errorBody}` };
    }

    const data: any = await response.json();
    return { success: true, messageId: data.data?.id };
  }

  /**
   * Send SMS via Twilio API.
   */
  private async sendViaTwilio(message: SmsMessage, from: string): Promise<SmsResult> {
    const accountSid = this.config.apiKey;
    const authToken = this.config.apiSecret || "";

    const params = new URLSearchParams();
    params.append("From", from);
    params.append("To", message.to);
    params.append("Body", message.text);
    if (message.mediaUrls) {
      message.mediaUrls.forEach((url) => params.append("MediaUrl", url));
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
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
    return { success: true, messageId: data.sid };
  }

  /**
   * Generic API fallback for other providers.
   */
  private async sendViaGenericApi(message: SmsMessage, from: string): Promise<SmsResult> {
    // Placeholder for other providers (Bandwidth, Vonage, Plivo)
    console.log(`[SmsAdapter] Would send SMS via ${this.provider}: ${from} -> ${message.to}`);
    return { success: true, messageId: `mock-${Date.now()}` };
  }

  /**
   * Parse an incoming SMS webhook payload.
   */
  parseIncomingSms(
    headers: Record<string, string>,
    body: any
  ): IncomingSms | null {
    switch (this.provider) {
      case "telnyx":
        return this.parseTelnyxSms(body);
      case "twilio":
        return this.parseTwilioSms(body);
      default:
        return null;
    }
  }

  private parseTelnyxSms(body: any): IncomingSms | null {
    const event = body.data;
    if (!event || event.event_type !== "message.received") return null;

    const payload = event.payload;
    return {
      from: payload.from?.phone_number || "",
      to: payload.to?.[0]?.phone_number || "",
      text: payload.text || "",
      messageId: payload.id || "",
      timestamp: payload.received_at || new Date().toISOString(),
      mediaUrls: payload.media?.map((m: any) => m.url),
      rawPayload: body,
    };
  }

  private parseTwilioSms(body: any): IncomingSms | null {
    if (!body.From || !body.Body) return null;

    return {
      from: body.From,
      to: body.To || "",
      text: body.Body,
      messageId: body.MessageSid || "",
      timestamp: new Date().toISOString(),
      mediaUrls: body.NumMedia > 0
        ? Array.from({ length: parseInt(body.NumMedia) }, (_, i) => body[`MediaUrl${i}`])
        : undefined,
      rawPayload: body,
    };
  }

  // Voice methods are stubs — VoiceAdapter handles these
  async makeCall(_request: CallRequest): Promise<CallResult> {
    return { success: false, error: "Use VoiceAdapter for call operations" };
  }

  generateIvrXml(_menu: IvrMenu): string {
    return "";
  }

  parseIncomingCall(
    _headers: Record<string, string>,
    _body: any
  ): IncomingCall | null {
    return null;
  }
}
