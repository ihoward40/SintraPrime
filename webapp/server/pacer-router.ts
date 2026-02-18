import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { PACERService } from "./lib/pacer-integration";
import { PACERDatabaseService } from "./lib/pacer-database-service";

const pacerService = new PACERService();
const pacerDbService = new PACERDatabaseService();

export const pacerRouter = router({
  saveCredentials: protectedProcedure
    .input(
      z.object({
        username: z.string().min(1, "Username is required"),
        password: z.string().min(1, "Password is required"),
        clientCode: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await pacerDbService.saveCredentials(
        ctx.user.id,
        input.username,
        input.password,
        input.clientCode
      );
      return { success: true };
    }),

  testConnection: protectedProcedure
    .input(
      z.object({
        username: z.string(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Set temporary credentials for testing
        pacerService.setCredentials({ username: input.username, password: input.password });
        const result = await pacerService.login();
        return { success: result, message: result ? "Connection successful" : "Connection failed" };
      } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
      }
    }),

  getCredentials: protectedProcedure.query(async ({ ctx }) => {
    const credentials = await pacerDbService.getCredentials(ctx.user.id);
    if (!credentials) {
      return null;
    }
    // Don't return the actual password to the frontend
    return {
      username: credentials.username,
      clientCode: credentials.clientCode,
      hasPassword: true,
    };
  }),

  deleteCredentials: protectedProcedure.mutation(async ({ ctx }) => {
    await pacerDbService.deleteCredentials(ctx.user.id);
    return { success: true };
  }),

  searchCases: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        court: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const credentials = await pacerDbService.getCredentials(ctx.user.id);
      if (!credentials) {
        throw new Error("PACER credentials not configured");
      }
      
      // Set credentials and login
      pacerService.setCredentials({ username: credentials.username, password: credentials.password });
      await pacerService.login();
      
      // Search cases
      const results = await pacerService.searchCases({
        caseNumber: input.query,
        courtId: input.court,
      });
      
      // Update last verified timestamp
      await pacerDbService.updateLastVerified(ctx.user.id);
      
      return results;
    }),

  getDocket: protectedProcedure
    .input(
      z.object({
        caseNumber: z.string(),
        court: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const credentials = await pacerDbService.getCredentials(ctx.user.id);
      if (!credentials) {
        throw new Error("PACER credentials not configured");
      }
      
      // Set credentials and login
      pacerService.setCredentials({ username: credentials.username, password: credentials.password });
      await pacerService.login();
      
      // Get docket
      const docket = await pacerService.getDocket(input.caseNumber, input.court);
      
      return docket;
    }),

  downloadDocument: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        caseNumber: z.string(),
        court: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const credentials = await pacerDbService.getCredentials(ctx.user.id);
      if (!credentials) {
        throw new Error("PACER credentials not configured");
      }
      
      // Set credentials and login
      pacerService.setCredentials({ username: credentials.username, password: credentials.password });
      await pacerService.login();
      
      // Download document
      const document = await pacerService.downloadDocument(
        input.documentId,
        input.caseNumber,
        input.court
      );
      
      return document;
    }),
});
