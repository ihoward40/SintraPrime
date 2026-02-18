import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import type { Context } from './_core/context';
import * as chatHelpers from './db/chat-conversation-helpers';

// Mock authenticated user context
const mockUserContext: Context = {
  user: {
    id: 1,
    openId: 'test-user-openid',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    createdAt: new Date(),
  },
};

// Mock unauthenticated context
const mockGuestContext: Context = {
  user: null,
};

describe('Sprint 18: AI Assistant Advanced Features', () => {
  let testConversationId: number;
  let testMessageId: number;

  // Increase timeout for LLM calls
  const LLM_TIMEOUT = 30000;

  beforeAll(async () => {
    // Clean up any existing test data
    const existingConversations = await chatHelpers.getUserConversations(1);
    for (const conv of existingConversations) {
      await chatHelpers.deleteConversation(conv.id);
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (testConversationId) {
      await chatHelpers.deleteConversation(testConversationId);
    }
  });

  describe('Conversation History Persistence', () => {
    it('should create a new conversation', async () => {
      const caller = appRouter.createCaller(mockUserContext);
      
      const result = await caller.aiChat.createConversation({
        title: 'Test Legal Consultation',
      });

      const conversation = await chatHelpers.getConversation(result.conversationId);

      expect(conversation).toBeDefined();
      expect(conversation.id).toBeGreaterThan(0);
      expect(conversation.title).toBe('Test Legal Consultation');
      expect(conversation.userId).toBe(1);
      
      testConversationId = conversation.id;
    });

    it('should add a message to conversation', async () => {
      const caller = appRouter.createCaller(mockUserContext);
      
      const messageId = await chatHelpers.addMessage({
        conversationId: testConversationId,
        role: 'user',
        content: 'What are my rights under FDCPA?',
        attachments: null,
      });

      const message = (await chatHelpers.getConversationMessages(testConversationId)).find(m => m.id === messageId);

      expect(message).toBeDefined();
      expect(message.id).toBeGreaterThan(0);
      expect(message.conversationId).toBe(testConversationId);
      expect(message.role).toBe('user');
      expect(message.content).toBe('What are my rights under FDCPA?');
      
      testMessageId = message.id;
    });

    it('should retrieve conversation messages', async () => {
      const caller = appRouter.createCaller(mockUserContext);
      
      const messages = await caller.aiChat.getConversationMessages({
        conversationId: testConversationId,
      });

      expect(messages).toBeDefined();
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].content).toBe('What are my rights under FDCPA?');
    });

    it('should list user conversations', async () => {
      const caller = appRouter.createCaller(mockUserContext);
      
      const conversations = await caller.aiChat.getConversations({});

      expect(conversations).toBeDefined();
      expect(conversations.length).toBeGreaterThan(0);
      expect(conversations.some(c => c.id === testConversationId)).toBe(true);
    });

    it('should update conversation title', async () => {
      const caller = appRouter.createCaller(mockUserContext);
      
      await caller.aiChat.updateConversationTitle({
        conversationId: testConversationId,
        title: 'FDCPA Rights Discussion',
      });

      const updated = await chatHelpers.getConversation(testConversationId);

      expect(updated).toBeDefined();
      expect(updated.title).toBe('FDCPA Rights Discussion');
    });

    it('should delete a conversation', async () => {
      const caller = appRouter.createCaller(mockUserContext);
      
      // Create a temporary conversation to delete
      const result = await caller.aiChat.createConversation({
        title: 'Temp Conversation',
      });
      const tempConv = { id: result.conversationId };

      await caller.aiChat.deleteConversation({
        conversationId: tempConv.id,
      });

      const conversations = await caller.aiChat.getConversations({});
      expect(conversations.some(c => c.id === tempConv.id)).toBe(false);
    });

    it('should prevent unauthorized access to conversations', async () => {
      const caller = appRouter.createCaller(mockGuestContext);
      
      await expect(
        caller.aiChat.getConversations({})
      ).rejects.toThrow();
    });
  });

  describe('Suggested Prompts', () => {
    it('should return suggested prompts for analysis category', async () => {
      const caller = appRouter.createCaller(mockUserContext);
      
      const prompts = await caller.aiChat.getSuggestedPrompts({
        category: 'analysis',
      });

      expect(prompts).toBeDefined();
      expect(prompts.length).toBeGreaterThan(0);
      expect(prompts.some(p => p.category === 'analysis')).toBe(true);
    });

    it('should return suggested prompts for drafting category', async () => {
      const caller = appRouter.createCaller(mockUserContext);
      
      const prompts = await caller.aiChat.getSuggestedPrompts({
        category: 'drafting',
      });

      expect(prompts).toBeDefined();
      expect(prompts.length).toBeGreaterThan(0);
      expect(prompts.some(p => p.category === 'drafting')).toBe(true);
    });

    it('should return suggested prompts for research category', async () => {
      const caller = appRouter.createCaller(mockUserContext);
      
      const prompts = await caller.aiChat.getSuggestedPrompts({
        category: 'research',
      });

      expect(prompts).toBeDefined();
      expect(prompts.length).toBeGreaterThan(0);
      expect(prompts.some(p => p.category === 'research')).toBe(true);
    });

    it('should return suggested prompts for strategy category', async () => {
      const caller = appRouter.createCaller(mockUserContext);
      
      const prompts = await caller.aiChat.getSuggestedPrompts({
        category: 'strategy',
      });

      expect(prompts).toBeDefined();
      expect(prompts.length).toBeGreaterThan(0);
      expect(prompts.some(p => p.category === 'strategy')).toBe(true);
    });

    it('should return all suggested prompts when no category specified', async () => {
      const caller = appRouter.createCaller(mockUserContext);
      
      const prompts = await caller.aiChat.getSuggestedPrompts({
        category: null,
      });

      expect(prompts).toBeDefined();
      expect(prompts.length).toBe(12); // Total of 12 prompts across 4 categories
    });
  });

  describe('Document Comparison', () => {
    it('should compare two documents and identify differences', { timeout: LLM_TIMEOUT }, async () => {
      const caller = appRouter.createCaller(mockUserContext);
      
      const result = await caller.documentComparison.compareDocuments({
        documents: [
          {
            fileName: 'Contract v1.pdf',
            fileType: 'application/pdf',
            extractedText: 'This agreement is made on January 1, 2025. The payment terms are net 30 days. The termination clause allows either party to terminate with 30 days notice.',
          },
          {
            fileName: 'Contract v2.pdf',
            fileType: 'application/pdf',
            extractedText: 'This agreement is made on January 15, 2025. The payment terms are net 45 days. The termination clause allows either party to terminate with 60 days notice.',
          },
        ],
        comparisonType: 'contracts',
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.documentCount).toBe(2);
      expect(typeof result.analysis).toBe('string');
      expect(result.analysis.length).toBeGreaterThan(0);
    });

    it('should handle single document analysis', { timeout: LLM_TIMEOUT }, async () => {
      const caller = appRouter.createCaller(mockUserContext);
      
      const result = await caller.documentComparison.compareDocuments({
        documents: [
          {
            fileName: 'Single Contract.pdf',
            fileType: 'application/pdf',
            extractedText: 'This is a standard employment agreement with confidentiality clauses.',
          },
          {
            fileName: 'Placeholder.pdf',
            fileType: 'application/pdf',
            extractedText: 'Placeholder document for comparison.',
          },
        ],
        comparisonType: 'general',
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.documentCount).toBe(2);
    });

    it('should compare multiple documents (3+)', { timeout: LLM_TIMEOUT }, async () => {
      const caller = appRouter.createCaller(mockUserContext);
      
      const result = await caller.documentComparison.compareDocuments({
        documents: [
          {
            fileName: 'Version 1.pdf',
            fileType: 'application/pdf',
            extractedText: 'Payment: $1000. Term: 1 year.',
          },
          {
            fileName: 'Version 2.pdf',
            fileType: 'application/pdf',
            extractedText: 'Payment: $1200. Term: 1 year.',
          },
          {
            fileName: 'Version 3.pdf',
            fileType: 'application/pdf',
            extractedText: 'Payment: $1200. Term: 2 years.',
          },
        ],
        comparisonType: 'contracts',
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.documentCount).toBe(3);
    });

    it('should require authentication for document comparison', async () => {
      const caller = appRouter.createCaller(mockGuestContext);
      
      await expect(
        caller.documentComparison.compareDocuments({
          documents: [
            { fileName: 'test.pdf', fileType: 'application/pdf', extractedText: 'test content' },
          ],
          comparisonType: 'general',
        })
      ).rejects.toThrow();
    });

    it('should reject insufficient documents', async () => {
      const caller = appRouter.createCaller(mockUserContext);
      
      await expect(
        caller.documentComparison.compareDocuments({
          documents: [
            { fileName: 'single.pdf', fileType: 'application/pdf', extractedText: 'only one document' },
          ],
          comparisonType: 'general',
        })
      ).rejects.toThrow('At least 2 documents are required');
    });
  });
});
