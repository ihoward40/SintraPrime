/**
 * SintraPrime Two-Factor Authentication Router
 * Implements TOTP-based 2FA using time-based one-time passwords.
 * Compatible with Google Authenticator, Authy, and any TOTP app.
 */
import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { userTotp } from "../drizzle/schema-comprehensive-features";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Simple TOTP implementation using standard algorithm
function generateSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  for (let i = 0; i < 32; i++) {
    secret += chars[Math.floor(Math.random() * chars.length)];
  }
  return secret;
}

function base32ToBuffer(base32: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of base32.toUpperCase().replace(/=+$/, "")) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

async function generateTOTP(secret: string, window = 0): Promise<string> {
  const time = Math.floor(Date.now() / 1000 / 30) + window;
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(time), 0);
  const { createHmac } = await import("crypto");
  const keyBuffer = base32ToBuffer(secret);
  const hmac = createHmac("sha1", keyBuffer);
  hmac.update(timeBuffer);
  const digest = hmac.digest();
  const offset = digest[digest.length - 1] & 0xf;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

async function verifyTOTP(secret: string, token: string): Promise<boolean> {
  for (const w of [-1, 0, 1]) {
    const expected = await generateTOTP(secret, w);
    if (expected === token) return true;
  }
  return false;
}

function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

export const twoFactorRouter = router({
  /** Get current 2FA status for the user */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const [record] = await db
      .select()
      .from(userTotp)
      .where(eq(userTotp.userId, ctx.user.id))
      .limit(1);
    return {
      enabled: record?.enabled ?? false,
      hasSetup: !!record,
    };
  }),

  /** Generate a new TOTP secret and QR code URI for setup */
  setupInit: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    const secret = generateSecret();
    const appName = "SintraPrime";
    const userEmail = ctx.user.email ?? ctx.user.name ?? `user-${ctx.user.id}`;
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${encodeURIComponent(appName)}&algorithm=SHA1&digits=6&period=30`;

    // Save secret (not yet enabled)
    await db
      .insert(userTotp)
      .values({ userId: ctx.user.id, secret, enabled: false })
      .onDuplicateKeyUpdate({ set: { secret, enabled: false } });

    return { secret, otpauthUrl };
  }),

  /** Verify the TOTP token and enable 2FA */
  setupVerify: protectedProcedure
    .input(z.object({ token: z.string().length(6) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [record] = await db
        .select()
        .from(userTotp)
        .where(eq(userTotp.userId, ctx.user.id))
        .limit(1);

      if (!record) {
        throw new TRPCError({ code: "NOT_FOUND", message: "2FA setup not initiated. Call setupInit first." });
      }

      const valid = await verifyTOTP(record.secret, input.token);
      if (!valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid verification code. Please try again." });
      }

      const backupCodes = generateBackupCodes();
      await db
        .update(userTotp)
        .set({ enabled: true, backupCodes: JSON.stringify(backupCodes) })
        .where(eq(userTotp.userId, ctx.user.id));

      return { success: true, backupCodes };
    }),

  /** Verify a TOTP token (used during login or sensitive actions) */
  verify: protectedProcedure
    .input(z.object({ token: z.string().min(6).max(8) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [record] = await db
        .select()
        .from(userTotp)
        .where(eq(userTotp.userId, ctx.user.id))
        .limit(1);

      if (!record || !record.enabled) {
        return { valid: true, message: "2FA not enabled" };
      }

      // Check TOTP
      const totpValid = await verifyTOTP(record.secret, input.token);
      if (totpValid) return { valid: true };

      // Check backup codes
      const backupCodes: string[] = record.backupCodes ? JSON.parse(record.backupCodes) : [];
      const backupIdx = backupCodes.indexOf(input.token.toUpperCase());
      if (backupIdx !== -1) {
        backupCodes.splice(backupIdx, 1);
        await db
          .update(userTotp)
          .set({ backupCodes: JSON.stringify(backupCodes) })
          .where(eq(userTotp.userId, ctx.user.id));
        return { valid: true, usedBackupCode: true, remainingBackupCodes: backupCodes.length };
      }

      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid 2FA code." });
    }),

  /** Disable 2FA (requires valid token) */
  disable: protectedProcedure
    .input(z.object({ token: z.string().length(6) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [record] = await db
        .select()
        .from(userTotp)
        .where(eq(userTotp.userId, ctx.user.id))
        .limit(1);

      if (!record || !record.enabled) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "2FA is not enabled." });
      }

      const valid = await verifyTOTP(record.secret, input.token);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid verification code." });
      }

      await db
        .update(userTotp)
        .set({ enabled: false })
        .where(eq(userTotp.userId, ctx.user.id));

      return { success: true };
    }),

  /** Regenerate backup codes */
  regenerateBackupCodes: protectedProcedure
    .input(z.object({ token: z.string().length(6) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [record] = await db
        .select()
        .from(userTotp)
        .where(eq(userTotp.userId, ctx.user.id))
        .limit(1);

      if (!record || !record.enabled) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "2FA is not enabled." });
      }

      const valid = await verifyTOTP(record.secret, input.token);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid verification code." });
      }

      const backupCodes = generateBackupCodes();
      await db
        .update(userTotp)
        .set({ backupCodes: JSON.stringify(backupCodes) })
        .where(eq(userTotp.userId, ctx.user.id));

      return { backupCodes };
    }),
});
