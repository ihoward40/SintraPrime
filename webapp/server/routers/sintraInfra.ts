import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { resolveSintraHubUrls } from "../lib/sintraHubUrls";
import { probeSintraInfraHealth } from "../lib/sintraInfraHealth";

async function postJsonWithTimeout(url: string, body: unknown, timeoutMs: number): Promise<{ ok: boolean; status?: number; data?: any; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let data: any = undefined;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      data = text;
    }
    return { ok: res.ok, status: res.status, data };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  } finally {
    clearTimeout(timeout);
  }
}

export const sintraInfraRouter = router({
  /**
   * Health check across the local SintraPrime infra services.
   * Uses hub registry env vars (SINTRA_HUB_URL + overrides) when present.
   */
  health: publicProcedure.query(async () => {
    return probeSintraInfraHealth(2500);
  }),

  /**
   * Create a task via the existing FastAPI webhook endpoint.
   * Maps directly onto backend/python/app/main.py `/tasks/from-webhook`.
   */
  createTaskFromWebhook: protectedProcedure
    .input(
      z.object({
        case_id: z.string().min(1),
        task_type: z.string().min(1),
        title: z.string().optional(),
        description: z.string().optional(),
        payload: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { apiUrl } = resolveSintraHubUrls();
      if (!apiUrl) {
        return {
          ok: false as const,
          error: "api_url_not_configured",
        };
      }

      const url = `${apiUrl}/tasks/from-webhook`;
      const res = await postJsonWithTimeout(
        url,
        {
          case_id: input.case_id,
          task_type: input.task_type,
          title: input.title,
          description: input.description,
          payload: input.payload ?? {},
        },
        8000
      );

      return {
        ok: res.ok as boolean,
        status: res.status,
        data: res.data,
        error: res.ok ? undefined : res.error,
      };
    }),
});
