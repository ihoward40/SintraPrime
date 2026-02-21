// src/adapters/telephony/index.ts
// Barrel export for the telephony adapter layer.

export type {
  TelephonyProvider,
  TelephonyConfig,
  SmsMessage,
  SmsResult,
  IncomingSms,
  CallRequest,
  CallResult,
  IncomingCall,
  CallRecording,
  IvrOption,
  IvrMenu,
  GovernedTelephonyAdapter,
} from "./types.js";

export { SmsAdapter } from "./smsAdapter.js";
export type { SmsAdapterDeps } from "./smsAdapter.js";

export { VoiceAdapter } from "./voiceAdapter.js";
export type { VoiceAdapterDeps } from "./voiceAdapter.js";

export { TranscriptionAdapter } from "./transcriptionAdapter.js";
export type {
  TranscriptionConfig,
  TranscriptionResult,
  CallSummary,
  TranscriptionCallback,
} from "./transcriptionAdapter.js";
