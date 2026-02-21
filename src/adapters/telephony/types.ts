// src/adapters/telephony/types.ts
// Shared types for the telephony adapter layer.
// Provider-agnostic interfaces that allow swapping between
// Telnyx, Twilio, Bandwidth, etc.

export type TelephonyProvider = "telnyx" | "twilio" | "bandwidth" | "vonage" | "plivo";

export interface TelephonyConfig {
  provider: TelephonyProvider;
  apiKey: string;
  apiSecret?: string;
  fromNumber: string;
  webhookBaseUrl: string;
  /** Ed25519 signing key for receipt generation (hex-encoded) */
  signingKeyHex?: string;
}

export interface SmsMessage {
  to: string;
  from?: string;
  text: string;
  mediaUrls?: string[];
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IncomingSms {
  from: string;
  to: string;
  text: string;
  messageId: string;
  timestamp: string;
  mediaUrls?: string[];
  rawPayload?: any;
}

export interface CallRequest {
  to: string;
  from?: string;
  /** Text to speak when the call is answered */
  message?: string;
  /** URL to a TeXML/TwiML document for call control */
  callControlUrl?: string;
  /** Whether to record the call */
  record?: boolean;
  /** Timeout in seconds before the call is considered unanswered */
  timeout?: number;
}

export interface CallResult {
  success: boolean;
  callId?: string;
  callControlId?: string;
  error?: string;
}

export interface IncomingCall {
  from: string;
  to: string;
  callId: string;
  callControlId: string;
  direction: "inbound" | "outbound";
  timestamp: string;
  rawPayload?: any;
}

export interface CallRecording {
  callId: string;
  recordingUrl: string;
  duration: number;
  format: string;
  timestamp: string;
}

export interface IvrOption {
  digit: string;
  label: string;
  action: string;
  params?: Record<string, any>;
}

export interface IvrMenu {
  greeting: string;
  options: IvrOption[];
  timeoutMessage?: string;
  invalidInputMessage?: string;
}

/**
 * GovernedAdapter interface — all telephony adapters must implement this.
 * Every action generates a signed receipt before execution.
 */
export interface GovernedTelephonyAdapter {
  readonly provider: TelephonyProvider;

  /** Send an SMS message */
  sendSms(message: SmsMessage): Promise<SmsResult>;

  /** Make an outbound voice call */
  makeCall(request: CallRequest): Promise<CallResult>;

  /** Generate TeXML/TwiML for an IVR menu */
  generateIvrXml(menu: IvrMenu): string;

  /** Handle an incoming SMS webhook */
  parseIncomingSms(headers: Record<string, string>, body: any): IncomingSms | null;

  /** Handle an incoming call webhook */
  parseIncomingCall(headers: Record<string, string>, body: any): IncomingCall | null;
}
